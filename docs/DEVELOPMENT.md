# Development Setup Guide

This guide covers setting up a development environment for the Kafka Stream Simulator project.

## 🛠️ Prerequisites

### Required Software
- **Node.js 18+**: JavaScript runtime
- **npm 8+**: Package manager
- **Docker & Docker Compose**: Container runtime
- **Git**: Version control
- **VS Code** (recommended): IDE with extensions

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-vscode-remote.remote-containers",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

## 🚀 Quick Setup

### 1. Clone and Setup
```bash
# Clone repository
git clone <repository-url>
cd Kafka-Stream-Sim

# Install dependencies for all services
npm run install:all

# Start development environment
npm run dev:setup
```

### 2. Start Development Services
```bash
# Start infrastructure (Kafka, Zookeeper)
docker-compose up -d kafka zookeeper

# Start development servers
npm run dev
```

This will start:
- Producer: http://localhost:3001
- Consumer: http://localhost:3002  
- WebSocket Bridge: http://localhost:8080
- UI: http://localhost:3000

## 📁 Project Structure

```
Kafka-Stream-Sim/
├── producer/                 # Stock data producer service
│   ├── src/
│   │   ├── index.js         # Main entry point
│   │   ├── producer.js      # Kafka producer logic
│   │   └── stockGenerator.js # Stock data generation
│   ├── package.json
│   └── Dockerfile
├── consumer/                 # Data consumer service
│   ├── src/
│   │   ├── index.js         # Main entry point
│   │   ├── consumer.js      # Kafka consumer logic
│   │   └── dataStore.js     # Data aggregation
│   ├── package.json
│   └── Dockerfile
├── websocket-bridge/         # WebSocket bridge service
│   ├── src/
│   │   ├── index.js         # Main entry point
│   │   ├── server.js        # WebSocket server
│   │   └── kafkaClient.js   # Kafka integration
│   ├── package.json
│   └── Dockerfile
├── ui/                       # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # React context
│   │   ├── hooks/           # Custom hooks
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main app component
│   ├── package.json
│   └── Dockerfile
├── k8s/                      # Kubernetes manifests
├── docs/                     # Documentation
├── scripts/                  # Utility scripts
├── docker-compose.yml        # Development compose file
└── package.json             # Root package.json
```

## 🔧 Development Workflow

### Local Development

#### Backend Services (Node.js)
```bash
# Producer development
cd producer
npm install
npm run dev    # Starts with nodemon for hot reload

# Consumer development  
cd consumer
npm install
npm run dev

# WebSocket Bridge development
cd websocket-bridge
npm install
npm run dev
```

#### Frontend (React)
```bash
cd ui
npm install
npm start      # Starts development server with hot reload
```

### Environment Variables

Create `.env` files in each service directory:

#### Producer (.env)
```env
NODE_ENV=development
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC=stock-prices
PRODUCER_INTERVAL=1000
STOCK_SYMBOLS=AAPL,GOOGL,AMZN,TSLA,MSFT
LOG_LEVEL=debug
```

#### Consumer (.env)
```env
NODE_ENV=development
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC=stock-prices
CONSUMER_GROUP_ID=stock-consumer
LOG_LEVEL=debug
```

#### WebSocket Bridge (.env)
```env
NODE_ENV=development
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
WEBSOCKET_PORT=8080
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

#### UI (.env)
```env
REACT_APP_WEBSOCKET_URL=ws://localhost:8080
REACT_APP_API_URL=http://localhost:8080
REACT_APP_LOG_LEVEL=debug
```

## 🧪 Testing Setup

### Unit Testing
```bash
# Run all tests
npm test

# Run tests for specific service
cd producer && npm test
cd consumer && npm test
cd websocket-bridge && npm test
cd ui && npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Integration Testing
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup test environment
docker-compose -f docker-compose.test.yml down
```

## 🐛 Debugging

### VS Code Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Producer",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/producer/src/index.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Consumer",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/consumer/src/index.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Debug WebSocket Bridge",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/websocket-bridge/src/index.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Commands
```bash
# Debug with Node.js inspector
node --inspect-brk=0.0.0.0:9229 producer/src/index.js

# Debug with VS Code
# Set breakpoints and use F5 to start debugging

