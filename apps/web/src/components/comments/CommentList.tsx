import React, { useState } from 'react'
import {
  Box, Typography, TextField, Button, Avatar,
  Paper, IconButton, CircularProgress,
} from '@mui/material'
import { Send, Delete, Edit } from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../../hooks/useAuth'

interface Comment {
  id: string
  content: string
  author: { id: string; username: string; full_name: string; avatar_url?: string }
  created_at: string
}

interface Props {
  comments: Comment[]
  isLoading: boolean
  onAdd: (content: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEdit: (id: string, content: string) => Promise<void>
}

export default function CommentList({ comments, isLoading, onAdd, onDelete, onEdit }: Props) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    try { await onAdd(text); setText('') } finally { setSending(false) }
  }

  if (isLoading) return <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Comments ({comments.length})</Typography>
      <Box display="flex" gap={1} mb={3}>
        <TextField fullWidth size="small" placeholder="Add a comment..." value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          multiline maxRows={4} />
        <IconButton color="primary" onClick={handleSend} disabled={sending || !text.trim()}>
          <Send />
        </IconButton>
      </Box>
      {comments.map(c => (
        <Paper key={c.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Avatar src={c.author.avatar_url} sx={{ width: 32, height: 32 }}>
              {c.author.full_name[0]}
            </Avatar>
            <Box flex={1}>
              <Typography variant="subtitle2">{c.author.full_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
              </Typography>
            </Box>
            {user?.id === c.author.id && (
              <Box>
                <IconButton size="small" onClick={() => { setEditId(c.id); setEditText(c.content) }}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(c.id)}><Delete fontSize="small" /></IconButton>
              </Box>
            )}
          </Box>
          {editId === c.id ? (
            <Box display="flex" gap={1}>
              <TextField fullWidth size="small" value={editText} onChange={e => setEditText(e.target.value)} multiline />
              <Button size="small" onClick={async () => { await onEdit(c.id, editText); setEditId(null) }}>Save</Button>
              <Button size="small" onClick={() => setEditId(null)}>Cancel</Button>
            </Box>
          ) : <Typography variant="body2">{c.content}</Typography>}
        </Paper>
      ))}
      {comments.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
          No comments yet.
        </Typography>
      )}
    </Box>
  )
}
