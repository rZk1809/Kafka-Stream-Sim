import React from 'react';
import { 
  Grid, 
  Paper, 
  Box, 
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useStockData, useMarketData } from '../hooks/useStockData';
import { useAppContext } from '../context/AppContext';
import StockChart from './StockChart';
import MessageTable from './MessageTable';
import MetricsPanel from './MetricsPanel';
import SymbolFilter from './SymbolFilter';
import { STOCK_SYMBOLS } from '../types';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state, actions } = useAppContext();
  const { filteredStockData, filteredTicks } = useStockData();
  const { marketStats } = useMarketData();

  const handleSymbolSelectionChange = (symbols: string[]) => {
    actions.setSelectedSymbols(symbols);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          component="h2" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            mb: 2
          }}
        >
          Real-time Stock Market Dashboard
        </Typography>
        
        {/* Market Summary */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 2, 
            mb: 3,
            backgroundColor: 'background.paper',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary.main">
                  {marketStats.totalSymbols}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Symbols
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  {marketStats.gainers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gainers
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="error.main">
                  {marketStats.losers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Losers
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="text.primary">
                  {marketStats.unchanged}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unchanged
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Controls */}
        <SymbolFilter
          availableSymbols={STOCK_SYMBOLS}
          selectedSymbols={state.selectedSymbols}
          onSelectionChange={handleSymbolSelectionChange}
        />
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Stock Charts */}
        {state.selectedSymbols.map((symbol) => {
          const stockData = filteredStockData[symbol];
          if (!stockData) return null;

          return (
            <Grid item xs={12} lg={6} key={symbol}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2,
                  height: 400,
                  backgroundColor: 'background.paper',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <StockChart
                  symbol={symbol}
                  data={stockData}
                  timeRange={state.timeRange}
                  showVolume={true}
                  height={350}
                />
              </Paper>
            </Grid>
          );
        })}

        {/* Metrics Panel */}
        <Grid item xs={12} lg={6}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2,
              height: 400,
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <MetricsPanel
              metrics={state.metrics}
              connectionStatus={state.connectionStatus}
            />
          </Paper>
        </Grid>

        {/* Message Table */}
        <Grid item xs={12} lg={6}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2,
              height: 400,
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <MessageTable
              ticks={filteredTicks}
              maxRows={10}
              onSymbolFilter={(symbol) => {
                if (!state.selectedSymbols.includes(symbol)) {
                  actions.setSelectedSymbols([...state.selectedSymbols, symbol]);
                }
              }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
