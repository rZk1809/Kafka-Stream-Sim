# API Documentation

## Overview

The Real-Time Stock Market Data Streaming Platform provides multiple APIs for accessing live stock market data and system metrics. This document covers WebSocket events, HTTP endpoints, and data schemas.

## WebSocket API

### Connection

**Endpoint**: `ws://localhost:8080` (Socket.IO)
**Protocol**: Socket.IO v4.x
**Authentication**: Optional API key via query parameter

```javascript
// Basic connection
const socket = io('http://localhost:8080');

// Connection with authentication
const socket = io('http://localhost:8080', {
  query: {
    apiKey: 'your-api-key'
  }
});
```

### Client Events (Client → Server)

#### Subscribe to Stock Updates

Subscribe to receive real-time updates for specific stock symbols.

```javascript
socket.emit('subscribe', symbols);
```

**Parameters**:
- `symbols` (Array<string>): Array of stock symbols to subscribe to

**Example**:
```javascript
socket.emit('subscribe', ['AAPL', 'GOOGL', 'AMZN', 'TSLA', 'MSFT']);
```

#### Join Room

Join a specific room for targeted message delivery.

```javascript
socket.emit('join', roomName);
```

**Parameters**:
- `roomName` (string): Name of the room to join

**Example**:
```javascript
socket.emit('join', 'stock-updates');
```

#### Unsubscribe from Stock Updates

Stop receiving updates for specific stock symbols.

```javascript
socket.emit('unsubscribe', symbols);
```

**Parameters**:
- `symbols` (Array<string>): Array of stock symbols to unsubscribe from

**Example**:
```javascript
socket.emit('unsubscribe', ['AAPL']);
```

### Server Events (Server → Client)

#### Stock Tick Data

Receive real-time stock tick updates.

```javascript
socket.on('stock-tick', (data) => {
  console.log('Stock update:', data);
});
```

**Data Schema**:
```typescript
interface StockTick {
  symbol: string;        // Stock symbol (e.g., "AAPL")
  price: number;         // Current price in USD
  timestamp: string;     // ISO 8601 timestamp
  volume: number;        // Trading volume
  partition?: number;    // Kafka partition (optional)
  offset?: number;       // Kafka offset (optional)
}
```

**Example**:
```json
{
  "symbol": "AAPL",
  "price": 150.25,
  "timestamp": "2025-08-06T18:01:25.513365+00:00",
  "volume": 1648,
  "partition": 0,
  "offset": 1115
}
```

#### System Metrics

Receive system performance metrics.

```javascript
socket.on('metrics', (data) => {
  console.log('System metrics:', data);
});
```

**Data Schema**:
```typescript
interface SystemMetrics {
  messagesProcessed: number;    // Total messages processed
  connectedClients: number;     // Current connected clients
  uptime: number;              // Server uptime in milliseconds
  startTime: number;           // Server start timestamp
  memoryUsage?: {              // Memory usage statistics
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  kafkaMetrics?: {             // Kafka consumer metrics
    lag: number;
    throughput: number;
  };
}
```

**Example**:
```json
{
  "messagesProcessed": 1234,
  "connectedClients": 5,
  "uptime": 3600000,
  "startTime": 1640995200000,
  "memoryUsage": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  }
}
```

#### Connection Events

Standard Socket.IO connection events.

```javascript
// Connection established
socket.on('connect', () => {
  console.log('Connected to server');
});

// Connection lost
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// Reconnection attempt
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt:', attemptNumber);
});
```

## HTTP API

### Health Check

Check the health status of the WebSocket bridge service.

**Endpoint**: `GET /health`
**Authentication**: None required

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-06T18:01:25.513Z",
  "version": "1.0.0",
  "uptime": 3600000
}
```

**Status Codes**:
- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is unhealthy

### System Metrics

Retrieve current system metrics.

**Endpoint**: `GET /metrics`
**Authentication**: Optional API key via header

**Headers**:
```
Authorization: Bearer your-api-key
```

**Response**:
```json
{
  "messagesProcessed": 1234,
  "connectedClients": 5,
  "uptime": 3600000,
  "startTime": 1640995200000,
  "memoryUsage": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "kafkaMetrics": {
    "lag": 0,
    "throughput": 10.5,
    "partitions": [
      {"partition": 0, "offset": 1115, "lag": 0},
      {"partition": 1, "offset": 565, "lag": 0},
      {"partition": 2, "offset": 1048, "lag": 0}
    ]
  }
}
```

**Status Codes**:
- `200 OK`: Metrics retrieved successfully
- `401 Unauthorized`: Invalid or missing API key
- `500 Internal Server Error`: Server error

### Server Information

Get server configuration and capabilities.

**Endpoint**: `GET /info`
**Authentication**: None required

**Response**:
```json
{
  "name": "WebSocket Bridge",
  "version": "1.0.0",
  "description": "Kafka to WebSocket bridge for real-time stock data",
  "capabilities": [
    "real-time-streaming",
    "symbol-filtering",
    "room-management",
    "metrics-collection"
  ],
  "supportedSymbols": ["AAPL", "GOOGL", "AMZN", "TSLA", "MSFT"],
  "maxConnections": 1000,
  "rateLimit": {
    "connectionsPerMinute": 60,
    "messagesPerSecond": 100
  }
}
```

## Error Handling

### WebSocket Errors

WebSocket errors are emitted as events with structured error objects.

```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

