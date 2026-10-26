# Sistema de Bot IA WhatsApp (Go Backend + React + Ollama + Whisper GPU)

Sistema completo de atendimento inteligente via WhatsApp para **rodar 24/7 na VPS** com baixo consumo de memória (Go) e processamento pesado de IA (Ollama + Whisper) descarregado para um **computador com GPU** via **Tailscale**.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐          ┌──────────────────────────────────────────────┐
│                SUA VPS                  │          │            COMPUTADOR DA IA (GPU)            │
│          (Fica ligada 24/7)             │          │                                              │
│                                         │          │  • Ollama (LLM):                             │
│  • Evolution API                        │  Rede    │    http://100.x.x.x:11434                    │
│  • Bot Core em Go (:3001)               │─────────▶│                                              │
│    - Webhook & Polling em tempo real    │Tailscale │  • Whisper GPU (:9000):                      │
│    - Fila FIFO e histórico              │          │    http://100.x.x.x:9000                     │
│    - Servidor estático do Painel Web    │          │    (Transcreve áudio com CUDA em < 1s)       │
└─────────────────────────────────────────┘          └──────────────────────────────────────────────┘
```

---

## 🚀 Como Rodar na VPS

### 1. Compilar o Front-end (uma única vez):
```bash
cd chat-bot
npm install
npm run build
```

### 2. Rodar o Servidor Go 24/7 na VPS:
O binário em Go consome apenas ~15MB de RAM e serve tanto a API quanto o site:

```bash
cd server
go build -o bot-server .
./bot-server
```

> **Dica para rodar em background 24/7:**
> Você pode usar o `pm2` ou criar um serviço no `systemd`:
> ```bash
> pm2 start ./bot-server --name bot-ia
> ```

Acesse o painel no navegador: **`http://SEU_IP_VPS:3001`**

---

## 🎙️ Como Rodar a Transcrição no PC da IA

Veja as instruções detalhadas em [`whisper-server/README.md`](whisper-server/README.md).

Em resumo, no computador com GPU execute via Docker:
```bash
docker run -d --name whisper-gpu --gpus all --restart unless-stopped -p 9000:8000 -e WHISPER_MODEL=base fedirz/faster-whisper-server:latest-cuda
```

---

## ⚡ Webhook da Evolution API (Tempo Real Zero Delay)

O servidor Go possui um endpoint de webhook pronto para receber mensagens instantaneamente:
- **URL do Webhook:** `http://SEU_IP_VPS:3001/api/webhook/evolution`
- Caso o webhook não esteja configurado, o sistema possui **polling automático de contingência a cada 3 segundos**.
