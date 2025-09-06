import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  AccountBalance,
  SwapHoriz
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import { STOCK_SYMBOLS, Trade, StockSymbol } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface TradingInterfaceProps {
  className?: string;
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({ className }) => {
  const { state, actions } = useAppContext();
  const [selectedSymbol, setSelectedSymbol] = useState<StockSymbol>('AAPL');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<number>(1);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const currentStock = state.stockData[selectedSymbol];
  const currentPrice = currentStock?.currentPrice || 0;
  const totalValue = quantity * (orderType === 'market' ? currentPrice : limitPrice);
  const availableCash = state.portfolio.cash;
  const position = state.portfolio.positions.find(p => p.symbol === selectedSymbol);

  const handlePlaceOrder = () => {
    if (tradeType === 'buy' && totalValue > availableCash) {
      actions.setError('Insufficient funds for this trade');
      return;
    }

    if (tradeType === 'sell' && (!position || position.quantity < quantity)) {
      actions.setError('Insufficient shares to sell');
      return;
    }

    setConfirmDialogOpen(true);
  };

  const confirmOrder = () => {
    const trade: Trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: selectedSymbol,
      type: tradeType,
      quantity,
      price: orderType === 'market' ? currentPrice : limitPrice,
      timestamp: new Date().toISOString(),
      status: 'completed' // In a real app, this would be 'pending' initially
    };

    actions.addTrade(trade);
    setConfirmDialogOpen(false);
    setOrderSuccess(`${tradeType.toUpperCase()} order for ${quantity} shares of ${selectedSymbol} placed successfully!`);
    
    // Reset form
    setQuantity(1);
    setLimitPrice(0);
    
    // Clear success message after 3 seconds
    setTimeout(() => setOrderSuccess(null), 3000);
  };

  const getMaxQuantity = () => {
    if (tradeType === 'sell') {
      return position?.quantity || 0;
    }
    return Math.floor(availableCash / currentPrice);
  };

  return (
    <Box className={className}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Trading Interface
      </Typography>

      {orderSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {orderSuccess}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Order Form */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <Typography variant="h6" gutterBottom>
              Place Order
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Symbol</InputLabel>
                  <Select
                    value={selectedSymbol}
                    label="Symbol"
                    onChange={(e) => setSelectedSymbol(e.target.value as StockSymbol)}
                  >
                    {STOCK_SYMBOLS.map((symbol) => (
                      <MenuItem key={symbol} value={symbol}>
                        {symbol}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Order Type</InputLabel>
                  <Select
                    value={tradeType}
                    label="Order Type"
                    onChange={(e) => setTradeType(e.target.value as 'buy' | 'sell')}
                  >
                    <MenuItem value="buy">Buy</MenuItem>
                    <MenuItem value="sell">Sell</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1, max: getMaxQuantity() }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Price Type</InputLabel>
                  <Select
                    value={orderType}
                    label="Price Type"
                    onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
                  >
                    <MenuItem value="market">Market</MenuItem>
                    <MenuItem value="limit">Limit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {orderType === 'limit' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Limit Price"
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Current Price:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(currentPrice)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Value:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(totalValue)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Available {tradeType === 'buy' ? 'Cash' : 'Shares'}:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {tradeType === 'buy' 
                      ? formatCurrency(availableCash)
                      : formatNumber(position?.quantity || 0)
                    }
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handlePlaceOrder}
                  disabled={
                    quantity <= 0 ||
                    (tradeType === 'buy' && totalValue > availableCash) ||
                    (tradeType === 'sell' && (!position || position.quantity < quantity)) ||
                    (orderType === 'limit' && limitPrice <= 0)
                  }
                  sx={{
                    backgroundColor: tradeType === 'buy' ? 'success.main' : 'error.main',
                    '&:hover': {
                      backgroundColor: tradeType === 'buy' ? 'success.dark' : 'error.dark',
                    }
                  }}
                >
                  {tradeType === 'buy' ? 'Buy' : 'Sell'} {quantity} shares
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Stock Information */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <Typography variant="h6" gutterBottom>
              {selectedSymbol} Information
            </Typography>

            {currentStock && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h4" sx={{ mr: 2 }}>
                    {formatCurrency(currentStock.currentPrice)}
                  </Typography>
                  <Chip
                    icon={currentStock.trend === 'up' ? <TrendingUp /> : <TrendingDown />}
                    label={`${currentStock.priceChange >= 0 ? '+' : ''}${formatCurrency(currentStock.priceChange)} (${currentStock.priceChangePercent.toFixed(2)}%)`}
                    color={currentStock.trend === 'up' ? 'success' : 'error'}
                    variant="outlined"
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Volume
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatNumber(currentStock.totalVolume)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Update
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {new Date(currentStock.lastUpdate).toLocaleTimeString()}
                    </Typography>
                  </Grid>
                </Grid>

                {position && (
                  <Box sx={{ mt: 3, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Your Position
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Shares Owned
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatNumber(position.quantity)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Avg. Price
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(position.averagePrice)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Market Value
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(position.marketValue)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          P&L
                        </Typography>
                        <Typography 
                          variant="body1" 
                          fontWeight={600}
                          color={position.unrealizedPnL >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(position.unrealizedPnL)} ({position.unrealizedPnLPercent.toFixed(2)}%)
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Order</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to place this order?
          </Typography>
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2"><strong>Symbol:</strong> {selectedSymbol}</Typography>
            <Typography variant="body2"><strong>Type:</strong> {tradeType.toUpperCase()}</Typography>
            <Typography variant="body2"><strong>Quantity:</strong> {quantity} shares</Typography>
            <Typography variant="body2"><strong>Price:</strong> {formatCurrency(orderType === 'market' ? currentPrice : limitPrice)}</Typography>
            <Typography variant="body2"><strong>Total:</strong> {formatCurrency(totalValue)}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmOrder} 
            variant="contained"
            color={tradeType === 'buy' ? 'success' : 'error'}
          >
            Confirm {tradeType === 'buy' ? 'Buy' : 'Sell'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TradingInterface;
