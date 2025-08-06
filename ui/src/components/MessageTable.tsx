import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { FilterList as FilterIcon } from '@mui/icons-material';
import { MessageTableProps, SYMBOL_COLORS } from '@/types';
import { 
  formatPrice, 
  formatVolume, 
  formatTimestamp, 
  formatPartitionOffset,
  getTrendIndicator
} from '@/utils/formatters';

const MessageTable: React.FC<MessageTableProps> = ({
  ticks,
  maxRows = 10,
  onSymbolFilter
}) => {
  const theme = useTheme();

  // Sort ticks by timestamp (most recent first) and limit
  const displayTicks = useMemo(() => {
    return [...ticks]
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, maxRows);
  }, [ticks, maxRows]);

  // Calculate trend for each tick
  const ticksWithTrend = useMemo(() => {
    return displayTicks.map((tick, index) => {
      // Find previous tick for the same symbol
      const previousTick = displayTicks
        .slice(index + 1)
        .find(t => t.symbol === tick.symbol);
      
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (previousTick) {
        if (tick.price > previousTick.price) trend = 'up';
        else if (tick.price < previousTick.price) trend = 'down';
      }
      
      return { ...tick, trend };
    });
  }, [displayTicks]);

  const handleSymbolClick = (symbol: string) => {
    if (onSymbolFilter) {
      onSymbolFilter(symbol);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
          Live Message Feed
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {ticks.length} total messages
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer sx={{ flexGrow: 1, maxHeight: '300px' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Symbol</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Price</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Volume</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Trend</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Partition</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ticksWithTrend.length > 0 ? (
              ticksWithTrend.map((tick, index) => {
                const symbolColors = SYMBOL_COLORS[tick.symbol] || SYMBOL_COLORS.AAPL;
                
                return (
                  <TableRow 
                    key={`${tick.symbol}-${tick.timestamp}-${index}`}
                    hover
                    sx={{ 
                      '&:nth-of-type(odd)': { 
                        backgroundColor: 'rgba(255, 255, 255, 0.02)' 
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatTimestamp(tick.receivedAt, 'time')}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={tick.symbol}
                        size="small"
                        sx={{
                          backgroundColor: symbolColors.background,
                          color: symbolColors.primary,
                          fontWeight: 600,
                          minWidth: '60px'
                        }}
                      />
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace',
                          fontWeight: 500
                        }}
                      >
                        {formatPrice(tick.price)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace',
                          color: 'text.secondary'
                        }}
                      >
                        {formatVolume(tick.volume)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography
                        variant="body1"
                        sx={{
                          color: tick.trend === 'up' 
                            ? 'success.main' 
                            : tick.trend === 'down' 
                            ? 'error.main' 
                            : 'text.secondary',
                          fontSize: '1.2rem'
                        }}
                      >
                        {getTrendIndicator(tick.trend)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontFamily: 'monospace',
                          color: 'text.secondary',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {formatPartitionOffset(tick.partition, tick.offset)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Tooltip title={`Filter by ${tick.symbol}`}>
                        <IconButton
                          size="small"
                          onClick={() => handleSymbolClick(tick.symbol)}
                          sx={{ 
                            color: 'text.secondary',
                            '&:hover': {
                              color: symbolColors.primary
                            }
                          }}
                        >
                          <FilterIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No messages received yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Waiting for real-time stock data...
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer */}
      {ticksWithTrend.length > 0 && (
        <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Showing {Math.min(maxRows, ticks.length)} of {ticks.length} messages
            {ticks.length > maxRows && ` (${ticks.length - maxRows} more)`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MessageTable;
