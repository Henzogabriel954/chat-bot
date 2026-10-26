package main

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Instance  string `json:"instance"`
	Message   string `json:"message"`
}

type BotRuntime struct {
	mu             sync.Mutex
	Active         bool
	AnyPerson      bool
	TargetVariants []string
	SysPrompt      string
	OwnerNumber    string
	IsSelf         bool
	Seen           map[string]bool
	Sent           map[string]bool
	SentTexts      map[string]bool
	Hist           map[string][]ChatMessage
}

type QueueItem struct {
	ID        string
	Instance  string
	Record    MessageRecord
	Timestamp int64
	Contact   string
}

type BotEngine struct {
	mu          sync.RWMutex
	configStore *ConfigStore
	evoClient   *EvolutionClient
	aiService   *AIService

	runtimes  map[string]*BotRuntime
	owners    map[string]string
	queue     []QueueItem
	queueMu   sync.Mutex
	wakeQueue chan struct{}

	logs       []LogEntry
	logsMu     sync.RWMutex
	subscribers map[chan LogEntry]bool
	subMu      sync.Mutex

	stopChan chan struct{}
}

func NewBotEngine(cfg *ConfigStore, evo *EvolutionClient, ai *AIService) *BotEngine {
	engine := &BotEngine{
		configStore: cfg,
		evoClient:   evo,
		aiService:   ai,
		runtimes:    make(map[string]*BotRuntime),
		owners:      make(map[string]string),
		queue:       make([]QueueItem, 0),
		wakeQueue:   make(chan struct{}, 100),
		logs:        make([]LogEntry, 0, 200),
		subscribers: make(map[chan LogEntry]bool),
		stopChan:    make(chan struct{}),
	}

	go engine.workerLoop()
	go engine.pollingLoop()

	return engine
}

func (e *BotEngine) AddLog(instance, message string) {
	entry := LogEntry{
		Timestamp: timeStr(),
		Instance:  instance,
		Message:   message,
	}

	e.logsMu.Lock()
	if len(e.logs) >= 200 {
		e.logs = append(e.logs[1:], entry)
	} else {
		e.logs = append(e.logs, entry)
	}
	e.logsMu.Unlock()

	e.subMu.Lock()
	for ch := range e.subscribers {
		select {
		case ch <- entry:
		default:
		}
	}
	e.subMu.Unlock()
}

func (e *BotEngine) GetLogs() []LogEntry {
	e.logsMu.RLock()
	defer e.logsMu.RUnlock()
	res := make([]LogEntry, len(e.logs))
	copy(res, e.logs)
	return res
}

func (e *BotEngine) ClearLogs() {
	e.logsMu.Lock()
	e.logs = make([]LogEntry, 0, 200)
	e.logsMu.Unlock()
}

func (e *BotEngine) SubscribeLogs() (chan LogEntry, func()) {
	ch := make(chan LogEntry, 50)
	e.subMu.Lock()
	e.subscribers[ch] = true
	e.subMu.Unlock()

	unsubscribe := func() {
		e.subMu.Lock()
		delete(e.subscribers, ch)
		close(ch)
		e.subMu.Unlock()
	}

	return ch, unsubscribe
}

func (e *BotEngine) UpdateOwners(owners map[string]string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	for k, v := range owners {
		e.owners[k] = v
	}
}

func (e *BotEngine) IsActive(instance string) bool {
	e.mu.RLock()
	defer e.mu.RUnlock()
	rt, ok := e.runtimes[instance]
	return ok && rt.Active
}

func (e *BotEngine) GetActiveInstances() []string {
	e.mu.RLock()
	defer e.mu.RUnlock()
	var list []string
	for k, rt := range e.runtimes {
		if rt.Active {
			list = append(list, k)
		}
	}
	return list
}

func (e *BotEngine) GetQueueLength() int {
	e.queueMu.Lock()
	defer e.queueMu.Unlock()
	return len(e.queue)
}

