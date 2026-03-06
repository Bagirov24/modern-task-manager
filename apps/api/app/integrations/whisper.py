import openai
from app.core.config import settings
from pathlib import Path

client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)


class WhisperService:
    @staticmethod
    async def transcribe(audio_path: str, language: str = "ru") -> str:
        with open(audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
            )
        return transcript.text

    @staticmethod
    async def transcribe_bytes(audio_bytes: bytes, language: str = "ru") -> str:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            return await WhisperService.transcribe(tmp.name, language)
