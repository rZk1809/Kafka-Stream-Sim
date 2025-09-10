# Testing Guide

This guide covers all aspects of testing the Kafka Stream Simulator application, from unit tests to end-to-end testing and performance validation.

## 🧪 Testing Strategy

Our testing approach follows the testing pyramid:

```
    /\
   /  \     E2E Tests (Few)
  /____\    
 /      \   Integration Tests (Some)
/__________\ Unit Tests (Many)
```

### Test Types

1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test service interactions
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Test system performance and scalability
5. **Security Tests**: Test security configurations

## 🔧 Setup

### Prerequisites

```bash
# Install testing dependencies
npm install --save-dev jest supertest @testing-library/react @testing-library/jest-dom

# Install load testing tool
npm install -g k6

# Install security testing tools
npm install --save-dev audit-ci
```

### Test Environment

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
./scripts/wait-for-services.sh
```

## 🧩 Unit Testing

### Frontend (React) Tests

```bash
# Run all UI tests
cd ui && npm test

# Run tests in watch mode
cd ui && npm test -- --watch

# Run tests with coverage
cd ui && npm test -- --coverage
```

#### Example Test: Market Alerts Component

```javascript
// ui/src/components/__tests__/MarketAlerts.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../../context/AppContext';
import MarketAlerts from '../MarketAlerts';

const MockAppProvider = ({ children }) => (
  <AppProvider initialState={{
    stockData: {
      'AAPL': { currentPrice: 150, totalVolume: 1000000 }
    },
    alerts: []
  }}>
    {children}
  </AppProvider>
);

describe('MarketAlerts', () => {
  test('renders alert creation form', () => {
    render(
      <MockAppProvider>
        <MarketAlerts />
      </MockAppProvider>
    );
    
    expect(screen.getByText('Create Alert')).toBeInTheDocument();
  });

  test('creates price alert', async () => {
    render(
      <MockAppProvider>
        <MarketAlerts />
      </MockAppProvider>
    );
    
    fireEvent.click(screen.getByText('Create Alert'));
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Stock Symbol'), {
      target: { value: 'AAPL' }
    });
    fireEvent.change(screen.getByLabelText('Price Threshold'), {
      target: { value: '160' }
    });
    
    fireEvent.click(screen.getByText('Create Alert'));
    
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });
  });
});
```

### Backend (Node.js) Tests

```bash
# Run producer tests
cd producer && npm test

# Run consumer tests
cd consumer && npm test

# Run WebSocket bridge tests
cd websocket-bridge && npm test
```

#### Example Test: Producer Service

```javascript
// producer/src/__tests__/producer.test.js
const { StockDataGenerator } = require('../stockDataGenerator');
const { KafkaProducer } = require('../kafkaProducer');

describe('StockDataGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new StockDataGenerator(['AAPL', 'GOOGL']);
  });

  test('generates valid stock data', () => {
    const data = generator.generateTick('AAPL');
    
    expect(data).toHaveProperty('symbol', 'AAPL');
    expect(data).toHaveProperty('price');
    expect(data).toHaveProperty('volume');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.price).toBe('number');
    expect(data.price).toBeGreaterThan(0);
  });

  test('price changes are realistic', () => {
    const data1 = generator.generateTick('AAPL');
    const data2 = generator.generateTick('AAPL');
    
    const priceChange = Math.abs(data2.price - data1.price) / data1.price;
    expect(priceChange).toBeLessThan(0.1); // Max 10% change
  });
});

describe('KafkaProducer', () => {
  let producer;

  beforeEach(() => {
    producer = new KafkaProducer({
      brokers: ['localhost:9092'],
      topic: 'test-topic'
    });
  });

  afterEach(async () => {
    await producer.disconnect();
  });

  test('connects to Kafka', async () => {
    await expect(producer.connect()).resolves.not.toThrow();
  });

  test('sends message successfully', async () => {
    await producer.connect();
    
    const message = {
      symbol: 'AAPL',
      price: 150.00,
      volume: 1000,
      timestamp: new Date().toISOString()
    };

    await expect(producer.send(message)).resolves.not.toThrow();
  });
});
```

## 🔗 Integration Testing

### Service Integration Tests

```bash
# Run integration tests
npm run test:integration
```

#### Example: WebSocket Integration Test

```javascript
// tests/integration/websocket.test.js
const WebSocket = require('ws');
const { KafkaProducer } = require('../../producer/src/kafkaProducer');

