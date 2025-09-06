import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import { useSocket } from '../hooks/useSocket';
import { formatConnectionStatus } from '../utils/formatters';

const ConnectionStatus: React.FC = () => {
  const { state } = useAppContext();
  const { connectionStatus } = state;
  const { connect, disconnect } = useSocket({ autoConnect: false });

  const connectionInfo = formatConnectionStatus(
    connectionStatus.connected,
    connectionStatus.reconnecting
  );

  const handleReconnect = () => {
    if (connectionStatus.connected) {
      disconnect();
      setTimeout(() => connect(), 1000);
    } else {
      connect();
    }
  };

  const getStatusIcon = () => {
    if (connectionStatus.reconnecting) {
      return <CircularProgress size={16} color="inherit" />;
    } else if (connectionStatus.connected) {
      return <ConnectedIcon fontSize="small" />;
    } else if (connectionStatus.error) {
      return <ErrorIcon fontSize="small" />;
    } else {
      return <DisconnectedIcon fontSize="small" />;
    }
  };

  const getStatusColor = (): 'success' | 'warning' | 'error' | 'default' => {
    if (connectionStatus.connected) return 'success';
    if (connectionStatus.reconnecting) return 'warning';
    if (connectionStatus.error) return 'error';
    return 'default';
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {/* Connection Status Chip */}
      <Chip
        icon={getStatusIcon()}
        label={connectionInfo.status}
        color={getStatusColor()}
        size="small"
        variant="filled"
        sx={{
          fontWeight: 500,
          '& .MuiChip-icon': {
            marginLeft: '8px'
          }
        }}
      />

      {/* Reconnect Button */}
      <Tooltip 
        title={
          connectionStatus.connected 
            ? "Reconnect to WebSocket" 
            : "Connect to WebSocket"
        }
      >
        <IconButton
          size="small"
          onClick={handleReconnect}
          disabled={connectionStatus.reconnecting}
          sx={{
            color: connectionStatus.connected ? 'success.main' : 'text.secondary',
            '&:hover': {
              backgroundColor: connectionStatus.connected 
                ? 'rgba(76, 175, 80, 0.1)' 
                : 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Connection Details (Desktop Only) */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        {connectionStatus.connected && (
          <Typography variant="caption" color="text.secondary">
            Connection #{connectionStatus.connectionCount}
          </Typography>
        )}
        
        {connectionStatus.error && !connectionStatus.connected && (
          <Tooltip title={connectionStatus.error}>
            <Typography 
              variant="caption" 
              color="error.main"
              sx={{ 
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block'
              }}
            >
              {connectionStatus.error}
            </Typography>
          </Tooltip>
        )}
      </Box>
    </Stack>
  );
};

export default ConnectionStatus;
