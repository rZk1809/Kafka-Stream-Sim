import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { 
  Box, 
  Typography, 
  Chip, 
  Stack,
  useTheme
} from '@mui/material';
import { 
  StockChartProps, 
  SYMBOL_COLORS 
} from '@/types';
import { 
  formatPrice, 
  formatPriceChange, 
  formatPercentageChange, 
  formatVolume,
  getTrendIndicator
} from '@/utils/formatters';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const StockChart: React.FC<StockChartProps> = ({
  symbol,
  data,
  timeRange,
  showVolume = false,
  height = 300
}) => {
  const theme = useTheme();
  const symbolColors = SYMBOL_COLORS[symbol] || SYMBOL_COLORS.AAPL;

  // Prepare chart data
  const chartData = useMemo(() => {
    const priceData = data.prices.map(point => ({
      x: point.timestamp,
      y: point.price
    }));

    const volumeData = showVolume ? data.volumes.map(point => ({
      x: point.timestamp,
      y: point.volume
    })) : [];

    return {
      datasets: [
        {
          label: `${symbol} Price`,
          data: priceData,
          borderColor: symbolColors.primary,
          backgroundColor: symbolColors.background,
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: symbolColors.primary,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          yAxisID: 'price'
        },
        ...(showVolume ? [{
          label: `${symbol} Volume`,
          data: volumeData,
          borderColor: symbolColors.secondary,
          backgroundColor: `${symbolColors.secondary}20`,
          borderWidth: 1,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 3,
          yAxisID: 'volume'
        }] : [])
      ]
    };
  }, [data, symbol, symbolColors, showVolume]);

  // Chart options
  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleTimeString();
          },
          label: (context: TooltipItem<'line'>) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (datasetLabel.includes('Price')) {
              return `${datasetLabel}: ${formatPrice(value)}`;
            } else if (datasetLabel.includes('Volume')) {
              return `${datasetLabel}: ${formatVolume(value)}`;
            }
            return `${datasetLabel}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          }
        },
        grid: {
          color: theme.palette.divider,
          lineWidth: 0.5
        },
        ticks: {
          color: theme.palette.text.secondary,
          maxTicksLimit: 8
        }
      },
      price: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: theme.palette.divider,
          lineWidth: 0.5
        },
        ticks: {
          color: theme.palette.text.secondary,
          callback: function(value) {
            return formatPrice(Number(value));
          }
        }
      },
      ...(showVolume ? {
        volume: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: theme.palette.text.secondary,
            callback: function(value: any) {
              return formatVolume(Number(value));
            }
          }
        }
      } : {})
    },
    elements: {
      point: {
        hoverRadius: 6
      }
    },
    animation: {
      duration: 300
    }
  }), [theme, showVolume]);

  // Format price change display
  const priceChangeInfo = formatPriceChange(data.priceChange);
  const percentChangeInfo = formatPercentageChange(data.priceChangePercent);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {symbol}
          </Typography>
          <Chip
            label={data.trend}
            size="small"
            color={data.trend === 'up' ? 'success' : data.trend === 'down' ? 'error' : 'default'}
            icon={<span>{getTrendIndicator(data.trend)}</span>}
          />
        </Stack>
        
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {formatPrice(data.currentPrice)}
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              color: `${priceChangeInfo.color}.main`,
              fontWeight: 500
            }}
          >
            {priceChangeInfo.sign}{priceChangeInfo.formatted}
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              color: `${percentChangeInfo.color}.main`,
              fontWeight: 500
            }}
          >
            ({percentChangeInfo.sign}{percentChangeInfo.formatted})
          </Typography>
          
          {showVolume && (
            <Typography variant="body2" color="text.secondary">
              Vol: {formatVolume(data.totalVolume)}
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Chart */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        {data.prices.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'text.secondary'
            }}
          >
            <Typography variant="body1">
              No data available for {symbol}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default StockChart;