describe('WebSocket Integration', () => {
  let ws;
  let producer;

  beforeAll(async () => {
    producer = new KafkaProducer({
      brokers: ['localhost:9092'],
      topic: 'stock-prices'
    });
    await producer.connect();
  });

  afterAll(async () => {
    await producer.disconnect();
  });

  beforeEach(() => {
    ws = new WebSocket('ws://localhost:8080');
  });

  afterEach(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  test('receives stock data via WebSocket', (done) => {
    ws.on('open', async () => {
      // Send test data to Kafka
      await producer.send({
        symbol: 'TEST',
        price: 100.00,
        volume: 1000,
        timestamp: new Date().toISOString()
      });
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data);
      
      expect(message).toHaveProperty('symbol', 'TEST');
      expect(message).toHaveProperty('price', 100.00);
      done();
    });

    ws.on('error', done);
  }, 10000);
});
```

### Database Integration Tests

```javascript
// tests/integration/consumer.test.js
const { Consumer } = require('../../consumer/src/consumer');
const { StockDataStore } = require('../../consumer/src/dataStore');

describe('Consumer Integration', () => {
  let consumer;
  let dataStore;

  beforeEach(() => {
    dataStore = new StockDataStore();
    consumer = new Consumer({
      brokers: ['localhost:9092'],
      groupId: 'test-group',
      topic: 'stock-prices'
    }, dataStore);
  });

  test('processes messages and updates data store', async () => {
    const testMessage = {
      symbol: 'AAPL',
      price: 150.00,
      volume: 1000,
      timestamp: new Date().toISOString()
    };

    await consumer.processMessage(testMessage);

    const stockData = dataStore.getStock('AAPL');
    expect(stockData.currentPrice).toBe(150.00);
    expect(stockData.totalVolume).toBe(1000);
  });
});
```

## 🌐 End-to-End Testing

### Browser Automation Tests

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run E2E tests
npx playwright test
```

#### Example E2E Test

```javascript
// tests/e2e/dashboard.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('displays real-time stock data', async ({ page }) => {
    // Wait for WebSocket connection
    await page.waitForSelector('[data-testid="connection-status"][data-connected="true"]');

    // Check if stock cards are displayed
    await expect(page.locator('[data-testid="stock-card"]')).toHaveCount(5);

    // Verify stock data updates
    const priceElement = page.locator('[data-testid="stock-price-AAPL"]');
    const initialPrice = await priceElement.textContent();
    
    // Wait for price update
    await page.waitForFunction(
      (element, initial) => element.textContent !== initial,
      priceElement,
      initialPrice,
      { timeout: 10000 }
    );
  });

  test('creates and triggers market alert', async ({ page }) => {
    // Navigate to alerts
    await page.click('[data-testid="nav-alerts"]');

    // Create alert
    await page.click('[data-testid="create-alert-button"]');
    await page.selectOption('[data-testid="alert-symbol"]', 'AAPL');
    await page.selectOption('[data-testid="alert-type"]', 'price_above');
    await page.fill('[data-testid="alert-value"]', '1');
    await page.click('[data-testid="submit-alert"]');

    // Verify alert is created
    await expect(page.locator('[data-testid="active-alert"]')).toHaveCount(1);

    // Wait for alert to trigger (price should be above $1)
    await expect(page.locator('[data-testid="triggered-alert"]')).toHaveCount(1, {
      timeout: 30000
    });
  });
});
```

## ⚡ Performance Testing

### Load Testing with k6

```bash
# Run WebSocket load test
k6 run tests/load/websocket-load-test.js

# Run HTTP API load test
k6 run tests/load/api-load-test.js
```

#### WebSocket Load Test