func (e *BotEngine) EnqueueMessage(instance string, r MessageRecord) {
	e.mu.RLock()
	rt, exists := e.runtimes[instance]
	e.mu.RUnlock()

	if !exists || !rt.Active {
		return
	}

	rt.mu.Lock()
	id := r.Key.ID
	if id == "" || rt.Seen[id] {
		rt.mu.Unlock()
		return
	}
	rt.Seen[id] = true

	jid := r.Key.RemoteJid
	if rt.Sent[id] || strings.HasSuffix(jid, "@g.us") || jid == "status@broadcast" {
		rt.mu.Unlock()
		return
	}

	if r.Key.FromMe && !rt.IsSelf {
		rt.mu.Unlock()
		return
	}

	cfg := e.configStore.Get()
	txt := getMessageText(r)
	isAud := txt == "" && cfg.AudioEnabled && r.Message != nil && r.Message.AudioMessage != nil
	if txt == "" && !isAud {
		rt.mu.Unlock()
		return
	}

	if r.Key.FromMe && rt.IsSelf && txt != "" && rt.SentTexts[txt] {
		rt.mu.Unlock()
		return
	}

	realNumber := ""
	candidates := []string{r.Key.RemoteJidAlt, r.Key.SenderPn, r.SenderPn, jid}
	for _, cand := range candidates {
		if cand != "" && !strings.HasSuffix(cand, "@lid") {
			realNumber = cand
			break
		}
	}

	contact := jid
	if realNumber != "" {
		contact = extractDigits(realNumber)
	}

	// Se não atende qualquer pessoa, verifica filtro
	if !rt.AnyPerson {
		matched := false
		contactDigits := extractDigits(contact)
		for _, v := range rt.TargetVariants {
			if v == contactDigits {
				matched = true
				break
			}
		}
		if !matched {
			rt.mu.Unlock()
			return
		}
	}

	ts := r.MessageTimestamp * 1000
	if ts <= 0 {
		ts = time.Now().UnixMilli()
	}
	rt.mu.Unlock()

	e.queueMu.Lock()
	e.queue = append(e.queue, QueueItem{
		ID:        id,
		Instance:  instance,
		Record:    r,
		Timestamp: ts,
		Contact:   contact,
	})
	// Ordena rigorosamente pelo horário de envio do WhatsApp
	sort.SliceStable(e.queue, func(i, j int) bool {
		return e.queue[i].Timestamp < e.queue[j].Timestamp
	})
	qLen := len(e.queue)
	e.queueMu.Unlock()

	if qLen > 1 {
		e.AddLog("fila", fmt.Sprintf("⏳ [Fila #%d] Mensagem de %s em [%s] aguardando atendimento.", qLen, contact, instance))
	}

	select {
	case e.wakeQueue <- struct{}{}:
	default:
	}
}

// Inicia ou para um bot para determinada instância
func (e *BotEngine) Toggle(instance string) error {
	cfg := e.configStore.Get()
	instCfg := cfg.Instances[instance]

	e.mu.Lock()
	rt, exists := e.runtimes[instance]

	if exists && rt.Active {
		rt.Active = false
		e.mu.Unlock()

		e.queueMu.Lock()
		filtered := make([]QueueItem, 0, len(e.queue))
		for _, item := range e.queue {
			if item.Instance != instance {
				filtered = append(filtered, item)
			}
		}
		e.queue = filtered
		e.queueMu.Unlock()

		_ = e.configStore.Update(func(c *AppConfig) {
			ic := c.Instances[instance]
			ic.Active = false
			c.Instances[instance] = ic
		})

		e.AddLog(instance, "Bot pausado.")
		return nil
	}

	if cfg.OllamaModel == "" {
		e.mu.Unlock()
		return fmt.Errorf("selecione um modelo de IA no Ollama primeiro")
	}

	vs := []string{}
	if !instCfg.AnyPerson {
		if instCfg.TargetNum == "" {
			e.mu.Unlock()
			return fmt.Errorf("digite o número alvo ou marque 'Responder qualquer pessoa'")
		}
		vs = brVariants(instCfg.TargetNum)
	}

	owner := e.owners[instance]
	isSelf := false
	if owner != "" {
		for _, v := range vs {
			if v == owner {
				isSelf = true
				break
			}
		}
	}

	sysPrompt := instCfg.SysPrompt
	if sysPrompt == "" {
		sysPrompt = DefaultSystemPrompt
	}

	newRt := &BotRuntime{
		Active:         false,
		AnyPerson:      instCfg.AnyPerson,
		TargetVariants: vs,
		SysPrompt:      sysPrompt,
		OwnerNumber:    owner,
		IsSelf:         isSelf,
		Seen:           make(map[string]bool),
		Sent:           make(map[string]bool),
		SentTexts:      make(map[string]bool),
		Hist:           make(map[string][]ChatMessage),
	}
	e.runtimes[instance] = newRt
	e.mu.Unlock()

	// Ignora mensagens antigas
	e.AddLog(instance, "Carregando mensagens anteriores para ignorar antigas...")
	oldMsgs, err := e.fetchMessagesForBot(instance, newRt)
	if err == nil {
		newRt.mu.Lock()
		for _, m := range oldMsgs {
			if m.Key.ID != "" {
				newRt.Seen[m.Key.ID] = true
			}
		}
		newRt.mu.Unlock()
	}

	newRt.Active = true

	_ = e.configStore.Update(func(c *AppConfig) {
		ic := c.Instances[instance]
		ic.Active = true
		c.Instances[instance] = ic
	})

	scope := "atende qualquer pessoa"
	if len(vs) > 0 {
		scope = "atende " + vs[0]
		if isSelf {
			scope += " (conversa consigo mesmo)"
		}
	}

	e.AddLog(instance, fmt.Sprintf("Bot ativo: %s | IA: %s | %d antigas ignoradas.", scope, cfg.OllamaModel, len(newRt.Seen)))
	return nil
}

