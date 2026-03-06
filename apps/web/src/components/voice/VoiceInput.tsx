import { useState, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

export default function VoiceInput({ onResult }: { onResult: (text: string) => void }) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Браузер не поддерживает распознавание речи')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      setIsProcessing(true)
      onResult(text)
      setIsProcessing(false)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
  }, [onResult])

  return (
    <button
      onClick={startListening}
      disabled={isProcessing}
      className={`p-3 rounded-full transition-all ${
        isListening
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-slate-700 text-slate-400 hover:text-sky-400 hover:bg-slate-600'
      }`}
    >
      {isProcessing ? <Loader2 size={20} className="animate-spin" /> : isListening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  )
}