```javascript
// tests/load/websocket-load-test.js
import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 connections
    { duration: '1m', target: 100 },   // Stay at 100 connections
    { duration: '30s', target: 200 },  // Ramp up to 200 connections
    { duration: '2m', target: 200 },   // Stay at 200 connections
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    ws_connecting: ['avg<1000'],       // Connection time < 1s
    ws_msgs_received: ['count>1000'],  // Receive at least 1000 messages
  },
};

export default function () {
  const url = 'ws://localhost:8080';
  const params = { tags: { my_tag: 'websocket' } };

  const response = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      console.log('Connected');
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'has symbol': (msg) => msg.hasOwnProperty('symbol'),
        'has price': (msg) => msg.hasOwnProperty('price'),
        'price is number': (msg) => typeof msg.price === 'number',
      });
    });

    socket.on('close', () => {
      console.log('Disconnected');
    });

    socket.setTimeout(() => {
      socket.close();
    }, 60000); // Close after 1 minute
  });

  check(response, { 'status is 101': (r) => r && r.status === 101 });
}
```

### Kafka Performance Test

```javascript
// tests/load/kafka-throughput-test.js
import { Producer } from 'kafkajs';

export let options = {
  scenarios: {
    producer_load: {
      executor: 'constant-arrival-rate',
      rate: 1000, // 1000 messages per second
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 10,
      maxVUs: 50,
    },
  },
};

const kafka = new Producer({
  brokers: ['localhost:9092'],
});

export default async function () {
  await kafka.connect();

  const message = {
    topic: 'stock-prices',
    messages: [{
      key: 'AAPL',
      value: JSON.stringify({
        symbol: 'AAPL',
        price: Math.random() * 200 + 100,
        volume: Math.floor(Math.random() * 10000),
        timestamp: new Date().toISOString(),
      }),
    }],
  };

  await kafka.send(message);
}
```

## 🔒 Security Testing

### Vulnerability Scanning

```bash
# Run npm audit
npm audit

# Run audit with CI-friendly output
npx audit-ci --moderate

# Scan Docker images
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image kafka-stream-sim-ui:latest
```

### Kubernetes Security Tests

```bash
# Run kube-score for security best practices
kube-score score k8s/*.yaml

# Run Polaris for security validation
polaris audit --audit-path k8s/
```

## 📊 Test Reporting

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Test Results

```bash
# Generate JUnit XML reports
npm test -- --reporters=jest-junit

# Generate HTML test report
npm test -- --reporters=jest-html-reporter
```

## 🚀 Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  integration-tests:
    runs-on: ubuntu-latest
    services:
      kafka:
        image: confluentinc/cp-kafka:latest
        env:
          KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
          KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker-compose up -d
      - run: npx playwright test
```

## 🐛 Debugging Tests

### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Test Utilities

```javascript
// tests/utils/testHelpers.js
export const waitForCondition = async (condition, timeout = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Condition not met within timeout');
};

export const mockKafkaMessage = (symbol = 'AAPL', price = 150) => ({
  symbol,
  price,
  volume: Math.floor(Math.random() * 10000),
  timestamp: new Date().toISOString(),
});
```

## 📝 Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear, descriptive test names
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Include boundary conditions and error cases
6. **Performance Considerations**: Monitor test execution time
7. **Continuous Testing**: Run tests on every commit

## 🔧 Troubleshooting

### Common Issues

1. **Flaky Tests**: Use proper waits and retries
2. **Timeout Issues**: Increase timeouts for integration tests
3. **Resource Cleanup**: Ensure proper cleanup in afterEach/afterAll
4. **Port Conflicts**: Use dynamic ports or docker-compose for isolation

### Debug Commands

```bash
# Run specific test file
npm test -- MarketAlerts.test.tsx

# Run tests in debug mode
npm test -- --detectOpenHandles --forceExit

# Run with verbose output
npm test -- --verbose
```

---

For more information, see the [Troubleshooting Guide](TROUBLESHOOTING.md) and [Development Setup](DEVELOPMENT.md).
