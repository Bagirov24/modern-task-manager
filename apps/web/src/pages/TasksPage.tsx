import TaskList from '@/components/tasks/TaskList'
import AddTask from '@/components/tasks/AddTask'

export default function TasksPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-slate-200 mb-4">Мои задачи</h2>
      <AddTask />
      <div className="mt-4">
        <TaskList />
      </div>
    </div>
  )
}
