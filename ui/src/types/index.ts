// Stock tick data structure
export interface StockTick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
  partition: number;
  offset: string;
  receivedAt: string;
  trend?: 'up' | 'down' | 'neutral';
}

// Aggregated stock data for charts
export interface StockData {
  symbol: string;
  prices: PricePoint[];
  volumes: VolumePoint[];
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  totalVolume: number;
  lastUpdate: string;
  trend: 'up' | 'down' | 'neutral';
}

// Price point for time series charts
export interface PricePoint {
  timestamp: string;
  price: number;
}

// Volume point for volume charts
export interface VolumePoint {
  timestamp: string;
  volume: number;
}

// Kafka metrics from WebSocket bridge
export interface KafkaMetrics {
  messagesProcessed: number;
  messagesPerSecond: number;
  connectedClients: number;
  partitionOffsets: Record<string, string>;
  lastMessageTime: string | null;
  uptime: number;
}

// WebSocket connection status
export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  lastConnected: string | null;
  connectionCount: number;
}

// Application state
export interface AppState {
  stockData: Record<string, StockData>;
  recentTicks: StockTick[];
  metrics: KafkaMetrics;
  connectionStatus: ConnectionStatus;
  selectedSymbols: string[];
  timeRange: TimeRange;
  isLoading: boolean;
  error: string | null;
  // New features
  portfolio: Portfolio;
  alerts: Alert[];
  marketSummary: MarketSummary;
  historicalData: Record<string, HistoricalData>;
  theme: 'light' | 'dark';
  currentView: 'dashboard' | 'trading' | 'portfolio' | 'alerts' | 'history' | 'volume';
}

// Time range for charts
export interface TimeRange {
  label: string;
  minutes: number;
}

// Chart configuration
export interface ChartConfig {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation: boolean;
  pointRadius: number;
  borderWidth: number;
}

// Filter options
export interface FilterOptions {
  symbols: string[];
  timeRange: TimeRange;
  showVolume: boolean;
  autoRefresh: boolean;
}

// Action types for useReducer
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_STOCK_TICK'; payload: StockTick }
  | { type: 'UPDATE_METRICS'; payload: KafkaMetrics }
  | { type: 'SET_CONNECTION_STATUS'; payload: Partial<ConnectionStatus> }
  | { type: 'SET_SELECTED_SYMBOLS'; payload: string[] }
  | { type: 'SET_TIME_RANGE'; payload: TimeRange }
  | { type: 'CLEAR_DATA' }
  | { type: 'INITIALIZE_STOCK_DATA'; payload: string[] }
  // New actions for enhanced features
  | { type: 'ADD_TRADE'; payload: Trade }
  | { type: 'UPDATE_PORTFOLIO'; payload: Portfolio }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'UPDATE_ALERT'; payload: { id: string; updates: Partial<Alert> } }
  | { type: 'REMOVE_ALERT'; payload: string }
  | { type: 'UPDATE_MARKET_SUMMARY'; payload: MarketSummary }
  | { type: 'SET_HISTORICAL_DATA'; payload: { symbol: string; data: HistoricalData } }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_CURRENT_VIEW'; payload: 'dashboard' | 'trading' | 'portfolio' | 'alerts' | 'history' | 'volume' };

// Theme configuration
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
}

// Component props interfaces
export interface DashboardProps {
  className?: string;
}

export interface StockChartProps {
  symbol: string;
  data: StockData;
  timeRange: TimeRange;
  showVolume?: boolean;
  height?: number;
}

export interface MessageTableProps {
  ticks: StockTick[];
  maxRows?: number;
  onSymbolFilter?: (symbol: string) => void;
}

export interface MetricsPanelProps {
  metrics: KafkaMetrics;
  connectionStatus: ConnectionStatus;
}

export interface SymbolFilterProps {
  availableSymbols: readonly string[];
  selectedSymbols: string[];
  onSelectionChange: (symbols: string[]) => void;
}

export interface ConnectionStatusProps {
  status: ConnectionStatus;
  onReconnect?: () => void;
}

// Utility types
export type SymbolColor = {
  [key: string]: {
    primary: string;
    secondary: string;
    background: string;
  };
};

export type ChartDataset = {
  label: string;
  data: Array<{ x: string; y: number }>;
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension: number;
};

// Error boundary types
export interface ErrorInfo {
  componentStack: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Socket event types
export interface SocketEvents {
  'stock-tick': (data: StockTick) => void;
  'metrics': (data: KafkaMetrics) => void;
  'connect': () => void;
  'disconnect': () => void;
  'connect_error': (error: Error) => void;
  'reconnect': (attemptNumber: number) => void;
  'reconnect_attempt': (attemptNumber: number) => void;
  'reconnect_error': (error: Error) => void;
  'reconnect_failed': () => void;
}

// Trading and Portfolio types
export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  lastUpdate: string;
}

export interface Portfolio {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  positions: Position[];
  trades: Trade[];
  cash: number;
  lastUpdate: string;
}

export interface Alert {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'volume_above';
  value: number;
  currentValue: number;
  isActive: boolean;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

export interface MarketSummary {
  indices: {
    name: string;
    value: number;
    change: number;
    changePercent: number;
  }[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  volatility: 'low' | 'medium' | 'high';
  volume: number;
  advancers: number;
  decliners: number;
}

export interface HistoricalData {
  symbol: string;
  timeframe: '1h' | '1d' | '1w' | '1m';
  data: {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

// Constants
export const STOCK_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'] as const;
export type StockSymbol = typeof STOCK_SYMBOLS[number];

export const TIME_RANGES: TimeRange[] = [
  { label: '1 minute', minutes: 1 },
  { label: '5 minutes', minutes: 5 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 }
];

export const DEFAULT_TIME_RANGE: TimeRange = { label: '5 minutes', minutes: 5 };

// Chart colors for different symbols
export const SYMBOL_COLORS: SymbolColor = {
  AAPL: {
    primary: '#007AFF',
    secondary: '#5AC8FA',
    background: 'rgba(0, 122, 255, 0.1)'
  },
  GOOGL: {
    primary: '#34A853',
    secondary: '#66BB6A',
    background: 'rgba(52, 168, 83, 0.1)'
  },
  MSFT: {
    primary: '#00BCF2',
    secondary: '#4FC3F7',
    background: 'rgba(0, 188, 242, 0.1)'
  },
  TSLA: {
    primary: '#E31E24',
    secondary: '#EF5350',
    background: 'rgba(227, 30, 36, 0.1)'
  },
  AMZN: {
    primary: '#FF9900',
    secondary: '#FFB74D',
    background: 'rgba(255, 153, 0, 0.1)'
  }
};
