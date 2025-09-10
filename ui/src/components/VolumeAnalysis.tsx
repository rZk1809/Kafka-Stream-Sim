import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  LineChart
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  VolumeUp as VolumeIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

interface VolumeMetrics {
  symbol: string;
  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;
  volumeRank: number;
  priceVolumeCorrelation: number;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  volumeProfile: 'high' | 'medium' | 'low';
}

const VolumeAnalysis: React.FC = () => {
  const { state } = useAppContext();
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'ratio' | 'correlation'>('volume');
  const [sortBy, setSortBy] = useState<'volume' | 'ratio' | 'correlation'>('volume');

  // Convert stockData object to array for easier processing
  const stockDataArray = Object.entries(state.stockData).map(([symbol, data]) => ({
    ...data,
    symbol
  }));

  // Calculate volume metrics for all stocks
  const volumeMetrics = useMemo((): VolumeMetrics[] => {
    if (stockDataArray.length === 0) {
      return [];
    }

    return stockDataArray.map((stock, index) => {
      // Generate mock historical average (in real app, this would come from API)
      const averageVolume = stock.totalVolume * (0.8 + Math.random() * 0.4);
      const volumeRatio = stock.totalVolume / averageVolume;

      // Mock price-volume correlation
      const priceVolumeCorrelation = -0.5 + Math.random(); // -0.5 to 0.5

      // Determine volume trend based on ratio
      let volumeTrend: VolumeMetrics['volumeTrend'] = 'stable';
      if (volumeRatio > 1.2) {
        volumeTrend = 'increasing';
      } else if (volumeRatio < 0.8) {
        volumeTrend = 'decreasing';
      }

      // Determine volume profile
      let volumeProfile: VolumeMetrics['volumeProfile'] = 'medium';
      if (stock.totalVolume > 1000000) {
        volumeProfile = 'high';
      } else if (stock.totalVolume < 100000) {
        volumeProfile = 'low';
      }

      return {
        symbol: stock.symbol,
        currentVolume: stock.totalVolume,
        averageVolume: Math.round(averageVolume),
        volumeRatio,
        volumeRank: index + 1,
        priceVolumeCorrelation,
        volumeTrend,
        volumeProfile
      };
    }).sort((a, b) => {
      switch (sortBy) {
        case 'ratio':
          return b.volumeRatio - a.volumeRatio;
        case 'correlation':
          return Math.abs(b.priceVolumeCorrelation) - Math.abs(a.priceVolumeCorrelation);
        default:
          return b.currentVolume - a.currentVolume;
      }
    });
  }, [stockDataArray, sortBy]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return volumeMetrics.slice(0, 10).map(metric => ({
      symbol: metric.symbol,
      volume: metric.currentVolume,
      avgVolume: metric.averageVolume,
      ratio: metric.volumeRatio,
      correlation: metric.priceVolumeCorrelation
    }));
  }, [volumeMetrics]);

  // Volume distribution data for pie chart
  const volumeDistribution = useMemo(() => {
    const high = volumeMetrics.filter(m => m.volumeProfile === 'high').length;
    const medium = volumeMetrics.filter(m => m.volumeProfile === 'medium').length;
    const low = volumeMetrics.filter(m => m.volumeProfile === 'low').length;

    return [
      { name: 'High Volume', value: high, color: '#4caf50' },
      { name: 'Medium Volume', value: medium, color: '#ff9800' },
      { name: 'Low Volume', value: low, color: '#f44336' }
    ];
  }, [volumeMetrics]);

  const formatVolume = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const getTrendIcon = (trend: VolumeMetrics['volumeTrend']) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUpIcon color="success" fontSize="small" />;
      case 'decreasing':
        return <TrendingDownIcon color="error" fontSize="small" />;
      default:
        return <VolumeIcon color="action" fontSize="small" />;
    }
  };

  const getTrendColor = (trend: VolumeMetrics['volumeTrend']) => {
    switch (trend) {
      case 'increasing':
        return 'success';
      case 'decreasing':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProfileColor = (profile: VolumeMetrics['volumeProfile']) => {
    switch (profile) {
      case 'high':
        return 'success';
      case 'low':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (stockDataArray.length === 0) {
    return (
      <Alert severity="info">
        No market data available. Volume analysis will appear once market data is loaded.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Volume Analysis
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Volume
              </Typography>
              <Typography variant="h5">
                {formatVolume(volumeMetrics.reduce((sum, m) => sum + m.currentVolume, 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                High Volume Stocks
              </Typography>
              <Typography variant="h5" color="success.main">
                {volumeMetrics.filter(m => m.volumeProfile === 'high').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Volume Ratio
              </Typography>
              <Typography variant="h5">
                {(volumeMetrics.reduce((sum, m) => sum + m.volumeRatio, 0) / volumeMetrics.length).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Increasing Volume
              </Typography>
              <Typography variant="h5" color="success.main">
                {volumeMetrics.filter(m => m.volumeTrend === 'increasing').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Chart Metric</InputLabel>
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
            >
              <MenuItem value="volume">Current Volume</MenuItem>
              <MenuItem value="ratio">Volume Ratio</MenuItem>
              <MenuItem value="correlation">Price-Volume Correlation</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <MenuItem value="volume">Volume</MenuItem>
              <MenuItem value="ratio">Volume Ratio</MenuItem>
              <MenuItem value="correlation">Correlation</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Volume Comparison (Top 10)
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  {selectedMetric === 'volume' ? (
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="symbol" />
                      <YAxis tickFormatter={formatVolume} />
                      <Tooltip formatter={(value: number) => formatVolume(value)} />
                      <Legend />
                      <Bar dataKey="volume" fill="#1976d2" name="Current Volume" />
                      <Bar dataKey="avgVolume" fill="#ff9800" name="Average Volume" />
                    </ComposedChart>
                  ) : selectedMetric === 'ratio' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="symbol" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [value.toFixed(2), 'Ratio']} />
                      <Bar dataKey="ratio" fill="#4caf50" name="Volume Ratio" />
                    </BarChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="symbol" />
                      <YAxis domain={[-1, 1]} />
                      <Tooltip formatter={(value: number) => [value.toFixed(3), 'Correlation']} />
                      <Bar dataKey="correlation" fill="#9c27b0" name="Price-Volume Correlation" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Volume Distribution
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={volumeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {volumeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Volume Metrics Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detailed Volume Metrics
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Current Volume</TableCell>
                  <TableCell align="right">Avg Volume</TableCell>
                  <TableCell align="right">Ratio</TableCell>
                  <TableCell align="center">Trend</TableCell>
                  <TableCell align="center">Profile</TableCell>
                  <TableCell align="right">Correlation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {volumeMetrics.slice(0, 15).map((metric) => (
                  <TableRow key={metric.symbol}>
                    <TableCell component="th" scope="row">
                      <Typography fontWeight="bold">{metric.symbol}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatVolume(metric.currentVolume)}
                    </TableCell>
                    <TableCell align="right">
                      {formatVolume(metric.averageVolume)}
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end">
                        {metric.volumeRatio.toFixed(2)}x
                        {metric.volumeRatio > 1 && (
                          <Box ml={1} width="50px">
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(100, (metric.volumeRatio - 1) * 100)} 
                              color="success"
                            />
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center">
                        {getTrendIcon(metric.volumeTrend)}
                        <Chip
                          label={metric.volumeTrend}
                          color={getTrendColor(metric.volumeTrend)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={metric.volumeProfile}
                        color={getProfileColor(metric.volumeProfile)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        color={Math.abs(metric.priceVolumeCorrelation) > 0.3 ? 'primary' : 'textSecondary'}
                      >
                        {metric.priceVolumeCorrelation.toFixed(3)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VolumeAnalysis;
