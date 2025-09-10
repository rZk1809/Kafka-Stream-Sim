import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { useAppContext } from '../context/AppContext';

interface HistoricalDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  symbol: string;
}

type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type ChartType = 'line' | 'area' | 'candlestick';

const HistoricalCharts: React.FC = () => {
  const { state } = useAppContext();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('5m');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);

  // Convert stockData object to array for easier processing
  const stockDataArray = Object.entries(state.stockData).map(([symbol, data]) => ({
    ...data,
    symbol
  }));

  // Generate mock historical data based on current market data
  const generateHistoricalData = (symbol: string, timeframe: TimeFrame): HistoricalDataPoint[] => {
    const currentStock = state.stockData[symbol];
    if (!currentStock) {
      return [];
    }

    const now = Date.now();
    const intervals = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    const dataPoints = {
      '1m': 60,
      '5m': 48,
      '15m': 32,
      '1h': 24,
      '4h': 18,
      '1d': 30
    };

    const interval = intervals[timeframe];
    const numPoints = dataPoints[timeframe];
    const data: HistoricalDataPoint[] = [];

    let currentPrice = currentStock.currentPrice;
    let currentVolume = currentStock.totalVolume;

    for (let i = numPoints - 1; i >= 0; i--) {
      const timestamp = now - (i * interval);
      
      // Generate realistic price movement
      const volatility = 0.02; // 2% volatility
      const priceChange = (Math.random() - 0.5) * volatility * currentPrice;
      const newPrice = Math.max(0.01, currentPrice + priceChange);
      
      // Generate OHLC data
      const open = i === numPoints - 1 ? currentPrice : data[data.length - 1]?.close || currentPrice;
      const close = newPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      // Generate volume
      const volumeVariation = (Math.random() - 0.5) * 0.5;
      const volume = Math.max(1000, currentVolume * (1 + volumeVariation));

      data.push({
        timestamp,
        price: close,
        volume: Math.round(volume),
        high,
        low,
        open,
        close,
        symbol
      });

      currentPrice = newPrice;
      currentVolume = volume;
    }

    return data.reverse();
  };

  // Update historical data when symbol or timeframe changes
  useEffect(() => {
    if (selectedSymbol) {
      const data = generateHistoricalData(selectedSymbol, timeFrame);
      setHistoricalData(data);
    }
  }, [selectedSymbol, timeFrame, state.stockData]);

  // Set default symbol when market data is available
  useEffect(() => {
    if (stockDataArray.length > 0 && !selectedSymbol && stockDataArray[0]) {
      setSelectedSymbol(stockDataArray[0].symbol);
    }
  }, [stockDataArray, selectedSymbol]);

  const chartData = useMemo(() => {
    return historicalData.map(point => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      date: new Date(point.timestamp).toLocaleDateString()
    }));
  }, [historicalData]);

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;
  const formatVolume = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const currentStock = state.stockData[selectedSymbol];
  const firstDataPoint = historicalData[0];
  const priceChange = currentStock && firstDataPoint
    ? currentStock.currentPrice - firstDataPoint.price
    : 0;
  const priceChangePercent = firstDataPoint
    ? (priceChange / firstDataPoint.price) * 100
    : 0;

  const renderChart = () => {
    if (chartData.length === 0) {
      return <div>No data available</div>;
    }

    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={formatPrice} />
            <Tooltip 
              formatter={(value: number) => [formatPrice(value), 'Price']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#1976d2" 
              fill="#1976d2" 
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'candlestick':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={formatPrice} />
            <Tooltip 
              formatter={(value: number, name: string) => [formatPrice(value), name]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line type="monotone" dataKey="high" stroke="#4caf50" name="High" strokeWidth={1} />
            <Line type="monotone" dataKey="low" stroke="#f44336" name="Low" strokeWidth={1} />
            <Line type="monotone" dataKey="open" stroke="#ff9800" name="Open" strokeWidth={2} />
            <Line type="monotone" dataKey="close" stroke="#2196f3" name="Close" strokeWidth={2} />
          </LineChart>
        );

      default: // line
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={formatPrice} />
            <Tooltip 
              formatter={(value: number) => [formatPrice(value), 'Price']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#1976d2" 
              strokeWidth={2}
              dot={false}
              name="Price"
            />
            {firstDataPoint && (
              <ReferenceLine
                y={firstDataPoint.price}
                stroke="#666"
                strokeDasharray="5 5"
                label="Start Price"
              />
            )}
          </LineChart>
        );
    }
  };

  if (stockDataArray.length === 0) {
    return (
      <Alert severity="info">
        No market data available. Historical charts will appear once market data is loaded.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Historical Price Charts
      </Typography>

      {/* Controls */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Stock Symbol</InputLabel>
            <Select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              {stockDataArray.map(stock => (
                <MenuItem key={stock.symbol} value={stock.symbol}>
                  {stock.symbol}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <ToggleButtonGroup
            value={timeFrame}
            exclusive
            onChange={(_, value) => value && setTimeFrame(value)}
            size="small"
          >
            <ToggleButton value="1m">1m</ToggleButton>
            <ToggleButton value="5m">5m</ToggleButton>
            <ToggleButton value="15m">15m</ToggleButton>
            <ToggleButton value="1h">1h</ToggleButton>
            <ToggleButton value="4h">4h</ToggleButton>
            <ToggleButton value="1d">1d</ToggleButton>
          </ToggleButtonGroup>
        </Grid>

        <Grid item xs={12} sm={4}>
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={(_, value) => value && setChartType(value)}
            size="small"
          >
            <ToggleButton value="line">Line</ToggleButton>
            <ToggleButton value="area">Area</ToggleButton>
            <ToggleButton value="candlestick">OHLC</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>

      {/* Price Summary */}
      {currentStock && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Typography variant="h6">{selectedSymbol}</Typography>
                <Typography variant="h4" color="primary">
                  {formatPrice(currentStock.currentPrice)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography color="textSecondary">Change</Typography>
                <Typography 
                  variant="h6" 
                  color={priceChange >= 0 ? 'success.main' : 'error.main'}
                >
                  {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography color="textSecondary">Change %</Typography>
                <Typography 
                  variant="h6" 
                  color={priceChangePercent >= 0 ? 'success.main' : 'error.main'}
                >
                  {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography color="textSecondary">Volume</Typography>
                <Typography variant="h6">
                  {formatVolume(currentStock.totalVolume)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selectedSymbol} - {timeFrame} Chart
          </Typography>
          <Box height={400}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Volume
          </Typography>
          <Box height={200}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={formatVolume} />
                <Tooltip 
                  formatter={(value: number) => [formatVolume(value), 'Volume']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#ff9800" 
                  fill="#ff9800" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HistoricalCharts;
