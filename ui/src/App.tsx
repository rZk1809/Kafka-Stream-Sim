import React, { useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Alert,
  Snackbar,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { useSocket } from './hooks/useSocket';
import { useAppContext } from './context/AppContext';
import Dashboard from './components/Dashboard';
import TradingInterface from './components/TradingInterface';
import PortfolioView from './components/PortfolioView';
import Navigation from './components/Navigation';
import ThemeToggle from './components/ThemeToggle';
import ConnectionStatus from './components/ConnectionStatus';
import MarketAlerts from './components/MarketAlerts';
import HistoricalCharts from './components/HistoricalCharts';
import VolumeAnalysis from './components/VolumeAnalysis';

const App: React.FC = () => {
  const { state, actions } = useAppContext();
  const { error, theme, currentView } = state;

  // Initialize WebSocket connection
  useSocket({
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
    // Return undefined explicitly when error is falsy
    return undefined;
  }, [error, actions]);

  // Create theme based on current theme mode
  const muiTheme = createTheme({
    palette: {
      mode: theme,
      primary: {
        main: theme === 'dark' ? '#90caf9' : '#1976d2',
      },
      secondary: {
        main: theme === 'dark' ? '#f48fb1' : '#dc004e',
      },
      background: {
        default: theme === 'dark' ? '#121212' : '#fafafa',
        paper: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
  });

  const renderCurrentView = () => {
    switch (currentView) {
      case 'trading':
        return <TradingInterface />;
      case 'portfolio':
        return <PortfolioView />;
      case 'alerts':
        return <MarketAlerts />;
      case 'history':
        return <HistoricalCharts />;
      case 'volume':
        return <VolumeAnalysis />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
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
            borderBottom: '1px solid',
            borderColor: 'divider'
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
            <ThemeToggle />
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
          <Navigation />
          {renderCurrentView()}
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
    </ThemeProvider>
  );
};

export default App;
