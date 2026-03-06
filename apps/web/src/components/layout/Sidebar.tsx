import { NavLink } from 'react-router-dom'
import { CheckSquare, FolderKanban, Settings, Plus } from 'lucide-react'

const navItems = [
  { to: '/tasks', icon: CheckSquare, label: 'Задачи' },
  { to: '/projects', icon: FolderKanban, label: 'Проекты' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-sky-400">🚀 Task Manager</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button className="w-full flex items-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors">
          <Plus size={20} />
          <span>Новая задача</span>
        </button>
      </div>
    </aside>
  )
}
