package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Permite acesso do front-end
	},
}

type Server struct {
	configStore *ConfigStore
	evoClient   *EvolutionClient
	aiService   *AIService
	botEngine   *BotEngine
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, apikey, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	configPath := filepath.Join("data", "config.json")
	cfgStore, err := NewConfigStore(configPath)
	if err != nil {
		log.Fatalf("Erro ao iniciar config store: %v", err)
	}

	evoClient := NewEvolutionClient()
	aiService := NewAIService()
	botEngine := NewBotEngine(cfgStore, evoClient, aiService)

	s := &Server{
		configStore: cfgStore,
		evoClient:   evoClient,
		aiService:   aiService,
		botEngine:   botEngine,
	}

	// Tenta restaurar bots que estavam ativos na inicialização
	go s.restoreActiveBots()

	mux := http.NewServeMux()

	// Endpoints da API
	mux.HandleFunc("/api/state", s.handleGetState)
	mux.HandleFunc("/api/config", s.handleConfig)
	mux.HandleFunc("/api/ollama/models", s.handleOllamaModels)
	mux.HandleFunc("/api/instances", s.handleInstances)
	mux.HandleFunc("/api/instances/", s.handleInstanceSubRoutes)
	mux.HandleFunc("/api/logs", s.handleLogs)
	mux.HandleFunc("/api/webhook/evolution", s.handleWebhook)
	mux.HandleFunc("/api/ws", s.handleWebSocket)

	// Servir front-end estático compilado (se dist existir)
	distPath := filepath.Join("..", "chat-bot", "dist")
	if _, err := os.Stat(distPath); err == nil {
		fileServer := http.FileServer(http.Dir(distPath))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api") {
				http.NotFound(w, r)
				return
			}
			path := filepath.Join(distPath, r.URL.Path)
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, r, filepath.Join(distPath, "index.html"))
				return
			}
			fileServer.ServeHTTP(w, r)
		})
		log.Printf("[*] Servindo front-end estático de %s", distPath)
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if !strings.HasPrefix(r.URL.Path, "/api") {
				writeJSON(w, http.StatusOK, map[string]string{
					"status":  "Bot IA Backend rodando!",
					"version": "1.0.0",
					"mode":    "API",
				})
			}
		})
	}

	handler := corsMiddleware(mux)

	log.Printf("[✓] Servidor Go iniciado com sucesso na porta :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Erro ao rodar servidor: %v", err)
	}
}

func (s *Server) restoreActiveBots() {
	time.Sleep(2 * time.Second) // Aguarda inicialização
	cfg := s.configStore.Get()
	if cfg.EvolutionURL == "" || cfg.EvolutionAPIKey == "" {
		return
	}

	instances, err := s.evoClient.FetchInstances(cfg.EvolutionURL, cfg.EvolutionAPIKey)
	if err != nil {
		return
	}

	ownersMap := make(map[string]string)
	for _, inst := range instances {
		name := inst.Name
		if name == "" && inst.Instance != nil {
			name = inst.Instance.InstanceName
		}
		owner := extractDigits(inst.OwnerJid)
		if owner == "" {
			owner = extractDigits(inst.Number)
		}
		ownersMap[name] = owner
	}
	s.botEngine.UpdateOwners(ownersMap)

	for name, instCfg := range cfg.Instances {
		if instCfg.Active {
			s.botEngine.AddLog(name, "Restaurando bot ativo automaticamente...")
			_ = s.botEngine.Toggle(name)
		}
	}
}

