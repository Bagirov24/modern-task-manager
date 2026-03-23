import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Box,
  Button,
} from '@mui/material'
import {
  FolderOutlined as FolderIcon,
  Add as AddIcon,
  CreateNewFolder as NewFolderIcon,
} from '@mui/icons-material'

export default function ProjectsPage() {
  return (
    <Container maxWidth="lg" disableGutters>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Проекты
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Организуйте задачи по проектам
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Новый проект
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'transparent',
              height: '100%',
              minHeight: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            elevation={0}
          >
            <CardActionArea
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                p: 3,
              }}
            >
              <NewFolderIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.6 }} />
              <Typography variant="body2" color="text.secondary">
                Создать проект
              </Typography>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}
