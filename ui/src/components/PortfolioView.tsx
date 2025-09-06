import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  AccountBalance,
  History,
  PieChart
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { Position, Trade } from '../types';

interface PortfolioViewProps {
  className?: string;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ className }) => {
  const { state } = useAppContext();
  const [activeTab, setActiveTab] = useState(0);
  const { portfolio } = state;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getPositionColor = (pnl: number) => {
    if (pnl > 0) return 'success.main';
    if (pnl < 0) return 'error.main';
    return 'text.secondary';
  };

  const getTrendIcon = (pnl: number) => {
    if (pnl > 0) return <TrendingUp fontSize="small" />;
    if (pnl < 0) return <TrendingDown fontSize="small" />;
    return null;
  };

  const getPortfolioAllocation = () => {
    const totalValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    return portfolio.positions.map(pos => ({
      ...pos,
      allocation: totalValue > 0 ? (pos.marketValue / totalValue) * 100 : 0
    }));
  };

  const recentTrades = portfolio.trades
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return (
    <Box className={className}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Portfolio Overview
      </Typography>

      {/* Portfolio Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalance color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Total Value
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={600}>
                {formatCurrency(portfolio.totalValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cash: {formatCurrency(portfolio.cash)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShowChart color={portfolio.totalPnL >= 0 ? 'success' : 'error'} sx={{ mr: 1 }} />
                <Typography variant="h6" color={portfolio.totalPnL >= 0 ? 'success.main' : 'error.main'}>
                  Total P&L
                </Typography>
              </Box>
              <Typography 
                variant="h4" 
                fontWeight={600}
                color={portfolio.totalPnL >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(portfolio.totalPnL)}
              </Typography>
              <Typography 
                variant="body2" 
                color={portfolio.totalPnL >= 0 ? 'success.main' : 'error.main'}
              >
                {formatPercent(portfolio.totalPnLPercent)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PieChart color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Positions
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={600}>
                {portfolio.positions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active holdings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <History color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Trades
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={600}>
                {portfolio.trades.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total executed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Paper elevation={0} sx={{ border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}
        >
          <Tab label="Positions" />
          <Tab label="Recent Trades" />
          <Tab label="Allocation" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Positions Tab */}
          {activeTab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Avg Price</TableCell>
                    <TableCell align="right">Current Price</TableCell>
                    <TableCell align="right">Market Value</TableCell>
                    <TableCell align="right">P&L</TableCell>
                    <TableCell align="right">P&L %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portfolio.positions.map((position) => (
                    <TableRow key={position.symbol}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body1" fontWeight={600}>
                            {position.symbol}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(position.quantity)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(position.averagePrice)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(position.currentPrice)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(position.marketValue)}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {getTrendIcon(position.unrealizedPnL)}
                          <Typography 
                            variant="body2" 
                            color={getPositionColor(position.unrealizedPnL)}
                            sx={{ ml: 0.5 }}
                          >
                            {formatCurrency(position.unrealizedPnL)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          color={getPositionColor(position.unrealizedPnL)}
                        >
                          {formatPercent(position.unrealizedPnLPercent)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {portfolio.positions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No positions found. Start trading to build your portfolio!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Recent Trades Tab */}
          {activeTab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>
                        {new Date(trade.timestamp).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {trade.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trade.type.toUpperCase()}
                          color={trade.type === 'buy' ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(trade.quantity)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(trade.price)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(trade.quantity * trade.price)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trade.status}
                          color={trade.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentTrades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No trades found. Start trading to see your transaction history!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Allocation Tab */}
          {activeTab === 2 && (
            <Box>
              {getPortfolioAllocation().map((position) => (
                <Box key={position.symbol} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {position.symbol}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {position.allocation.toFixed(1)}% • {formatCurrency(position.marketValue)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={position.allocation}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        backgroundColor: position.unrealizedPnL >= 0 ? 'success.main' : 'error.main'
                      }
                    }}
                  />
                </Box>
              ))}
              {portfolio.positions.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  No positions to show allocation. Start trading to build your portfolio!
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default PortfolioView;