func (e *BotEngine) fetchMessagesForBot(instance string, rt *BotRuntime) ([]MessageRecord, error) {
	cfg := e.configStore.Get()
	if cfg.EvolutionURL == "" || cfg.EvolutionAPIKey == "" {
		return nil, fmt.Errorf("Evolution API não configurada")
	}

	if rt.AnyPerson || len(rt.TargetVariants) == 0 {
		return e.evoClient.FindMessages(cfg.EvolutionURL, cfg.EvolutionAPIKey, instance, map[string]any{})
	}

	all := make([]MessageRecord, 0)
	for _, n := range rt.TargetVariants {
		msgs, err := e.evoClient.FindMessages(cfg.EvolutionURL, cfg.EvolutionAPIKey, instance, map[string]any{
			"key": map[string]any{
				"remoteJid": n + "@s.whatsapp.net",
			},
		})
		if err == nil {
			all = append(all, msgs...)
		}
	}

	general, err := e.evoClient.FindMessages(cfg.EvolutionURL, cfg.EvolutionAPIKey, instance, map[string]any{})
	if err == nil {
		for _, r := range general {
			candidates := []string{r.Key.RemoteJid, r.Key.RemoteJidAlt, r.Key.SenderPn, r.SenderPn}
			hit := false
			for _, cand := range candidates {
				if cand != "" {
					d := extractDigits(cand)
					for _, v := range rt.TargetVariants {
						if d == v {
							hit = true
							break
						}
					}
				}
				if hit {
					break
				}
			}
			if hit {
				all = append(all, r)
			}
		}
	}

	// Deduplica
	uniq := make(map[string]MessageRecord)
	for _, m := range all {
		if m.Key.ID != "" {
			uniq[m.Key.ID] = m
		}
	}

	res := make([]MessageRecord, 0, len(uniq))
	for _, m := range uniq {
		res = append(res, m)
	}

	sort.Slice(res, func(i, j int) bool {
		return res[i].MessageTimestamp < res[j].MessageTimestamp
	})

	return res, nil
}

// Loop contínuo que processa a fila de mensagens sequencialmente (FIFO)
func (e *BotEngine) workerLoop() {
	for {
		e.queueMu.Lock()
		var item *QueueItem
		if len(e.queue) > 0 {
			it := e.queue[0]
			e.queue = e.queue[1:]
			item = &it
		}
		e.queueMu.Unlock()

		if item == nil {
			select {
			case <-e.wakeQueue:
			case <-time.After(1 * time.Second):
			case <-e.stopChan:
				return
			}
			continue
		}

		// Processa o item
		e.handleItem(*item)
	}
}

