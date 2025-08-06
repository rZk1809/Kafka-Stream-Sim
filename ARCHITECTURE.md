# System Architecture Documentation

## Overview

The Real-Time Stock Market Data Streaming Platform is a distributed system designed for high-throughput, low-latency financial data processing and visualization. The architecture follows microservices principles with event-driven communication patterns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web       │  │   Mobile    │  │   Desktop   │  │   Terminal  │        │
│  │ Dashboard   │  │    App      │  │    App      │  │  Consumer   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │  WebSocket  │  │    REST     │  │   GraphQL   │                         │
│  │   Bridge    │  │     API     │  │     API     │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Message Streaming Layer                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    Apache Kafka Cluster                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │ │
│  │  │   Broker 1  │  │   Broker 2  │  │   Broker 3  │                     │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                     │ │
│  │                                                                         │ │
│  │  Topics: stock_ticks, market_events, system_metrics                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      Zookeeper Ensemble                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │ │
│  │  │     ZK 1    │  │     ZK 2    │  │     ZK 3    │                     │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Data Processing Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Stock     │  │  Market     │  │ Analytics   │  │  Alerting   │        │
│  │  Producer   │  │ Processor   │  │  Engine     │  │  Service    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Storage Layer                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Kafka     │  │    Redis    │  │ PostgreSQL  │  │ InfluxDB    │        │
│  │   Logs      │  │   Cache     │  │ Metadata    │  │ Time Series │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Stock Producer Service

**Technology**: Python 3.9+ with confluent-kafka-python
**Purpose**: Generate realistic stock market data

```python
# Core Components
├── StockDataGenerator
│   ├── PriceCalculator (realistic price movements)
│   ├── VolumeGenerator (trading volume simulation)
│   └── TimestampManager (precise timing control)
├── KafkaProducer
│   ├── ConnectionManager (fault-tolerant connections)
│   ├── MessageSerializer (JSON/Avro serialization)
│   └── PartitionStrategy (load distribution)
└── ConfigurationManager
    ├── EnvironmentLoader (12-factor app config)
    ├── ValidationEngine (config validation)
    └── HotReloadSupport (runtime config updates)
```

**Key Features**:
- Realistic price movements using random walk with drift
- Configurable volatility and market hours
- Fault-tolerant Kafka connectivity with automatic retry
- Metrics collection and health monitoring
- Support for multiple stock symbols with different characteristics

### 2. WebSocket Bridge Service

**Technology**: Node.js 18+ with Socket.IO and KafkaJS
**Purpose**: Bridge Kafka streams to WebSocket connections

```javascript
// Core Components
├── WebSocketServer
│   ├── ConnectionManager (client lifecycle management)
│   ├── RoomManager (topic-based subscriptions)
│   └── AuthenticationHandler (client authentication)
├── KafkaConsumer
│   ├── ConsumerGroupManager (scalable consumption)
│   ├── MessageProcessor (data transformation)
│   └── OffsetManager (reliable message processing)
├── MessageBroker
│   ├── SubscriptionManager (client subscriptions)
│   ├── FilterEngine (symbol-based filtering)
│   └── RateLimiter (client rate limiting)
└── HealthMonitor
    ├── MetricsCollector (performance metrics)
    ├── HealthChecker (service health status)
    └── AlertManager (anomaly detection)
```

**Key Features**:
- Real-time WebSocket communication with automatic reconnection
- Scalable consumer group management
- Client subscription management with symbol filtering
- Comprehensive metrics and monitoring
- Rate limiting and connection management

### 3. Web Dashboard

**Technology**: Modern HTML5/CSS3/JavaScript with Chart.js
**Purpose**: Professional real-time data visualization

```javascript
// Core Components
├── ConnectionManager
│   ├── WebSocketClient (Socket.IO integration)
│   ├── ReconnectionHandler (automatic reconnection)
│   └── ConnectionMonitor (status tracking)
├── DataManager
│   ├── StockDataStore (in-memory data management)
│   ├── ChartDataProcessor (time-series processing)
│   └── MetricsCalculator (performance calculations)
├── UIComponents
│   ├── StockCards (real-time price display)
│   ├── PriceCharts (interactive visualizations)
│   ├── MetricsDashboard (system monitoring)
│   └── ActivityLog (event logging)
└── ThemeManager
    ├── DarkModeSupport (theme switching)
    ├── ResponsiveLayout (mobile optimization)
    └── AccessibilityFeatures (WCAG compliance)
```

**Key Features**:
- Real-time stock price cards with trend indicators
- Interactive price charts with multiple timeframes
- Performance metrics dashboard
- Activity logging with filtering
- Responsive design with dark/light themes

## Data Flow Architecture

