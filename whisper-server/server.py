import os
import io
import tempfile
import base64
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from faster_whisper import WhisperModel

app = FastAPI(title="Whisper GPU Server", description="Servidor de transcrição de áudio via Whisper com aceleração GPU")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração do modelo e GPU
MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
DEVICE = os.getenv("WHISPER_DEVICE", "cuda")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "float16")

print(f"[*] Carregando modelo Whisper '{MODEL_NAME}' no dispositivo '{DEVICE}' ({COMPUTE_TYPE})...")
try:
    model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
    print("[✓] Modelo carregado com sucesso na GPU!")
except Exception as e:
    print(f"[!] Falha ao carregar na GPU ({e}). Tentando CPU...")
    model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
    print("[✓] Modelo carregado na CPU!")

def transcribe_audio_file(file_path: str, language: str = "pt") -> str:
    segments, info = model.transcribe(
        file_path,
        language=language if language else None,
        task="transcribe",
        beam_size=5,
        vad_filter=True, # remove silêncio
    )
    text = " ".join([segment.text for segment in segments]).strip()
    return text

class Base64TranscribeRequest(BaseModel):
    base64: str
    language: Optional[str] = "pt"

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "device": DEVICE}

# Endpoint padrão compatível com OpenAI (usado por curl, bibliotecas e nosso backend)
@app.post("/v1/audio/transcriptions")
async def openai_transcribe(
    file: UploadFile = File(...),
    model_name: Optional[str] = Form(None),
    language: Optional[str] = Form("pt"),
):
    try:
        suffix = os.path.splitext(file.filename or "")[1] or ".ogg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        text = transcribe_audio_file(tmp_path, language=language or "pt")
        os.remove(tmp_path)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint simplificado que aceita áudio direto em base64 ou upload
@app.post("/transcribe")
async def simple_transcribe(req: Base64TranscribeRequest):
    try:
        raw_b64 = req.base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        audio_data = base64.b64decode(raw_b64)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        text = transcribe_audio_file(tmp_path, language=req.language or "pt")
        os.remove(tmp_path)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "9000"))
    print(f"[*] Servidor Whisper pronto e escutando em http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
