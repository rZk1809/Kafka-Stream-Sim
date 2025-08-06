import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Format price with currency symbol and appropriate decimal places
 */
export const formatPrice = (price: number): string => {
  if (typeof price !== 'number' || isNaN(price)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

/**
 * Format price change with sign and color indication
 */
export const formatPriceChange = (change: number): { 
  formatted: string; 
  color: 'success' | 'error' | 'text'; 
  sign: '+' | '-' | '';
} => {
  if (typeof change !== 'number' || isNaN(change)) {
    return { formatted: '$0.00', color: 'text', sign: '' };
  }

  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  const color = change > 0 ? 'success' : change < 0 ? 'error' : 'text';
  const formatted = formatPrice(Math.abs(change));

  return { formatted, color, sign };
};

/**
 * Format percentage change with sign and color indication
 */
export const formatPercentageChange = (percentage: number): {
  formatted: string;
  color: 'success' | 'error' | 'text';
  sign: '+' | '-' | '';
} => {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return { formatted: '0.00%', color: 'text', sign: '' };
  }

  const sign = percentage > 0 ? '+' : percentage < 0 ? '-' : '';
  const color = percentage > 0 ? 'success' : percentage < 0 ? 'error' : 'text';
  const formatted = `${Math.abs(percentage).toFixed(2)}%`;

  return { formatted, color, sign };
};

/**
 * Format volume with appropriate units (K, M, B)
 */
export const formatVolume = (volume: number): string => {
  if (typeof volume !== 'number' || isNaN(volume)) {
    return '0';
  }

  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(1)}B`;
  } else if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  
  return volume.toLocaleString();
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: string | Date, formatType: 'full' | 'time' | 'relative' = 'time'): string => {
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
    
    if (!isValid(date)) {
      return 'Invalid date';
    }

    switch (formatType) {
      case 'full':
        return format(date, 'MMM dd, yyyy HH:mm:ss');
      case 'time':
        return format(date, 'HH:mm:ss.SSS');
      case 'relative':
        return formatDistanceToNow(date, { addSuffix: true });
      default:
        return format(date, 'HH:mm:ss');
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
};

/**
 * Format uptime duration
 */
export const formatUptime = (milliseconds: number): string => {
  if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds < 0) {
    return '0s';
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Format large numbers with appropriate units
 */
export const formatLargeNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0';
  }

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  
  return num.toLocaleString();
};

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes: number): string => {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format partition and offset information
 */
export const formatPartitionOffset = (partition: number, offset: string): string => {
  return `P${partition}:O${offset}`;
};

/**
 * Get trend indicator symbol
 */
export const getTrendIndicator = (trend: 'up' | 'down' | 'neutral'): string => {
  switch (trend) {
    case 'up':
      return '↗';
    case 'down':
      return '↘';
    case 'neutral':
    default:
      return '→';
  }
};

/**
 * Calculate price change percentage
 */
export const calculatePriceChangePercentage = (currentPrice: number, previousPrice: number): number => {
  if (typeof currentPrice !== 'number' || typeof previousPrice !== 'number' || 
      isNaN(currentPrice) || isNaN(previousPrice) || previousPrice === 0) {
    return 0;
  }

  return ((currentPrice - previousPrice) / previousPrice) * 100;
};

/**
 * Determine trend based on price change
 */
export const determineTrend = (priceChange: number): 'up' | 'down' | 'neutral' => {
  if (priceChange > 0) return 'up';
  if (priceChange < 0) return 'down';
  return 'neutral';
};

/**
 * Format connection status
 */
export const formatConnectionStatus = (connected: boolean, reconnecting: boolean): {
  status: string;
  color: 'success' | 'warning' | 'error';
} => {
  if (connected) {
    return { status: 'Connected', color: 'success' };
  } else if (reconnecting) {
    return { status: 'Reconnecting...', color: 'warning' };
  } else {
    return { status: 'Disconnected', color: 'error' };
  }
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (typeof text !== 'string') {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format messages per second rate
 */
export const formatRate = (rate: number): string => {
  if (typeof rate !== 'number' || isNaN(rate)) {
    return '0 msg/s';
  }
  
  return `${rate.toLocaleString()} msg/s`;
};

/**
 * Safe number parsing with fallback
 */
export const safeParseNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  
  return fallback;
};

/**
 * Safe string parsing with fallback
 */
export const safeParseString = (value: unknown, fallback: string = ''): string => {
  if (typeof value === 'string') {
    return value;
  }
  
  if (value !== null && value !== undefined) {
    return String(value);
  }
  
  return fallback;
};
