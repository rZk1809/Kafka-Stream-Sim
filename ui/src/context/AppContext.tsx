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
  error: null,
  // New features
  portfolio: {
    totalValue: 100000, // Starting with $100k
    totalCost: 0,
    totalPnL: 0,
    totalPnLPercent: 0,
    positions: [],
    trades: [],
    cash: 100000,
    lastUpdate: new Date().toISOString()
  },
  alerts: [],
  marketSummary: {
    indices: [
      { name: 'S&P 500', value: 4500, change: 25.5, changePercent: 0.57 },
      { name: 'NASDAQ', value: 14000, change: -15.2, changePercent: -0.11 },
      { name: 'DOW', value: 35000, change: 125.8, changePercent: 0.36 }
    ],
    sentiment: 'neutral',
    volatility: 'medium',
    volume: 0,
    advancers: 0,
    decliners: 0
  },
  historicalData: {},
  theme: 'dark',
  currentView: 'dashboard'
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

    // New action handlers for enhanced features
    case 'ADD_TRADE':
      const trade = action.payload;
      const updatedTrades = [...state.portfolio.trades, trade];

      // Update portfolio based on trade
      let updatedPositions = [...state.portfolio.positions];
      let updatedCash = state.portfolio.cash;

      const existingPositionIndex = updatedPositions.findIndex(p => p.symbol === trade.symbol);
      const currentStockPrice = state.stockData[trade.symbol]?.currentPrice || trade.price;

      if (trade.type === 'buy') {
        updatedCash -= trade.quantity * trade.price;

        if (existingPositionIndex >= 0) {
          // Update existing position
          const existingPosition = updatedPositions[existingPositionIndex];
          if (existingPosition) {
            const totalQuantity = existingPosition.quantity + trade.quantity;
            const totalCost = (existingPosition.quantity * existingPosition.averagePrice) + (trade.quantity * trade.price);
            const newAveragePrice = totalCost / totalQuantity;

            updatedPositions[existingPositionIndex] = {
              symbol: existingPosition.symbol,
              quantity: totalQuantity,
              averagePrice: newAveragePrice,
              currentPrice: currentStockPrice,
              marketValue: totalQuantity * currentStockPrice,
              unrealizedPnL: (currentStockPrice - newAveragePrice) * totalQuantity,
              unrealizedPnLPercent: ((currentStockPrice - newAveragePrice) / newAveragePrice) * 100,
              lastUpdate: trade.timestamp
            };
          }
        } else {
          // Create new position
          updatedPositions.push({
            symbol: trade.symbol,
            quantity: trade.quantity,
            averagePrice: trade.price,
            currentPrice: currentStockPrice,
            marketValue: trade.quantity * currentStockPrice,
            unrealizedPnL: (currentStockPrice - trade.price) * trade.quantity,
            unrealizedPnLPercent: ((currentStockPrice - trade.price) / trade.price) * 100,
            lastUpdate: trade.timestamp
          });
        }
      } else if (trade.type === 'sell') {
        updatedCash += trade.quantity * trade.price;

        if (existingPositionIndex >= 0) {
          const existingPosition = updatedPositions[existingPositionIndex];
          if (existingPosition) {
            const newQuantity = existingPosition.quantity - trade.quantity;

            if (newQuantity <= 0) {
              // Remove position if fully sold
              updatedPositions.splice(existingPositionIndex, 1);
            } else {
              // Update position quantity
              updatedPositions[existingPositionIndex] = {
                symbol: existingPosition.symbol,
                quantity: newQuantity,
                averagePrice: existingPosition.averagePrice,
                currentPrice: currentStockPrice,
                marketValue: newQuantity * currentStockPrice,
                unrealizedPnL: (currentStockPrice - existingPosition.averagePrice) * newQuantity,
                unrealizedPnLPercent: ((currentStockPrice - existingPosition.averagePrice) / existingPosition.averagePrice) * 100,
                lastUpdate: trade.timestamp
              };
            }
          }
        }
      }

      // Calculate portfolio totals
      const totalMarketValue = updatedPositions.reduce((sum, pos) => sum + pos.marketValue, 0);
      const totalCost = updatedPositions.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0);
      const totalValue = totalMarketValue + updatedCash;
      const totalPnL = totalMarketValue - totalCost;
      const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          trades: updatedTrades,
          positions: updatedPositions,
          cash: updatedCash,
          totalValue,
          totalCost,
          totalPnL,
          totalPnLPercent,
          lastUpdate: trade.timestamp
        }
      };

    case 'UPDATE_PORTFOLIO':
      return {
        ...state,
        portfolio: action.payload
      };

    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [...state.alerts, action.payload]
      };

    case 'UPDATE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(alert =>
          alert.id === action.payload.id
            ? { ...alert, ...action.payload.updates }
            : alert
        )
      };

    case 'REMOVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter(alert => alert.id !== action.payload)
      };

    case 'UPDATE_MARKET_SUMMARY':
      return {
        ...state,
        marketSummary: action.payload
      };

    case 'SET_HISTORICAL_DATA':
      return {
        ...state,
        historicalData: {
          ...state.historicalData,
          [action.payload.symbol]: action.payload.data
        }
      };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload
      };

    case 'SET_CURRENT_VIEW':
      return {
        ...state,
        currentView: action.payload
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
    // New action methods
    addTrade: (trade: any) => void;
    updatePortfolio: (portfolio: any) => void;
    addAlert: (alert: any) => void;
    updateAlert: (id: string, updates: any) => void;
    removeAlert: (id: string) => void;
    updateMarketSummary: (summary: any) => void;
    setHistoricalData: (symbol: string, data: any) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    setCurrentView: (view: 'dashboard' | 'trading' | 'portfolio' | 'alerts' | 'history') => void;
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
      dispatch({ type: 'INITIALIZE_STOCK_DATA', payload: symbols }),

    // New action implementations
    addTrade: (trade: any) =>
      dispatch({ type: 'ADD_TRADE', payload: trade }),

    updatePortfolio: (portfolio: any) =>
      dispatch({ type: 'UPDATE_PORTFOLIO', payload: portfolio }),

    addAlert: (alert: any) =>
      dispatch({ type: 'ADD_ALERT', payload: alert }),

    updateAlert: (id: string, updates: any) =>
      dispatch({ type: 'UPDATE_ALERT', payload: { id, updates } }),

    removeAlert: (id: string) =>
      dispatch({ type: 'REMOVE_ALERT', payload: id }),

    updateMarketSummary: (summary: any) =>
      dispatch({ type: 'UPDATE_MARKET_SUMMARY', payload: summary }),

    setHistoricalData: (symbol: string, data: any) =>
      dispatch({ type: 'SET_HISTORICAL_DATA', payload: { symbol, data } }),

    setTheme: (theme: 'light' | 'dark') =>
      dispatch({ type: 'SET_THEME', payload: theme }),

    setCurrentView: (view: 'dashboard' | 'trading' | 'portfolio' | 'alerts' | 'history') =>
      dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
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
