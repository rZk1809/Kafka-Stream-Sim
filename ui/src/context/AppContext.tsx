import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  AppState, 
  AppAction, 
  StockData, 
  StockTick, 
  STOCK_SYMBOLS, 
  DEFAULT_TIME_RANGE,
  TimeRange,
  KafkaMetrics,
  ConnectionStatus
} from '../types';
import { calculatePriceChangePercentage, determineTrend } from '../utils/formatters';

// Initial state
const initialState: AppState = {
  stockData: {},
  recentTicks: [],
  metrics: {
    messagesProcessed: 0,
    messagesPerSecond: 0,
    connectedClients: 0,
    partitionOffsets: {},
    lastMessageTime: null,
    uptime: 0
  },
  connectionStatus: {
    connected: false,
    reconnecting: false,
    error: null,
    lastConnected: null,
    connectionCount: 0
  },
  selectedSymbols: [...STOCK_SYMBOLS],
  timeRange: DEFAULT_TIME_RANGE,
  isLoading: false,
  error: null
};

// Helper function to initialize stock data
const initializeStockData = (symbols: string[]): Record<string, StockData> => {
  const stockData: Record<string, StockData> = {};
  
  symbols.forEach(symbol => {
    stockData[symbol] = {
      symbol,
      prices: [],
      volumes: [],
      currentPrice: 0,
      priceChange: 0,
      priceChangePercent: 0,
      totalVolume: 0,
      lastUpdate: new Date().toISOString(),
      trend: 'neutral'
    };
  });
  
  return stockData;
};

// Helper function to update stock data with new tick
const updateStockDataWithTick = (
  currentData: Record<string, StockData>, 
  tick: StockTick, 
  timeRange: TimeRange
): Record<string, StockData> => {
  const { symbol, price, volume, timestamp } = tick;
  const cutoffTime = new Date(Date.now() - timeRange.minutes * 60 * 1000);
  
  const existingData = currentData[symbol] || {
    symbol,
    prices: [],
    volumes: [],
    currentPrice: 0,
    priceChange: 0,
    priceChangePercent: 0,
    totalVolume: 0,
    lastUpdate: timestamp,
    trend: 'neutral' as const
  };

  // Filter out old data points
  const filteredPrices = existingData.prices.filter(
    point => new Date(point.timestamp) > cutoffTime
  );
  const filteredVolumes = existingData.volumes.filter(
    point => new Date(point.timestamp) > cutoffTime
  );

  // Add new data point
  const newPricePoint = { timestamp, price };
  const newVolumePoint = { timestamp, volume };

  const updatedPrices = [...filteredPrices, newPricePoint];
  const updatedVolumes = [...filteredVolumes, newVolumePoint];

  // Calculate price change
  const previousPrice = existingData.currentPrice || price;
  const priceChange = price - previousPrice;
  const priceChangePercent = calculatePriceChangePercentage(price, previousPrice);
  const trend = determineTrend(priceChange);

  // Calculate total volume in time range
  const totalVolume = updatedVolumes.reduce((sum, point) => sum + point.volume, 0);

  return {
    ...currentData,
    [symbol]: {
      symbol,
      prices: updatedPrices,
      volumes: updatedVolumes,
      currentPrice: price,
      priceChange,
      priceChangePercent,
      totalVolume,
      lastUpdate: timestamp,
      trend
    }
  };
};

// Reducer function
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'ADD_STOCK_TICK':
      const tick = action.payload;
      const updatedStockData = updateStockDataWithTick(
        state.stockData, 
        tick, 
        state.timeRange
      );
      
      // Add to recent ticks (keep last 100)
      const updatedRecentTicks = [tick, ...state.recentTicks].slice(0, 100);

      return {
        ...state,
        stockData: updatedStockData,
        recentTicks: updatedRecentTicks,
        error: null
      };

    case 'UPDATE_METRICS':
      return {
        ...state,
        metrics: action.payload
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: {
          ...state.connectionStatus,
          ...action.payload
        }
      };

    case 'SET_SELECTED_SYMBOLS':
      return {
        ...state,
        selectedSymbols: action.payload
      };

    case 'SET_TIME_RANGE':
      // When time range changes, filter existing data
      const newTimeRange = action.payload;
      const cutoffTime = new Date(Date.now() - newTimeRange.minutes * 60 * 1000);
      
      const filteredStockData: Record<string, StockData> = {};
      Object.entries(state.stockData).forEach(([symbol, data]) => {
        const filteredPrices = data.prices.filter(
          point => new Date(point.timestamp) > cutoffTime
        );
        const filteredVolumes = data.volumes.filter(
          point => new Date(point.timestamp) > cutoffTime
        );
        
        const totalVolume = filteredVolumes.reduce((sum, point) => sum + point.volume, 0);
        
        filteredStockData[symbol] = {
          ...data,
          prices: filteredPrices,
          volumes: filteredVolumes,
          totalVolume
        };
      });

      return {
        ...state,
        timeRange: newTimeRange,
        stockData: filteredStockData
      };

    case 'CLEAR_DATA':
      return {
        ...state,
        stockData: initializeStockData(state.selectedSymbols),
        recentTicks: [],
        error: null
      };

    case 'INITIALIZE_STOCK_DATA':
      return {
        ...state,
        stockData: initializeStockData(action.payload)
      };

    default:
      return state;
  }
};

// Context type
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    addStockTick: (tick: StockTick) => void;
    updateMetrics: (metrics: KafkaMetrics) => void;
    setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
    setSelectedSymbols: (symbols: string[]) => void;
    setTimeRange: (timeRange: TimeRange) => void;
    clearData: () => void;
    initializeStockData: (symbols: string[]) => void;
  };
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    stockData: initializeStockData([...STOCK_SYMBOLS])
  });

  // Action creators
  const actions = {
    setLoading: (loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }),
    
    setError: (error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }),
    
    addStockTick: (tick: StockTick) => 
      dispatch({ type: 'ADD_STOCK_TICK', payload: tick }),
    
    updateMetrics: (metrics: KafkaMetrics) => 
      dispatch({ type: 'UPDATE_METRICS', payload: metrics }),
    
    setConnectionStatus: (status: Partial<ConnectionStatus>) => 
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status }),
    
    setSelectedSymbols: (symbols: string[]) => 
      dispatch({ type: 'SET_SELECTED_SYMBOLS', payload: symbols }),
    
    setTimeRange: (timeRange: TimeRange) => 
      dispatch({ type: 'SET_TIME_RANGE', payload: timeRange }),
    
    clearData: () => 
      dispatch({ type: 'CLEAR_DATA' }),
    
    initializeStockData: (symbols: string[]) => 
      dispatch({ type: 'INITIALIZE_STOCK_DATA', payload: symbols })
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    actions
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Selector hooks for specific parts of state
export const useStockData = () => {
  const { state } = useAppContext();
  return state.stockData;
};

export const useRecentTicks = () => {
  const { state } = useAppContext();
  return state.recentTicks;
};

export const useMetrics = () => {
  const { state } = useAppContext();
  return state.metrics;
};

export const useConnectionStatus = () => {
  const { state } = useAppContext();
  return state.connectionStatus;
};

export const useSelectedSymbols = () => {
  const { state } = useAppContext();
  return state.selectedSymbols;
};

export const useTimeRange = () => {
  const { state } = useAppContext();
  return state.timeRange;
};
