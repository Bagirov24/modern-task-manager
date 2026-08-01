import { Stack } from '@mui/material'
import ActionQueue from '@/features/dashboard/ActionQueue'
import FocusNowCard from '@/features/dashboard/FocusNowCard'
import TeamRadar from '@/features/dashboard/TeamRadar'
import WaitingQueue from '@/features/dashboard/WaitingQueue'
import { useMyWork } from '@/features/dashboard/useMyWork'

export default function DashboardPage() {
  const work = useMyWork()

  return (
    <Stack spacing={3} sx={{ maxWidth: 1440, mx: 'auto' }}>
      <FocusNowCard focus={work.focus} candidates={work.actions} state={work.states.focus} />
      <ActionQueue items={work.actions} state={work.states.actions} />
      <WaitingQueue items={work.waiting} state={work.states.waiting} />
      <TeamRadar attention={work.attention} projects={work.projects} state={work.states.projects} />
    </Stack>
  )
}