# Debug Docker containers
docker exec -it <container-name> /bin/bash
```

## 📦 Building and Packaging

### Docker Images
```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build producer

# Build for production
docker build -t kafka-stream-sim-producer:latest ./producer
```

### Production Build
```bash
# Build UI for production
cd ui && npm run build

# Build and optimize all services
npm run build:all
```

## 🔄 Hot Reload Setup

### Backend Hot Reload (Nodemon)
```json
// nodemon.json
{
  "watch": ["src"],
  "ext": "js,json",
  "ignore": ["src/**/*.test.js"],
  "exec": "node src/index.js"
}
```

### Frontend Hot Reload (React)
Hot reload is enabled by default with `npm start`.

### Docker Development with Hot Reload
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  producer:
    build: ./producer
    volumes:
      - ./producer/src:/app/src
    environment:
      - NODE_ENV=development
    command: npm run dev
```

## 🎨 Code Style and Linting

### ESLint Configuration
```json
// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
  },
};
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

## 🚀 Development Scripts

### Root Package.json Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:producer\" \"npm run dev:consumer\" \"npm run dev:bridge\" \"npm run dev:ui\"",
    "dev:producer": "cd producer && npm run dev",
    "dev:consumer": "cd consumer && npm run dev", 
    "dev:bridge": "cd websocket-bridge && npm run dev",
    "dev:ui": "cd ui && npm start",
    "install:all": "npm install && cd producer && npm install && cd ../consumer && npm install && cd ../websocket-bridge && npm install && cd ../ui && npm install",
    "test:all": "npm run test:producer && npm run test:consumer && npm run test:bridge && npm run test:ui",
    "build:all": "npm run build:producer && npm run build:consumer && npm run build:bridge && npm run build:ui",
    "lint:all": "npm run lint:producer && npm run lint:consumer && npm run lint:bridge && npm run lint:ui"
  }
}
```

## 🔧 Development Tools

### Kafka Development Tools
```bash
# Kafka CLI tools (in Docker)
alias kafka-topics='docker exec kafka-stream-sim-kafka-1 kafka-topics --bootstrap-server localhost:9092'
alias kafka-console-consumer='docker exec -it kafka-stream-sim-kafka-1 kafka-console-consumer --bootstrap-server localhost:9092'
alias kafka-console-producer='docker exec -it kafka-stream-sim-kafka-1 kafka-console-producer --bootstrap-server localhost:9092'

# List topics
kafka-topics --list

# Create topic
kafka-topics --create --topic test-topic --partitions 3 --replication-factor 1

# Consume messages
kafka-console-consumer --topic stock-prices --from-beginning
```

### Database Tools (if using)
```bash
# MongoDB (if added)
docker exec -it mongodb mongo

# Redis (if added)  
docker exec -it redis redis-cli
```

## 📊 Performance Monitoring

### Development Metrics
```javascript
// Add to any service for basic metrics
const performanceMonitor = {
  startTime: Date.now(),
  requests: 0,
  
  logMetrics() {
    const uptime = Date.now() - this.startTime;
    console.log(`Uptime: ${uptime}ms, Requests: ${this.requests}`);
  }
};
```

### Memory Monitoring
```bash
# Monitor Node.js memory usage
node --max-old-space-size=4096 --inspect src/index.js

# Monitor Docker container resources
docker stats
```

## 🤝 Contributing Guidelines

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] Performance impact is considered

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Commit Message Format
```
type(scope): description

feat: add new feature
fix: resolve bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

## 🔍 Troubleshooting Development Issues

### Common Development Problems

1. **Port conflicts**: Use different ports for development
2. **Module not found**: Run `npm install` in service directory
3. **Kafka connection issues**: Ensure Kafka is running
4. **Hot reload not working**: Check file watchers and volumes
5. **TypeScript errors**: Check tsconfig.json configuration

### Debug Commands
```bash
# Check Node.js version
node --version

# Check npm version  
npm --version

# Check Docker version
docker --version

# Check running processes
ps aux | grep node

# Check port usage
lsof -i :3000
lsof -i :8080
lsof -i :9092
```

---

For more information, see the [Testing Guide](TESTING_GUIDE.md) and [Troubleshooting Guide](TROUBLESHOOTING.md).
