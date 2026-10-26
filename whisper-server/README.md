# Servidor Whisper para o Computador da IA (com GPU)

Este servidor deve rodar no **computador que possui a IA / GPU forte**.
Ele fica escutando requisições de transcrição de áudio enviadas pela sua VPS através do Tailscale.

---

## Opção 1: Rodar com Docker (Mais Fácil e Rápido)

Se o computador da IA tiver Docker com suporte à GPU NVIDIA:

```bash
docker run -d --name whisper-gpu \
  --gpus all \
  --restart unless-stopped \
  -p 9000:8000 \
  -e WHISPER_MODEL=base \
  fedirz/faster-whisper-server:latest-cuda
```

> **Pronto!** O serviço estará respondendo na porta **9000** compatível com a API da OpenAI.

---

## Opção 2: Rodar com Python nativo

Se preferir rodar direto em Python no Windows ou Linux:

1. Instale as dependências:
```bash
pip install fastapi uvicorn python-multipart pydantic faster-whisper
```

2. Execute o servidor:
```bash
python server.py
```

O servidor iniciará automaticamente com detecção de GPU CUDA (ou CPU se não houver CUDA) na porta **9000**.

---

## Como conectar na VPS via Tailscale:

1. Descubra o IP do Tailscale do computador da IA executando no terminal dele:
   ```bash
   tailscale ip -4
   ```
   *(Exemplo: `100.80.90.100`)*

2. No painel web do bot:
   - **URL do Ollama:** `http://100.80.90.100:11434`
   - **URL do Whisper:** `http://100.80.90.100:9000`

3. Certifique-se de que o Ollama no computador da IA está aceitando conexões de fora:
   - Se for Linux: edite o serviço do Ollama com `Environment="OLLAMA_HOST=0.0.0.0:11434"`.
   - Se for Windows: defina a variável de ambiente do sistema `OLLAMA_HOST=0.0.0.0:11434` e reinicie o Ollama.
