package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type EvolutionInstanceItem struct {
	Name             string `json:"name"`
	Instance         *struct {
		InstanceName string `json:"instanceName"`
		Status       string `json:"status"`
	} `json:"instance,omitempty"`
	ConnectionStatus string `json:"connectionStatus"`
	OwnerJid         string `json:"ownerJid"`
	Number           string `json:"number"`
}

type MessageKey struct {
	ID           string `json:"id"`
	RemoteJid    string `json:"remoteJid"`
	RemoteJidAlt string `json:"remoteJidAlt,omitempty"`
	SenderPn     string `json:"senderPn,omitempty"`
	FromMe       bool   `json:"fromMe"`
}

type MessageContent struct {
	Conversation        string `json:"conversation,omitempty"`
	ExtendedTextMessage *struct {
		Text string `json:"text,omitempty"`
	} `json:"extendedTextMessage,omitempty"`
	AudioMessage any `json:"audioMessage,omitempty"`
}

type MessageRecord struct {
	Key              MessageKey      `json:"key"`
	SenderPn         string          `json:"senderPn,omitempty"`
	MessageTimestamp int64           `json:"messageTimestamp,omitempty"`
	Message          *MessageContent `json:"message,omitempty"`
}

type EvolutionClient struct {
	client *http.Client
}

func NewEvolutionClient() *EvolutionClient {
	return &EvolutionClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (e *EvolutionClient) request(baseURL, apiKey, method, path string, body any, target any) error {
	baseURL = strings.TrimRight(baseURL, "/")
	fullURL := baseURL + path

	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return err
		}
		bodyReader = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequest(method, fullURL, bodyReader)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", apiKey)

	resp, err := e.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Evolution API HTTP %d: %s", resp.StatusCode, string(respBytes))
	}

	if target != nil && len(respBytes) > 0 {
		return json.Unmarshal(respBytes, target)
	}

	return nil
}

func (e *EvolutionClient) FetchInstances(baseURL, apiKey string) ([]EvolutionInstanceItem, error) {
	var list []EvolutionInstanceItem
	err := e.request(baseURL, apiKey, "GET", "/instance/fetchInstances", nil, &list)
	return list, err
}

func (e *EvolutionClient) CreateInstance(baseURL, apiKey, name string) (map[string]any, error) {
	payload := map[string]any{
		"instanceName": name,
		"qrcode":       true,
		"integration":  "WHATSAPP-BAILEYS",
	}
	var res map[string]any
	err := e.request(baseURL, apiKey, "POST", "/instance/create", payload, &res)
	return res, err
}

func (e *EvolutionClient) ConnectInstance(baseURL, apiKey, name string) (map[string]any, error) {
	var res map[string]any
	path := "/instance/connect/" + url.PathEscape(name)
	err := e.request(baseURL, apiKey, "GET", path, nil, &res)
	return res, err
}

func (e *EvolutionClient) LogoutInstance(baseURL, apiKey, name string) error {
	path := "/instance/logout/" + url.PathEscape(name)
	return e.request(baseURL, apiKey, "DELETE", path, nil, nil)
}

func (e *EvolutionClient) DeleteInstance(baseURL, apiKey, name string) error {
	path := "/instance/delete/" + url.PathEscape(name)
	return e.request(baseURL, apiKey, "DELETE", path, nil, nil)
}

func (e *EvolutionClient) SendText(baseURL, apiKey, instance, number, text string) (map[string]any, error) {
	payload := map[string]string{
		"number": number,
		"text":   text,
	}
	var res map[string]any
	path := "/message/sendText/" + url.PathEscape(instance)
	err := e.request(baseURL, apiKey, "POST", path, payload, &res)
	return res, err
}

func (e *EvolutionClient) FindMessages(baseURL, apiKey, instance string, where any) ([]MessageRecord, error) {
	payload := map[string]any{
		"where": where,
	}
	var raw struct {
		Messages struct {
			Records []MessageRecord `json:"records"`
		} `json:"messages"`
		Records []MessageRecord `json:"records"`
	}

	path := "/chat/findMessages/" + url.PathEscape(instance)
	err := e.request(baseURL, apiKey, "POST", path, payload, &raw)
	if err != nil {
		return nil, err
	}

	if len(raw.Messages.Records) > 0 {
		return raw.Messages.Records, nil
	}
	return raw.Records, nil
}

func (e *EvolutionClient) GetBase64FromMedia(baseURL, apiKey, instance, messageKeyID string) (string, error) {
	payload := map[string]any{
		"message": map[string]any{
			"key": map[string]any{
				"id": messageKeyID,
			},
		},
		"convertToMp4": false,
	}
	var res struct {
		Base64 string `json:"base64"`
	}
	path := "/chat/getBase64FromMediaMessage/" + url.PathEscape(instance)
	err := e.request(baseURL, apiKey, "POST", path, payload, &res)
	if err != nil {
		return "", err
	}

	raw := res.Base64
	if idx := strings.Index(raw, ","); idx != -1 {
		raw = raw[idx+1:]
	}
	return raw, nil
}

func (e *EvolutionClient) SetWebhook(baseURL, apiKey, instance, webhookURL string) error {
	payload := map[string]any{
		"enabled":           true,
		"url":               webhookURL,
		"webhook_by_events": false,
		"events":            []string{"MESSAGES_UPSERT"},
	}
	path := "/webhook/set/" + url.PathEscape(instance)
	return e.request(baseURL, apiKey, "POST", path, payload, nil)
}
