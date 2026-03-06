import { useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import api from '@/lib/api/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      login(data.access_token, user)
    } catch {
      setError('Неверный email или пароль')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-sky-400 text-center">🚀 Task Manager</h1>
        <p className="text-slate-500 text-center text-sm">Войдите в свой аккаунт</p>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-sky-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-sky-500"
        />
        <button className="w-full py-2.5 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors">
          Войти
        </button>
      </form>
    </div>
  )
}
