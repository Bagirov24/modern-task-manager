"""Whisper integration (disabled — openai dependency removed)."""


class WhisperService:
    @staticmethod
    async def transcribe(audio_path: str, language: str = "ru") -> str:
        raise NotImplementedError("Whisper integration is disabled")

    @staticmethod
    async def transcribe_bytes(audio_bytes: bytes, language: str = "ru") -> str:
        raise NotImplementedError("Whisper integration is disabled")