**Error Schema**:
```typescript
interface WebSocketError {
  code: string;           // Error code
  message: string;        // Human-readable message
  timestamp: string;      // ISO 8601 timestamp
  details?: any;         // Additional error details
}
```

**Common Error Codes**:
- `INVALID_SYMBOL`: Invalid stock symbol provided
- `SUBSCRIPTION_LIMIT`: Maximum subscriptions exceeded
- `RATE_LIMIT`: Rate limit exceeded
- `AUTHENTICATION_FAILED`: Invalid API key
- `INTERNAL_ERROR`: Server internal error

**Example**:
```json
{
  "code": "INVALID_SYMBOL",
  "message": "Symbol 'INVALID' is not supported",
  "timestamp": "2025-08-06T18:01:25.513Z",
  "details": {
    "symbol": "INVALID",
    "supportedSymbols": ["AAPL", "GOOGL", "AMZN", "TSLA", "MSFT"]
  }
}
```

### HTTP Errors

HTTP errors follow standard REST conventions with JSON error responses.

**Error Schema**:
```typescript
interface HTTPError {
  error: {
    code: string;         // Error code
    message: string;      // Human-readable message
    timestamp: string;    // ISO 8601 timestamp
    path: string;        // Request path
    method: string;      // HTTP method
  };
}
```

**Example**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key provided",
    "timestamp": "2025-08-06T18:01:25.513Z",
    "path": "/metrics",
    "method": "GET"
  }
}
```

## Rate Limiting

### Connection Limits

- **Maximum concurrent connections**: 1000 per server instance
- **Connection rate**: 60 connections per minute per IP
- **Reconnection backoff**: Exponential backoff with jitter

### Message Limits

- **Message rate**: 100 messages per second per connection
- **Subscription limit**: 50 symbols per connection
- **Room limit**: 10 rooms per connection

### Rate Limit Headers

HTTP responses include rate limit information in headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995260
```

## Authentication

### API Key Authentication

API keys can be provided via query parameter or Authorization header.

**Query Parameter**:
```javascript
const socket = io('http://localhost:8080?apiKey=your-api-key');
```

**Authorization Header** (HTTP only):
```
Authorization: Bearer your-api-key
```

### API Key Management

Contact system administrator for API key provisioning and management.

## Client Libraries

### JavaScript/TypeScript

```typescript
import { io, Socket } from 'socket.io-client';

interface StockTick {
  symbol: string;
  price: number;
  timestamp: string;
  volume: number;
}

class StockDataClient {
  private socket: Socket;

  constructor(url: string, apiKey?: string) {
    this.socket = io(url, {
      query: apiKey ? { apiKey } : undefined
    });
  }

  subscribe(symbols: string[]): void {
    this.socket.emit('subscribe', symbols);
  }

  onStockTick(callback: (data: StockTick) => void): void {
    this.socket.on('stock-tick', callback);
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

// Usage
const client = new StockDataClient('http://localhost:8080', 'your-api-key');
client.subscribe(['AAPL', 'GOOGL']);
client.onStockTick((data) => {
  console.log(`${data.symbol}: $${data.price}`);
});
```

### Python

```python
import socketio
from typing import List, Callable

class StockDataClient:
    def __init__(self, url: str, api_key: str = None):
        self.sio = socketio.Client()
        self.url = url
        self.api_key = api_key
        
    def connect(self):
        query = {'apiKey': self.api_key} if self.api_key else {}
        self.sio.connect(self.url, socketio_path='/socket.io/', query=query)
        
    def subscribe(self, symbols: List[str]):
        self.sio.emit('subscribe', symbols)
        
    def on_stock_tick(self, callback: Callable):
        self.sio.on('stock-tick', callback)
        
    def disconnect(self):
        self.sio.disconnect()

# Usage
client = StockDataClient('http://localhost:8080', 'your-api-key')
client.connect()
client.subscribe(['AAPL', 'GOOGL'])

@client.on_stock_tick
def handle_stock_tick(data):
    print(f"{data['symbol']}: ${data['price']}")

client.sio.wait()
```

## Best Practices

### Connection Management

1. **Implement reconnection logic** with exponential backoff
2. **Handle connection state changes** gracefully
3. **Use connection pooling** for multiple clients
4. **Monitor connection health** with ping/pong

### Data Handling

1. **Validate incoming data** before processing
2. **Implement data buffering** for high-frequency updates
3. **Use efficient data structures** for real-time processing
4. **Handle out-of-order messages** appropriately

### Error Handling

1. **Implement comprehensive error handling** for all events
2. **Log errors with context** for debugging
3. **Provide user-friendly error messages** in UI
4. **Implement circuit breakers** for fault tolerance

### Performance Optimization

1. **Batch subscription requests** when possible
2. **Use efficient JSON parsing** libraries
3. **Implement client-side caching** for static data
4. **Monitor memory usage** and implement cleanup
