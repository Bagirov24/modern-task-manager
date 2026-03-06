import { Search, Bell, Mic } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Поиск задач..."
          className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1"
        />
        <button className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
          <Mic size={18} />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-sky-400 rounded-full" />
        </button>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-200">
          {user?.username}
        </button>
      </div>
    </header>
  )
}
