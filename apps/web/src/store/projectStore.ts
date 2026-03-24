import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Project } from '../lib/types'

export type { Project }

interface ProjectState {
  projects: Project[]
  selectedProject: Project | null
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  removeProject: (projectId: string) => void
  setSelectedProject: (project: Project | null) => void
  toggleFavorite: (projectId: string) => void
  getProgress: (projectId: string) => number
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        projects: [],
        selectedProject: null,

        setProjects: (projects) => set({ projects }),
        addProject: (project) => set((state) => ({
          projects: [...state.projects, project]
        })),
        updateProject: (project) => set((state) => ({
          projects: state.projects.map(p => p.id === project.id ? project : p),
          selectedProject: state.selectedProject?.id === project.id ? project : state.selectedProject
        })),
        removeProject: (projectId) => set((state) => ({
          projects: state.projects.filter(p => p.id !== projectId),
          selectedProject: state.selectedProject?.id === projectId ? null : state.selectedProject
        })),
        setSelectedProject: (project) => set({ selectedProject: project }),
        toggleFavorite: (projectId) => set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, is_favorite: !p.is_favorite } : p
          )
        })),
        getProgress: (projectId) => {
          const project = get().projects.find(p => p.id === projectId)
          if (!project || project.task_count === 0) return 0
          return Math.round((project.completed_count / project.task_count) * 100)
        },
      }),
      { name: 'project-store' }
    )
  )
)
