package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type InstanceBotConfig struct {
	Active     bool   `json:"active"`
	AnyPerson  bool   `json:"anyPerson"`
	TargetNum  string `json:"targetNum"`
	SysPrompt  string `json:"sysPrompt"`
}

type AppConfig struct {
	EvolutionURL    string                       `json:"evolutionUrl"`
	EvolutionAPIKey string                       `json:"evolutionApiKey"`
	OllamaURL       string                       `json:"ollamaUrl"`
	OllamaModel     string                       `json:"ollamaModel"`
	AudioEnabled    bool                         `json:"audioEnabled"`
	WhisperURL      string                       `json:"whisperUrl"`
	WhisperModel    string                       `json:"whisperModel"`
	Instances       map[string]InstanceBotConfig `json:"instances"`
}

type ConfigStore struct {
	mu   sync.RWMutex
	path string
	data AppConfig
}

const DefaultSystemPrompt = "Você é um assistente prestativo. Responda em português do Brasil, de forma curta e clara."

func NewConfigStore(path string) (*ConfigStore, error) {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	cs := &ConfigStore{
		path: path,
		data: AppConfig{
			EvolutionURL:    "",
			EvolutionAPIKey: "",
			OllamaURL:       "http://localhost:11434",
			OllamaModel:     "",
			AudioEnabled:    true,
			WhisperURL:      "http://localhost:9000",
			WhisperModel:    "base",
			Instances:       make(map[string]InstanceBotConfig),
		},
	}

	if _, err := os.Stat(path); err == nil {
		bytes, err := os.ReadFile(path)
		if err == nil {
			var loaded AppConfig
			if err := json.Unmarshal(bytes, &loaded); err == nil {
				if loaded.Instances == nil {
					loaded.Instances = make(map[string]InstanceBotConfig)
				}
				if loaded.OllamaURL == "" {
					loaded.OllamaURL = "http://localhost:11434"
				}
				if loaded.WhisperURL == "" {
					loaded.WhisperURL = "http://localhost:9000"
				}
				if loaded.WhisperModel == "" {
					loaded.WhisperModel = "base"
				}
				cs.data = loaded
			}
		}
	} else {
		cs.saveLocked()
	}

	return cs, nil
}

func (cs *ConfigStore) saveLocked() error {
	bytes, err := json.MarshalIndent(cs.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cs.path, bytes, 0644)
}

func (cs *ConfigStore) Get() AppConfig {
	cs.mu.RLock()
	defer cs.mu.RUnlock()
	return cs.data
}

func (cs *ConfigStore) Update(updateFn func(cfg *AppConfig)) error {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	updateFn(&cs.data)
	return cs.saveLocked()
}
