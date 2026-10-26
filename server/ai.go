package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
)

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIService struct {
	client *http.Client
}

func NewAIService() *AIService {
	return &AIService{
		client: &http.Client{
			Timeout: 120 * time.Second, // IA pode demorar alguns segundos em respostas longas
		},
	}
}

// Lista modelos disponíveis no Ollama
func (a *AIService) FetchOllamaModels(ollamaURL string) ([]string, error) {
	ollamaURL = strings.TrimRight(ollamaURL, "/")
	resp, err := a.client.Get(ollamaURL + "/api/tags")
	if err != nil {
		return nil, fmt.Errorf("não consegui conectar ao Ollama em %s: %w", ollamaURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Ollama retornou HTTP %d", resp.StatusCode)
	}

	var data struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	names := make([]string, 0, len(data.Models))
	for _, m := range data.Models {
		names = append(names, m.Name)
	}
	return names, nil
}

// Envia histórico para o Ollama e obtém a resposta da IA
func (a *AIService) AskOllama(ollamaURL, model, sysPrompt string, history []ChatMessage) (string, error) {
	ollamaURL = strings.TrimRight(ollamaURL, "/")

	messages := make([]ChatMessage, 0, len(history)+1)
	if sysPrompt != "" {
		messages = append(messages, ChatMessage{Role: "system", Content: sysPrompt})
	}
	messages = append(messages, history...)

	payload := map[string]any{
		"model":    model,
		"stream":   false,
		"messages": messages,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", ollamaURL+"/api/chat", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("erro ao conectar no Ollama (%s): %w", ollamaURL, err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Ollama HTTP %d: %s", resp.StatusCode, string(respBytes))
	}

	var res struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	}

	if err := json.Unmarshal(respBytes, &res); err != nil {
		return "", err
	}

	text := strings.TrimSpace(res.Message.Content)
	if text == "" {
		return "", fmt.Errorf("Ollama retornou resposta vazia")
	}

	return text, nil
}

// Envia áudio para o servidor Whisper no PC da IA e obtém a transcrição
func (a *AIService) TranscribeAudio(whisperURL, whisperModel, base64Audio string) (string, error) {
	whisperURL = strings.TrimRight(whisperURL, "/")
	if whisperModel == "" {
		whisperModel = "base"
	}

	// Remove cabeçalho data:... se existir
	if idx := strings.Index(base64Audio, ","); idx != -1 {
		base64Audio = base64Audio[idx+1:]
	}

	audioBytes, err := base64.StdEncoding.DecodeString(base64Audio)
	if err != nil {
		return "", fmt.Errorf("áudio base64 inválido: %w", err)
	}

	// 1. Tenta padrão OpenAI (/v1/audio/transcriptions) multipart
	var b bytes.Buffer
	w := multipart.NewWriter(&b)

	part, err := w.CreateFormFile("file", "audio.ogg")
	if err == nil {
		_, _ = part.Write(audioBytes)
		_ = w.WriteField("model", whisperModel)
		_ = w.WriteField("language", "pt")
		_ = w.Close()

		req, err := http.NewRequest("POST", whisperURL+"/v1/audio/transcriptions", &b)
		if err == nil {
			req.Header.Set("Content-Type", w.FormDataContentType())
			resp, err := a.client.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					var res struct {
						Text string `json:"text"`
					}
					if err := json.NewDecoder(resp.Body).Decode(&res); err == nil {
						return strings.TrimSpace(res.Text), nil
					}
				}
			}
		}
	}

	// 2. Se falhar, tenta endpoint direto /transcribe com JSON
	payload := map[string]string{
		"base64":   base64Audio,
		"language": "pt",
	}
	jsonBytes, _ := json.Marshal(payload)
	req2, err := http.NewRequest("POST", whisperURL+"/transcribe", bytes.NewReader(jsonBytes))
	if err != nil {
		return "", fmt.Errorf("falha ao criar requisição para o Whisper: %w", err)
	}
	req2.Header.Set("Content-Type", "application/json")

	resp2, err := a.client.Do(req2)
	if err != nil {
		return "", fmt.Errorf("não consegui conectar no Whisper em %s: %w", whisperURL, err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp2.Body)
		return "", fmt.Errorf("Whisper HTTP %d: %s", resp2.StatusCode, string(respBody))
	}

	var res2 struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(resp2.Body).Decode(&res2); err != nil {
		return "", err
	}

	return strings.TrimSpace(res2.Text), nil
}
