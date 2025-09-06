import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { StockData, StockTick, PricePoint, VolumePoint, TimeRange } from '../types';

interface UseStockDataReturn {
  stockData: Record<string, StockData>;
  filteredStockData: Record<string, StockData>;
  recentTicks: StockTick[];
  filteredTicks: StockTick[];
  getSymbolData: (symbol: string) => StockData | undefined;
  getSymbolPrices: (symbol: string) => PricePoint[];
  getSymbolVolumes: (symbol: string) => VolumePoint[];
  getTotalVolume: () => number;
  getAveragePrice: (symbol: string) => number;
  getPriceRange: (symbol: string) => { min: number; max: number };
  getVolumeRange: (symbol: string) => { min: number; max: number };
  getSymbolStats: (symbol: string) => {
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
    high: number;
    low: number;
    average: number;
  };
}

export const useStockData = (): UseStockDataReturn => {
  const { state } = useAppContext();
  const { stockData, recentTicks, selectedSymbols, timeRange } = state;

  // Filter stock data by selected symbols
  const filteredStockData = useMemo(() => {
    const filtered: Record<string, StockData> = {};
    selectedSymbols.forEach(symbol => {
      const symbolData = stockData[symbol];
      if (symbolData) {
        filtered[symbol] = symbolData;
      }
    });
    return filtered;
  }, [stockData, selectedSymbols]);

  // Filter recent ticks by selected symbols
  const filteredTicks = useMemo(() => {
    return recentTicks.filter(tick => selectedSymbols.includes(tick.symbol));
  }, [recentTicks, selectedSymbols]);

  // Get data for a specific symbol
  const getSymbolData = (symbol: string): StockData | undefined => {
    return stockData[symbol];
  };

  // Get price points for a specific symbol
  const getSymbolPrices = (symbol: string): PricePoint[] => {
    const data = stockData[symbol];
    return data ? data.prices : [];
  };

  // Get volume points for a specific symbol
  const getSymbolVolumes = (symbol: string): VolumePoint[] => {
    const data = stockData[symbol];
    return data ? data.volumes : [];
  };

  // Calculate total volume across all selected symbols
  const getTotalVolume = (): number => {
    return selectedSymbols.reduce((total, symbol) => {
      const data = stockData[symbol];
      return total + (data ? data.totalVolume : 0);
    }, 0);
  };

  // Calculate average price for a symbol
  const getAveragePrice = (symbol: string): number => {
    const prices = getSymbolPrices(symbol);
    if (prices.length === 0) return 0;
    
    const sum = prices.reduce((total, point) => total + point.price, 0);
    return sum / prices.length;
  };

  // Get price range (min/max) for a symbol
  const getPriceRange = (symbol: string): { min: number; max: number } => {
    const prices = getSymbolPrices(symbol);
    if (prices.length === 0) return { min: 0, max: 0 };
    
    const priceValues = prices.map(point => point.price);
    return {
      min: Math.min(...priceValues),
      max: Math.max(...priceValues)
    };
  };

  // Get volume range (min/max) for a symbol
  const getVolumeRange = (symbol: string): { min: number; max: number } => {
    const volumes = getSymbolVolumes(symbol);
    if (volumes.length === 0) return { min: 0, max: 0 };
    
    const volumeValues = volumes.map(point => point.volume);
    return {
      min: Math.min(...volumeValues),
      max: Math.max(...volumeValues)
    };
  };

  // Get comprehensive stats for a symbol
  const getSymbolStats = (symbol: string) => {
    const data = stockData[symbol];
    const prices = getSymbolPrices(symbol);
    const priceRange = getPriceRange(symbol);
    const average = getAveragePrice(symbol);

    return {
      currentPrice: data ? data.currentPrice : 0,
      priceChange: data ? data.priceChange : 0,
      priceChangePercent: data ? data.priceChangePercent : 0,
      volume: data ? data.totalVolume : 0,
      high: priceRange.max,
      low: priceRange.min,
      average
    };
  };

  return {
    stockData,
    filteredStockData,
    recentTicks,
    filteredTicks,
    getSymbolData,
    getSymbolPrices,
    getSymbolVolumes,
    getTotalVolume,
    getAveragePrice,
    getPriceRange,
    getVolumeRange,
    getSymbolStats
  };
};

// Hook for aggregated market data
export const useMarketData = () => {
  const { filteredStockData, getTotalVolume } = useStockData();
  const { state } = useAppContext();

  const marketStats = useMemo(() => {
    const symbols = Object.keys(filteredStockData);
    const totalSymbols = symbols.length;
    
    if (totalSymbols === 0) {
      return {
        totalSymbols: 0,
        totalVolume: 0,
        averagePrice: 0,
        gainers: 0,
        losers: 0,
        unchanged: 0,
        totalMarketCap: 0
      };
    }

    let totalPrice = 0;
    let gainers = 0;
    let losers = 0;
    let unchanged = 0;

    symbols.forEach(symbol => {
      const data = filteredStockData[symbol];
      if (data) {
        totalPrice += data.currentPrice;
        
        if (data.priceChange > 0) gainers++;
        else if (data.priceChange < 0) losers++;
        else unchanged++;
      }
    });

    return {
      totalSymbols,
      totalVolume: getTotalVolume(),
      averagePrice: totalPrice / totalSymbols,
      gainers,
      losers,
      unchanged,
      totalMarketCap: totalPrice // Simplified calculation
    };
  }, [filteredStockData, getTotalVolume]);

  return {
    marketStats,
    timeRange: state.timeRange,
    selectedSymbols: state.selectedSymbols
  };
};

// Hook for real-time performance metrics
export const usePerformanceMetrics = () => {
  const { state } = useAppContext();
  const { recentTicks, metrics } = state;

  const performanceStats = useMemo(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Count messages in different time windows
    const lastMinuteTicks = recentTicks.filter(
      tick => new Date(tick.receivedAt).getTime() > oneMinuteAgo
    );
    
    const lastFiveMinutesTicks = recentTicks.filter(
      tick => new Date(tick.receivedAt).getTime() > fiveMinutesAgo
    );

    // Calculate rates
    const messagesPerMinute = lastMinuteTicks.length;
    const messagesPerFiveMinutes = lastFiveMinutesTicks.length;
    const averageMessagesPerMinute = messagesPerFiveMinutes / 5;

    // Partition distribution
    const partitionDistribution: Record<number, number> = {};
    recentTicks.forEach(tick => {
      partitionDistribution[tick.partition] = (partitionDistribution[tick.partition] || 0) + 1;
    });

    return {
      messagesPerMinute,
      messagesPerFiveMinutes,
      averageMessagesPerMinute,
      messagesPerSecond: metrics.messagesPerSecond,
      partitionDistribution,
      totalMessages: recentTicks.length,
      connectedClients: metrics.connectedClients,
      uptime: metrics.uptime
    };
  }, [recentTicks, metrics]);

  return performanceStats;
};
