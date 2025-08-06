import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import {
  Speed as SpeedIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  Partition as PartitionIcon
} from '@mui/icons-material';
import { MetricsPanelProps } from '@/types';
import { 
  formatRate, 
  formatUptime, 
  formatLargeNumber,
  formatConnectionStatus
} from '@/utils/formatters';

const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  connectionStatus
}) => {
  // Calculate partition distribution
  const partitionEntries = Object.entries(metrics.partitionOffsets);
  const totalPartitions = partitionEntries.length;
  
  // Connection status info
  const connectionInfo = formatConnectionStatus(
    connectionStatus.connected, 
    connectionStatus.reconnecting
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
          Kafka Metrics
        </Typography>
        <Chip
          label={connectionInfo.status}
          color={connectionInfo.color}
          size="small"
          variant="filled"
        />
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Throughput Metrics */}
        <Grid item xs={12} sm={6}>
          <Card 
            elevation={0}
            sx={{ 
              height: '100%',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              border: '1px solid rgba(25, 118, 210, 0.3)'
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <SpeedIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Throughput
                </Typography>
              </Stack>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>
                  {formatRate(metrics.messagesPerSecond)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Messages per second
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((metrics.messagesPerSecond / 100) * 100, 100)}
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(25, 118, 210, 0.2)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'primary.main'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Processing Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Connection Metrics */}
        <Grid item xs={12} sm={6}>
          <Card 
            elevation={0}
            sx={{ 
              height: '100%',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <PeopleIcon color="success" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Connections
                </Typography>
              </Stack>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                  {metrics.connectedClients}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active clients
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Connection #{connectionStatus.connectionCount}
                  </Typography>
                  {connectionStatus.lastConnected && (
                    <Typography variant="caption" color="text.secondary">
                      Last connected: {new Date(connectionStatus.lastConnected).toLocaleTimeString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Uptime */}
        <Grid item xs={12} sm={6}>
          <Card 
            elevation={0}
            sx={{ 
              height: '100%',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgba(255, 152, 0, 0.3)'
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <TimerIcon color="warning" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Uptime
                </Typography>
              </Stack>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>
                  {formatUptime(metrics.uptime)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  System running time
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total processed: {formatLargeNumber(metrics.messagesProcessed)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Partition Distribution */}
        <Grid item xs={12} sm={6}>
          <Card 
            elevation={0}
            sx={{ 
              height: '100%',
              backgroundColor: 'rgba(156, 39, 176, 0.1)',
              border: '1px solid rgba(156, 39, 176, 0.3)'
            }}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <PartitionIcon sx={{ color: '#9c27b0' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Partitions
                </Typography>
              </Stack>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 600, mb: 1 }}>
                  {totalPartitions}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Active partitions
                </Typography>
                
                {partitionEntries.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Latest Offsets:
                    </Typography>
                    <Stack spacing={0.5}>
                      {partitionEntries.slice(0, 3).map(([partition, offset]) => (
                        <Box key={partition} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            P{partition}:
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {offset}
                          </Typography>
                        </Box>
                      ))}
                      {partitionEntries.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{partitionEntries.length - 3} more...
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Display */}
      {connectionStatus.error && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'error.dark', borderRadius: 1 }}>
          <Typography variant="body2" color="error.contrastText">
            <strong>Connection Error:</strong> {connectionStatus.error}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MetricsPanel;