func (e *BotEngine) handleItem(item QueueItem) {
	e.mu.RLock()
	rt, exists := e.runtimes[item.Instance]
	e.mu.RUnlock()

	if !exists || !rt.Active {
		return
	}

	cfg := e.configStore.Get()
	text := getMessageText(item.Record)
	isAudio := text == "" && cfg.AudioEnabled && item.Record.Message != nil && item.Record.Message.AudioMessage != nil

	targetPhone := item.Contact
	if rt.IsSelf && rt.OwnerNumber != "" {
		targetPhone = rt.OwnerNumber
	}

	// 1. Processamento de áudio se for voz
	if isAudio {
		e.AddLog(item.Instance, fmt.Sprintf("🎤 Transcrevendo áudio de %s no PC da IA...", item.Contact))
		b64, err := e.evoClient.GetBase64FromMedia(cfg.EvolutionURL, cfg.EvolutionAPIKey, item.Instance, item.Record.Key.ID)
		if err != nil {
			e.AddLog(item.Instance, "Erro ao baixar áudio: "+err.Error())
			return
		}

		transcribed, err := e.aiService.TranscribeAudio(cfg.WhisperURL, cfg.WhisperModel, b64)
		if err != nil {
			e.AddLog(item.Instance, "Erro Whisper: "+err.Error())
			_, _ = e.evoClient.SendText(cfg.EvolutionURL, cfg.EvolutionAPIKey, item.Instance, targetPhone, "Não consegui entender o áudio. Pode escrever a sua mensagem?")
			return
		}

		text = transcribed
		e.AddLog(item.Instance, "🎤 Áudio transcrito: "+text)
	}

	if text == "" {
		return
	}

	// Comando de reset
	lower := strings.ToLower(text)
	if lower == "/reset" || lower == "/limpar" {
		rt.mu.Lock()
		delete(rt.Hist, item.Contact)
		rt.mu.Unlock()
		_, _ = e.evoClient.SendText(cfg.EvolutionURL, cfg.EvolutionAPIKey, item.Instance, targetPhone, "Conversa reiniciada.")
		e.AddLog(item.Instance, "Memória limpa: "+item.Contact)
		return
	}

	e.AddLog(item.Instance, fmt.Sprintf("← %s: %s", item.Contact, text))

	rt.mu.Lock()
	history := rt.Hist[item.Contact]
	history = append(history, ChatMessage{Role: "user", Content: text})
	rt.Hist[item.Contact] = history
	rt.mu.Unlock()

	// Chamada ao Ollama no PC da IA
	reply, err := e.aiService.AskOllama(cfg.OllamaURL, cfg.OllamaModel, rt.SysPrompt, history)
	if err != nil {
		e.AddLog(item.Instance, "ERRO Ollama: "+err.Error())
		rt.mu.Lock()
		if len(rt.Hist[item.Contact]) > 0 {
			rt.Hist[item.Contact] = rt.Hist[item.Contact][:len(rt.Hist[item.Contact])-1]
		}
		rt.mu.Unlock()
		return
	}

	rt.mu.Lock()
	history = append(history, ChatMessage{Role: "assistant", Content: reply})
	if len(history) > 20 {
		history = history[len(history)-20:]
	}
	rt.Hist[item.Contact] = history
	rt.SentTexts[reply] = true
	rt.mu.Unlock()

	// Envio da resposta ao WhatsApp
	sendRes, err := e.evoClient.SendText(cfg.EvolutionURL, cfg.EvolutionAPIKey, item.Instance, targetPhone, reply)
	if err != nil {
		e.AddLog(item.Instance, "Erro ao enviar resposta: "+err.Error())
		return
	}

	if keyMap, ok := sendRes["key"].(map[string]any); ok {
		if sentID, ok := keyMap["id"].(string); ok && sentID != "" {
			rt.mu.Lock()
			rt.Sent[sentID] = true
			rt.mu.Unlock()
		}
	}

	e.AddLog(item.Instance, "→ "+reply)
}

// Loop de polling de segurança a cada 3 segundos
func (e *BotEngine) pollingLoop() {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			activeInsts := e.GetActiveInstances()
			for _, inst := range activeInsts {
				e.mu.RLock()
				rt := e.runtimes[inst]
				e.mu.RUnlock()
				if rt == nil || !rt.Active {
					continue
				}

				msgs, err := e.fetchMessagesForBot(inst, rt)
				if err != nil {
					continue
				}

				for _, m := range msgs {
					e.EnqueueMessage(inst, m)
				}
			}
		case <-e.stopChan:
			return
		}
	}
}

// Diagnóstico da instância
func (e *BotEngine) Diagnose(instance string) {
	e.AddLog(instance, "--- DIAGNÓSTICO ---")
	cfg := e.configStore.Get()
	instCfg := cfg.Instances[instance]

	owner := e.owners[instance]
	targets := []string{}
	if !instCfg.AnyPerson && instCfg.TargetNum != "" {
		targets = brVariants(instCfg.TargetNum)
	}

	e.AddLog(instance, fmt.Sprintf("Número dono: %s | Filtro: %s", owner, strings.Join(targets, ", ")))

	for _, v := range targets {
		msgs, err := e.evoClient.FindMessages(cfg.EvolutionURL, cfg.EvolutionAPIKey, instance, map[string]any{
			"key": map[string]any{"remoteJid": v + "@s.whatsapp.net"},
		})
		if err == nil {
			e.AddLog(instance, fmt.Sprintf("Com filtro %s: %d mensagens encontradas", v, len(msgs)))
		}
	}

	all, err := e.evoClient.FindMessages(cfg.EvolutionURL, cfg.EvolutionAPIKey, instance, map[string]any{})
	if err == nil {
		e.AddLog(instance, fmt.Sprintf("Sem filtro: %d mensagens totais", len(all)))
	}
	e.AddLog(instance, "--- FIM DIAGNÓSTICO ---")
}
