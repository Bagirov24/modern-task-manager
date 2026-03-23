import { create } from 'zustand'
import type { Project } from '@/lib/types'

interface ProjectState {
  projects: Project[]
  selectedProject: Project | null
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  selectProject: (project: Project | null) => void
}

const sampleProjects: Project[] = [
  {
    id: '1',
    name: 'Личные задачи',
    description: 'Повседневные дела и планы',
    color: '#2196F3',
    icon: 'person',
    is_archived: false,
    owner_id: '1',
    created_at: new Date().toISOString(),
    task_count: 5,
  },
  {
    id: '2',
    name: 'Рабочий проект',
    description: 'Задачи по работе',
    color: '#4CAF50',
    icon: 'work',
    is_archived: false,
    owner_id: '1',
    created_at: new Date().toISOString(),
    task_count: 12,
  },
  {
    id: '3',
    name: 'Обучение',
    description: 'Курсы и саморазвитие',
    color: '#FF9800',
    icon: 'school',
    is_archived: false,
    owner_id: '1',
    created_at: new Date().toISOString(),
    task_count: 8,
  },
]

export const useProjectStore = create<ProjectState>((set) => ({
  projects: sampleProjects,
  selectedProject: null,
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  updateProject: (id, updates) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
  selectProject: (project) => set({ selectedProject: project }),
}))