### Message Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Stock     │    │   Apache    │    │  WebSocket  │    │   Web       │
│  Producer   │    │   Kafka     │    │   Bridge    │    │ Dashboard   │
│             │    │             │    │             │    │             │
│ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │
│ │Generate │ │───▶│ │ Topic:  │ │───▶│ │Consumer │ │───▶│ │Real-time│ │
│ │Stock    │ │    │ │stock_   │ │    │ │Group    │ │    │ │Display  │ │
│ │Ticks    │ │    │ │ticks    │ │    │ │         │ │    │ │         │ │
│ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │
│             │    │             │    │      │      │    │             │
│ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │
│ │Partition│ │    │ │Partition│ │    │ │WebSocket│ │    │ │Chart    │ │
│ │Strategy │ │    │ │0,1,2    │ │    │ │Broadcast│ │    │ │Updates  │ │
│ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Data Processing Pipeline

1. **Data Generation**
   - Stock Producer generates tick data every 1-5 seconds
   - Each tick contains: symbol, price, timestamp, volume
   - Data is partitioned by symbol for parallel processing

2. **Message Streaming**
   - Kafka receives messages and distributes across partitions
   - Messages are replicated for fault tolerance
   - Consumer groups enable scalable consumption

3. **Real-time Distribution**
   - WebSocket Bridge consumes from Kafka
   - Messages are filtered by client subscriptions
   - Real-time broadcast to connected web clients

4. **Visualization**
   - Web Dashboard receives real-time updates
   - Data is processed for charts and metrics
   - UI updates with smooth animations

## Deployment Architecture

### Development Environment

```yaml
# docker-compose.yml structure
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    
  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on: [zookeeper]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    
  producer:
    build: ./producer
    depends_on: [kafka]
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    
  consumer:
    build: ./consumer
    depends_on: [kafka]
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    
  websocket-bridge:
    build: ./websocket-bridge
    depends_on: [kafka]
    ports:
      - "8080:8080"
    environment:
      KAFKA_BROKERS: kafka:9092
```

### Production Environment

```yaml
# docker-stack.yml structure
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    deploy:
      replicas: 3
      placement:
        constraints: [node.role == manager]
    
  kafka:
    image: confluentinc/cp-kafka:latest
    deploy:
      replicas: 3
      placement:
        constraints: [node.role == worker]
    
  producer:
    image: stock-producer:latest
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    
  websocket-bridge:
    image: websocket-bridge:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    ports:
      - "8080:8080"
```

## Security Architecture

### Network Security
- **Container Isolation**: Docker networks isolate services
- **Port Exposure**: Only necessary ports exposed to host
- **TLS Encryption**: HTTPS/WSS for client connections
- **Internal Communication**: Service-to-service encryption

### Authentication & Authorization
- **API Keys**: Client authentication for WebSocket connections
- **Rate Limiting**: Per-client connection and message limits
- **CORS Policy**: Restricted cross-origin access
- **Input Validation**: Comprehensive input sanitization

### Data Security
- **Message Encryption**: Kafka message encryption at rest
- **Audit Logging**: Comprehensive access and operation logs
- **Data Retention**: Configurable message retention policies
- **Backup Strategy**: Regular data backups and recovery procedures

## Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Custom business metrics
- **System Metrics**: CPU, memory, disk, network usage
- **Kafka Metrics**: Throughput, lag, partition distribution
- **WebSocket Metrics**: Connection counts, message rates

### Logging Strategy
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Log Aggregation**: Centralized logging with ELK stack
- **Log Levels**: Configurable logging levels per service
- **Log Retention**: Automated log rotation and archival

### Health Monitoring
- **Health Checks**: HTTP endpoints for service health
- **Readiness Probes**: Service readiness verification
- **Liveness Probes**: Service availability monitoring
- **Circuit Breakers**: Fault tolerance patterns

## Scalability Considerations

### Horizontal Scaling
- **Kafka Partitions**: Increase partitions for higher throughput
- **Consumer Groups**: Scale consumers independently
- **WebSocket Instances**: Load balance WebSocket connections
- **Database Sharding**: Partition data across multiple databases

### Vertical Scaling
- **Resource Allocation**: Adjust CPU and memory limits
- **JVM Tuning**: Optimize garbage collection settings
- **Connection Pooling**: Efficient resource utilization
- **Caching Strategy**: Reduce database load with caching

### Performance Optimization
- **Message Batching**: Batch processing for efficiency
- **Compression**: Message compression to reduce bandwidth
- **Connection Reuse**: Persistent connections where possible
- **Async Processing**: Non-blocking I/O operations

## Disaster Recovery

### Backup Strategy
- **Kafka Replication**: Multi-broker replication
- **Database Backups**: Regular automated backups
- **Configuration Backups**: Version-controlled configurations
- **Container Images**: Immutable infrastructure

### Recovery Procedures
- **Service Recovery**: Automated service restart policies
- **Data Recovery**: Point-in-time recovery capabilities
- **Failover Strategy**: Automatic failover to backup systems
- **Testing**: Regular disaster recovery testing
