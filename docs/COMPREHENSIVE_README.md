# Kafka Stream Simulator - Complete Guide

A comprehensive real-time stock market data streaming application built with Apache Kafka, Node.js, and React. This project demonstrates modern streaming architecture patterns and provides a complete example of building scalable, real-time data processing systems with advanced UI features and production-ready Kubernetes deployment.

## 🏗️ Architecture

The application consists of several microservices that work together to simulate and visualize real-time stock market data:

- **Producer Service**: Generates realistic stock market data and publishes to Kafka topics
- **Consumer Service**: Processes messages from Kafka and maintains data aggregations  
- **WebSocket Bridge**: Provides real-time data streaming to web clients
- **React UI**: Modern web interface with advanced features for visualizing streaming data
- **Kafka & Zookeeper**: Message streaming infrastructure

## ✨ Features

### Real-time Data Streaming
- Live stock price updates with WebSocket connections
- Real-time market data visualization
- Low-latency data processing pipeline

### Advanced UI Features
- **Interactive Dashboard**: Modern React UI with real-time charts and metrics
- **Market Alerts**: Create custom price and volume alerts with browser notifications
- **Historical Charts**: Interactive price charts with multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- **Volume Analysis**: Comprehensive volume metrics and correlation analysis
- **Trading Interface**: Simulated trading operations with portfolio tracking
- **Portfolio Management**: Track positions, performance, and P&L
- **Dark/Light Theme**: Toggle between themes with persistent preferences
- **Responsive Design**: Mobile-friendly interface with adaptive layouts

### Production-Ready Infrastructure
- **Scalable Architecture**: Microservices design with Docker containerization
- **Kubernetes Ready**: Complete K8s manifests with production configurations
- **Monitoring & Observability**: Prometheus metrics, Grafana dashboards, and alerting
- **Security**: RBAC, Network Policies, and Pod Security Standards
- **Auto-scaling**: Horizontal Pod Autoscaling based on CPU, memory, and custom metrics
- **High Availability**: Multi-replica deployments with health checks

### Developer Experience
- **Docker Hub Integration**: Automated image building and publishing
- **Comprehensive Documentation**: Detailed guides for deployment and development
- **Testing Suite**: Unit tests, integration tests, and load testing
- **Development Tools**: Hot reloading, debugging support, and development containers

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, KafkaJS, WebSocket
- **Frontend**: React 18, TypeScript, Material-UI v5, Recharts, Context API
- **Message Broker**: Apache Kafka with Zookeeper
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes with production-ready manifests
- **Monitoring**: Prometheus, Grafana, ServiceMonitor, PrometheusRule
- **Security**: RBAC, Network Policies, Pod Security Policies
- **CI/CD**: Docker Hub integration, automated builds

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Kubernetes cluster (for K8s deployment)
- 8GB+ RAM recommended for full deployment
- Docker Hub account (for image publishing)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Kafka-Stream-Sim
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - UI: http://localhost:3000
   - WebSocket Bridge: ws://localhost:8080

### Local Development

1. **Start Kafka infrastructure**
   ```bash
   docker-compose up -d kafka zookeeper
   ```

2. **Install dependencies and start services**
   ```bash
   # Producer
   cd producer && npm install && npm start

   # Consumer  
   cd consumer && npm install && npm start

   # WebSocket Bridge
   cd websocket-bridge && npm install && npm start

   # UI
   cd ui && npm install && npm start
   ```

## 📊 Usage

Once the application is running, you can access these features:

### Dashboard
- Real-time stock prices and market data
- Live charts with price movements
- Market summary and statistics
- Connection status and metrics

### Market Alerts
- Create price-based alerts (above/below thresholds)
- Volume-based alerts for unusual activity
- Browser notifications when alerts trigger
- Manage active and triggered alerts

### Historical Charts
- Interactive price charts with multiple timeframes
- OHLC (Open, High, Low, Close) data visualization
- Volume charts with correlation analysis
- Zoom and pan functionality

### Volume Analysis
- Comprehensive volume metrics and trends
- Volume ratio analysis (current vs. average)
- Price-volume correlation indicators
- Volume distribution charts

### Trading Interface
- Simulated buy/sell operations
- Real-time position tracking
- Portfolio performance metrics
- P&L calculations

### Portfolio Management
- Track multiple positions
- Performance analytics
- Risk metrics
- Historical performance charts

## 🔧 Configuration

### Environment Variables

Each service can be configured using environment variables:

**Producer Service**:
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka broker addresses
- `KAFKA_TOPIC`: Topic name for stock data
- `PRODUCER_INTERVAL`: Data generation interval (ms)
- `STOCK_SYMBOLS`: Comma-separated list of stock symbols

**Consumer Service**:
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka broker addresses  
- `KAFKA_TOPIC`: Topic name to consume from
- `CONSUMER_GROUP_ID`: Consumer group identifier

**WebSocket Bridge**:
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka broker addresses
- `WEBSOCKET_PORT`: WebSocket server port
- `CORS_ORIGIN`: Allowed CORS origins

### Docker Compose Configuration

Modify `docker-compose.yml` to customize:
- Resource limits
- Port mappings  
- Environment variables
- Volume mounts

## 🚢 Deployment

### Docker Hub Images

Build and push images to Docker Hub:

```bash
# Set your Docker Hub username
export DOCKER_HUB_USERNAME=your-username

# Build and push all images
./scripts/docker-hub-deploy.sh

# Update Kubernetes manifests
./scripts/update-k8s-images.sh
```

### Kubernetes Deployment

See [k8s/README.md](k8s/README.md) for detailed Kubernetes deployment instructions.

```bash
cd k8s

# Basic deployment
./deploy.sh

# Production deployment with all features
./deploy.sh --production --monitoring --autoscaling --security --ingress
```

## 📈 Monitoring

The application includes built-in monitoring capabilities:

- **Health Checks**: HTTP endpoints for service health
- **Metrics**: Prometheus-compatible metrics endpoints
- **Logging**: Structured JSON logging
- **Tracing**: Request correlation IDs

### Grafana Dashboards

Pre-configured dashboards are available for:
- Message throughput and latency
- Consumer lag monitoring  
- Resource utilization
- Error rates and alerts

## 🧪 Testing

### Unit Tests
```bash
# Run tests for all services
npm run test

# Run tests for specific service
cd producer && npm test
```

### Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration
```

### Load Testing
```bash
# Install k6 (load testing tool)
# Run load tests
k6 run tests/load/websocket-load-test.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure Docker builds pass
- Test Kubernetes deployments

## 📚 Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [API Documentation](API.md)
- [Deployment Guide](../k8s/DEPLOYMENT_GUIDE.md)
- [Development Setup](DEVELOPMENT.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## 🐛 Troubleshooting

### Common Issues

1. **Kafka Connection Errors**: Ensure Kafka is running and accessible
2. **WebSocket Connection Failed**: Check CORS settings and port configuration
3. **UI Not Loading**: Verify all services are running and healthy
4. **High Memory Usage**: Adjust JVM heap settings for Kafka

### Getting Help

- Check the [troubleshooting guide](TROUBLESHOOTING.md)
- Review service logs: `docker-compose logs <service-name>`
- Open an issue on GitHub

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- Apache Kafka community for the excellent streaming platform
- React and Material-UI teams for the frontend frameworks
- Docker and Kubernetes communities for containerization tools

---

**Built with ❤️ for learning and demonstrating modern streaming architectures**
