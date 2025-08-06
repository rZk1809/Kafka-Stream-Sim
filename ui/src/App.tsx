import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container,
  Alert,
  Snackbar
} from '@mui/material';
import { useSocket } from '@/hooks/useSocket';
import { useAppContext } from '@/context/AppContext';
import Dashboard from '@/components/Dashboard';
import ConnectionStatus from '@/components/ConnectionStatus';

const App: React.FC = () => {
  const { state, actions } = useAppContext();
  const { error } = state;
  
  // Initialize WebSocket connection
  const { isConnected } = useSocket({
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        actions.setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, actions]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: 'background.default'
    }}>
      {/* App Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: 'background.paper',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <Toolbar>
          <Typography 
            variant="h6" 
            component="h1" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              color: 'primary.main'
            }}
          >
            Kafka Stream Simulator
          </Typography>
          <ConnectionStatus />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container 
        maxWidth={false} 
        sx={{ 
          flexGrow: 1, 
          py: 3,
          px: { xs: 2, sm: 3 }
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => actions.setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => actions.setError(null)} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;
