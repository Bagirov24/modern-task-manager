import { FolderKanban } from 'lucide-react'

export default function ProjectsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold text-slate-200 mb-4">Проекты</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button className="p-6 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center gap-2 text-slate-500 hover:text-sky-400 hover:border-sky-400/50 transition-colors">
          <FolderKanban size={32} />
          <span className="text-sm">Создать проект</span>
        </button>
      </div>
    </div>
  )
}