func (s *Server) handleGetState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	cfg := s.configStore.Get()
	activeList := s.botEngine.GetActiveInstances()
	activeMap := make(map[string]bool)
	for _, name := range activeList {
		activeMap[name] = true
	}

	resp := map[string]any{
		"config":      cfg,
		"activeBots":  activeMap,
		"queueLength": s.botEngine.GetQueueLength(),
		"logs":        s.botEngine.GetLogs(),
	}

	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		writeJSON(w, http.StatusOK, s.configStore.Get())
		return
	}

	if r.Method == http.MethodPost {
		var req struct {
			EvolutionURL    *string `json:"evolutionUrl"`
			EvolutionAPIKey *string `json:"evolutionApiKey"`
			OllamaURL       *string `json:"ollamaUrl"`
			OllamaModel     *string `json:"ollamaModel"`
			AudioEnabled    *bool   `json:"audioEnabled"`
			WhisperURL      *string `json:"whisperUrl"`
			WhisperModel    *string `json:"whisperModel"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "JSON inválido")
			return
		}

		err := s.configStore.Update(func(c *AppConfig) {
			if req.EvolutionURL != nil {
				c.EvolutionURL = *req.EvolutionURL
			}
			if req.EvolutionAPIKey != nil {
				c.EvolutionAPIKey = *req.EvolutionAPIKey
			}
			if req.OllamaURL != nil {
				c.OllamaURL = *req.OllamaURL
			}
			if req.OllamaModel != nil {
				c.OllamaModel = *req.OllamaModel
			}
			if req.AudioEnabled != nil {
				c.AudioEnabled = *req.AudioEnabled
			}
			if req.WhisperURL != nil {
				c.WhisperURL = *req.WhisperURL
			}
			if req.WhisperModel != nil {
				c.WhisperModel = *req.WhisperModel
			}
		})

		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, s.configStore.Get())
		return
	}

	writeError(w, http.StatusMethodNotAllowed, "Método não permitido")
}

func (s *Server) handleOllamaModels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	cfg := s.configStore.Get()
	models, err := s.aiService.FetchOllamaModels(cfg.OllamaURL)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"models": models})
}

func (s *Server) handleInstances(w http.ResponseWriter, r *http.Request) {
	cfg := s.configStore.Get()
	if cfg.EvolutionURL == "" || cfg.EvolutionAPIKey == "" {
		writeError(w, http.StatusBadRequest, "Preencha a URL e a API Key da Evolution API")
		return
	}

	switch r.Method {
	case http.MethodGet:
		rawInstances, err := s.evoClient.FetchInstances(cfg.EvolutionURL, cfg.EvolutionAPIKey)
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}

		ownersMap := make(map[string]string)
		type UIInstance struct {
			Name     string `json:"name"`
			Status   string `json:"status"`
			Owner    string `json:"owner"`
			IsActive bool   `json:"isActive"`
		}

		uiList := make([]UIInstance, 0, len(rawInstances))
		for _, inst := range rawInstances {
			name := inst.Name
			if name == "" && inst.Instance != nil {
				name = inst.Instance.InstanceName
			}
			owner := extractDigits(inst.OwnerJid)
			if owner == "" {
				owner = extractDigits(inst.Number)
			}
			ownersMap[name] = owner

			status := inst.ConnectionStatus
			if status == "" && inst.Instance != nil {
				status = inst.Instance.Status
			}
			if status == "" {
				status = "?"
			}

			uiList = append(uiList, UIInstance{
				Name:     name,
				Status:   status,
				Owner:    owner,
				IsActive: s.botEngine.IsActive(name),
			})
		}
		s.botEngine.UpdateOwners(ownersMap)
		writeJSON(w, http.StatusOK, uiList)

	case http.MethodPost:
		var req struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
			writeError(w, http.StatusBadRequest, "Nome da instância obrigatório")
			return
		}

		res, err := s.evoClient.CreateInstance(cfg.EvolutionURL, cfg.EvolutionAPIKey, req.Name)
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, res)

	default:
		writeError(w, http.StatusMethodNotAllowed, "Método não permitido")
	}
}

func (s *Server) handleInstanceSubRoutes(w http.ResponseWriter, r *http.Request) {
	cfg := s.configStore.Get()
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	// /api/instances/:name/:action
	if len(parts) < 3 {
		writeError(w, http.StatusNotFound, "Rota não encontrada")
		return
	}
	name := parts[2]
	action := ""
	if len(parts) >= 4 {
		action = parts[3]
	}

	switch action {
	case "connect":
		res, err := s.evoClient.ConnectInstance(cfg.EvolutionURL, cfg.EvolutionAPIKey, name)
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, res)

	case "logout":
		err := s.evoClient.LogoutInstance(cfg.EvolutionURL, cfg.EvolutionAPIKey, name)
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})

	case "delete":
		err := s.evoClient.DeleteInstance(cfg.EvolutionURL, cfg.EvolutionAPIKey, name)
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})

	case "send":
		var req struct {
			Number string `json:"number"`
			Text   string `json:"text"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "Dados inválidos")
			return
		}
		res, err := s.evoClient.SendText(cfg.EvolutionURL, cfg.EvolutionAPIKey, name, req.Number, req.Text)
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, res)

	case "bot":
		if r.Method == http.MethodGet {
			instCfg := cfg.Instances[name]
			writeJSON(w, http.StatusOK, map[string]any{
				"config":   instCfg,
				"isActive": s.botEngine.IsActive(name),
			})
			return
		}

		if r.Method == http.MethodPost {
			var req struct {
				Active    *bool   `json:"active"`
				AnyPerson *bool   `json:"anyPerson"`
				TargetNum *string `json:"targetNum"`
				SysPrompt *string `json:"sysPrompt"`
				Toggle    bool    `json:"toggle"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeError(w, http.StatusBadRequest, "JSON inválido")
				return
			}

			_ = s.configStore.Update(func(c *AppConfig) {
				ic := c.Instances[name]
				if req.AnyPerson != nil {
					ic.AnyPerson = *req.AnyPerson
				}
				if req.TargetNum != nil {
					ic.TargetNum = *req.TargetNum
				}
				if req.SysPrompt != nil {
					ic.SysPrompt = *req.SysPrompt
				}
				c.Instances[name] = ic
			})

			if req.Toggle {
				err := s.botEngine.Toggle(name)
				if err != nil {
					writeError(w, http.StatusBadRequest, err.Error())
					return
				}
			}

			writeJSON(w, http.StatusOK, map[string]any{
				"config":   s.configStore.Get().Instances[name],
				"isActive": s.botEngine.IsActive(name),
			})
			return
		}

	case "diagnose":
		go s.botEngine.Diagnose(name)
		writeJSON(w, http.StatusOK, map[string]string{"status": "Diagnóstico iniciado"})

	default:
		if r.Method == http.MethodDelete {
			err := s.evoClient.DeleteInstance(cfg.EvolutionURL, cfg.EvolutionAPIKey, name)
			if err != nil {
				writeError(w, http.StatusBadGateway, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
			return
		}
		writeError(w, http.StatusNotFound, "Ação não encontrada")
	}
}

func (s *Server) handleLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		writeJSON(w, http.StatusOK, s.botEngine.GetLogs())
		return
	}
	if r.Method == http.MethodDelete {
		s.botEngine.ClearLogs()
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	writeError(w, http.StatusMethodNotAllowed, "Método não permitido")
}

// Webhook para mensagens recebidas em tempo real da Evolution API
func (s *Server) handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	var payload struct {
		Event    string        `json:"event"`
		Instance string        `json:"instance"`
		Data     MessageRecord `json:"data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	if payload.Event == "messages.upsert" || payload.Event == "MESSAGES_UPSERT" {
		if payload.Instance != "" && payload.Data.Key.ID != "" {
			s.botEngine.EnqueueMessage(payload.Instance, payload.Data)
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "received"})
}

// WebSocket para envio de logs em tempo real ao navegador
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Erro no upgrade do WebSocket: %v", err)
		return
	}
	defer conn.Close()

	ch, unsubscribe := s.botEngine.SubscribeLogs()
	defer unsubscribe()

	// Goroutine para manter conexão viva (ping/pong)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	for {
		select {
		case <-done:
			return
		case logEntry, ok := <-ch:
			if !ok {
				return
			}
			msgBytes, err := json.Marshal(map[string]any{
				"type": "log",
				"data": logEntry,
			})
			if err != nil {
				continue
			}
			if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
				return
			}
		}
	}
}
