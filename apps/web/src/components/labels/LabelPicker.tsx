import React, { useState } from 'react'
import { Box, Chip, Popover, TextField, Button, Typography, IconButton, List, ListItem, Checkbox } from '@mui/material'
import { Label, Add } from '@mui/icons-material'

interface LabelItem { id: string; name: string; color: string }

interface Props {
  labels: LabelItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onCreate?: (name: string, color: string) => Promise<void>
}

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280']

export function LabelBadge({ label, onRemove }: { label: LabelItem; onRemove?: () => void }) {
  return <Chip label={label.name} size="small" onDelete={onRemove}
    sx={{ bgcolor: label.color+'20', color: label.color, border: '1px solid', borderColor: label.color }} />
}

export default function LabelPicker({ labels, selectedIds, onToggle, onCreate }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement|null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [creating, setCreating] = useState(false)

  return (
    <Box>
      <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
        {labels.filter(l => selectedIds.includes(l.id)).map(l =>
          <LabelBadge key={l.id} label={l} onRemove={() => onToggle(l.id)} />
        )}
        <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}><Label fontSize="small" /></IconButton>
      </Box>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}>
        <Box sx={{ p: 2, width: 250 }}>
          <Typography variant="subtitle2" gutterBottom>Labels</Typography>
          <List dense>
            {labels.map(l => (
              <ListItem key={l.id} dense onClick={() => onToggle(l.id)} sx={{ cursor: 'pointer' }}>
                <Checkbox edge="start" checked={selectedIds.includes(l.id)} size="small" />
                <Chip label={l.name} size="small" sx={{ bgcolor: l.color+'20', color: l.color }} />
              </ListItem>
            ))}
          </List>
          {creating ? (
            <Box mt={1}>
              <TextField size="small" fullWidth placeholder="Label name" value={name}
                onChange={e => setName(e.target.value)} sx={{ mb: 1 }} />
              <Box display="flex" gap={0.5} mb={1}>
                {COLORS.map(c => <Box key={c} onClick={() => setColor(c)}
                  sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                    border: c === color ? '2px solid #000' : 'none' }} />)}
              </Box>
              <Button size="small" variant="contained" onClick={async () => {
                if (onCreate && name.trim()) { await onCreate(name, color); setName(''); setCreating(false) }
              }}>Add</Button>
              <Button size="small" onClick={() => setCreating(false)}>Cancel</Button>
            </Box>
          ) : <Button size="small" startIcon={<Add />} onClick={() => setCreating(true)}>Create label</Button>}
        </Box>
      </Popover>
    </Box>
  )
}
