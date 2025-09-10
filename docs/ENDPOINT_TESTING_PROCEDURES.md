# Endpoint Testing Procedures
## Kafka Stream Simulator Application

This document provides step-by-step procedures for testing all endpoints and validating functionality in both Docker Compose and Kubernetes deployments.

## 🧪 Testing Prerequisites

### Required Tools
```bash
# Install required testing tools
npm install -g socket.io-client ws
curl --version
kubectl version --client
docker --version
docker-compose --version
```

### Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd Kafka-Stream-Sim

# Ensure clean environment
docker-compose down -v
kubectl delete namespace kafka-stream-sim --ignore-not-found
```

## 📋 Testing Checklist

### Pre-Deployment Checklist
- [ ] Docker and Docker Compose installed
- [ ] Kubernetes cluster accessible (for K8s testing)
- [ ] Required ports available (3000, 8080, 9092, 2181)
- [ ] Sufficient system resources (8GB+ RAM recommended)
- [ ] Network connectivity for image pulls

### Post-Deployment Checklist
- [ ] All services running and healthy
- [ ] Health endpoints responding
- [ ] WebSocket connections functional
- [ ] UI accessible and displaying data
- [ ] End-to-end data flow verified

## 🐳 Docker Compose Testing Procedures

### 1. Deployment Testing

#### 1.1 Deploy Application
```bash
# Start all services
docker-compose up -d

# Verify deployment
docker-compose ps

# Expected output: All services should show "Up" status
```

#### 1.2 Wait for Services to Initialize
```bash
# Monitor logs for readiness
docker-compose logs -f

# Wait for these key messages:
# - Kafka: "started (kafka.server.KafkaServer)"
# - Producer: "Successfully sent stock tick"
# - Consumer: "Received message from partition"
# - WebSocket Bridge: "Server listening on port 8080"
```

### 2. Health Endpoint Testing

#### 2.1 WebSocket Bridge Health Check
```bash
# Test health endpoint
curl -i http://localhost:8080/health

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "metrics": {
#     "connectedClients": 0,
#     "messagesPerSecond": ...,
#     "uptime": ...
#   }
# }
```

#### 2.2 UI Accessibility Test
```bash
# Test UI endpoint
curl -I http://localhost:3000

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: text/html
```

### 3. WebSocket Connection Testing

#### 3.1 Create WebSocket Test Client
```javascript
// save as test-websocket.js
const { io } = require('socket.io-client');

const socket = io('http://localhost:8080');
let messageCount = 0;

socket.on('connect', () => {
    console.log('✅ Connected:', socket.id);
});

socket.on('stock-tick', (data) => {
    messageCount++;
    console.log(`📊 Message ${messageCount}:`, {
        symbol: data.symbol,
        price: data.price,
        volume: data.volume
    });
});

socket.on('metrics', (metrics) => {
    console.log('📈 Metrics:', metrics);
});

// Auto-disconnect after 10 seconds
setTimeout(() => {
    console.log(`\n📊 Total messages: ${messageCount}`);
    socket.disconnect();
}, 10000);
```

#### 3.2 Run WebSocket Test
```bash
# Install dependencies
npm install socket.io-client

# Run test
node test-websocket.js

# Expected output:
# ✅ Connected: <socket-id>
# 📈 Metrics: { connectedClients: 1, ... }
# 📊 Message 1: { symbol: 'AAPL', price: 150.25, volume: 1000 }
# 📊 Message 2: { symbol: 'GOOGL', price: 2800.50, volume: 500 }
# ...
```

### 4. Service Log Validation

#### 4.1 Producer Service Validation
```bash
# Check producer logs
docker-compose logs producer | tail -10

# Expected patterns:
# "Successfully sent stock tick for AAPL to partition X"
# "Successfully sent stock tick for GOOGL to partition Y"
```

#### 4.2 Consumer Service Validation
```bash
# Check consumer logs
docker-compose logs consumer | tail -10

# Expected patterns:
# "Received message from partition X, offset Y"
# "Processing stock data for SYMBOL: $PRICE"
```

#### 4.3 WebSocket Bridge Validation
```bash
# Check WebSocket bridge logs
docker-compose logs websocket-bridge | tail -10

# Expected patterns:
# "Processing message from partition X, offset Y"
# "Broadcasting to N clients"
```

### 5. End-to-End Data Flow Testing

#### 5.1 Manual Data Flow Verification
```bash
# 1. Verify producer is sending data
docker-compose logs producer | grep "Successfully sent" | tail -5

# 2. Verify consumer is receiving data
docker-compose logs consumer | grep "Received message" | tail -5

# 3. Verify WebSocket bridge is processing data
docker-compose logs websocket-bridge | grep "Broadcasting" | tail -5

# 4. Test WebSocket client receives data (use test script above)
```

### 6. UI Functional Testing

#### 6.1 Browser Testing
```bash
# Open UI in browser
open http://localhost:3000  # macOS
# or visit http://localhost:3000 in browser

# Verify:
# - Dashboard loads without errors
# - Stock cards display current prices
# - Connection status shows "Connected"
# - Prices update in real-time
# - Charts render properly
```

#### 6.2 Browser Console Testing
```javascript
// Open browser dev tools (F12) and run:
// Check for WebSocket connection
console.log('WebSocket status:', window.socket?.connected);

// Monitor real-time updates
window.addEventListener('stock-update', (event) => {
    console.log('Stock update:', event.detail);
});
```

## ☸️ Kubernetes Testing Procedures

### 1. Deployment Testing

#### 1.1 Deploy to Kubernetes
```bash
# Deploy with all features
cd k8s
./deploy.sh --production --monitoring --autoscaling --security

# Monitor deployment progress
kubectl get pods -n kafka-stream-sim -w
```

#### 1.2 Verify Pod Status
```bash
# Check all pods are running
kubectl get pods -n kafka-stream-sim

# Expected output: All pods should show "Running" status
# If any pods show "Pending" or "Error", investigate:
kubectl describe pod <pod-name> -n kafka-stream-sim
kubectl logs <pod-name> -n kafka-stream-sim
```

### 2. Service Connectivity Testing

#### 2.1 Port Forward for Testing
```bash
# Forward UI service
kubectl port-forward service/ui-service 3000:80 -n kafka-stream-sim &

# Forward WebSocket service
kubectl port-forward service/websocket-bridge-service 8080:8080 -n kafka-stream-sim &

# Test endpoints (same as Docker Compose tests)
curl -I http://localhost:3000
curl -i http://localhost:8080/health
```

#### 2.2 Internal Service Testing
```bash
# Test internal service connectivity
kubectl exec -it deployment/websocket-bridge -n kafka-stream-sim -- \
  curl http://kafka-service:9092

# Test DNS resolution
kubectl exec -it deployment/websocket-bridge -n kafka-stream-sim -- \
  nslookup kafka-service
```

### 3. Scaling and Performance Testing

#### 3.1 Test Horizontal Pod Autoscaling
```bash
# Check HPA status
kubectl get hpa -n kafka-stream-sim

# Generate load (if load testing tools available)
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- \
  /bin/sh -c "while true; do wget -q -O- http://ui-service.kafka-stream-sim.svc.cluster.local; done"

# Monitor scaling
kubectl get pods -n kafka-stream-sim -w
```

### 4. Monitoring and Metrics Testing

#### 4.1 Verify Monitoring Stack
```bash
# Check if monitoring components are deployed
kubectl get servicemonitor -n kafka-stream-sim
kubectl get prometheusrule -n kafka-stream-sim

# Test metrics endpoints
kubectl port-forward service/websocket-bridge-service 8080:8080 -n kafka-stream-sim &
curl http://localhost:8080/metrics
```

## 🔍 Troubleshooting Procedures

### Common Issues and Solutions

#### Issue: Services Not Starting
```bash
# Check resource constraints
kubectl describe nodes
kubectl top nodes

# Check events
kubectl get events -n kafka-stream-sim --sort-by='.lastTimestamp'

# Check pod logs
kubectl logs <pod-name> -n kafka-stream-sim --previous
```

#### Issue: WebSocket Connection Failures
```bash
# Check service endpoints
kubectl get endpoints -n kafka-stream-sim

# Test internal connectivity
kubectl exec -it deployment/ui -n kafka-stream-sim -- \
  wget -O- http://websocket-bridge-service:8080/health
```

#### Issue: UI Not Loading
```bash
# Check nginx configuration
kubectl exec -it deployment/ui -n kafka-stream-sim -- \
  cat /etc/nginx/nginx.conf

# Check service resolution
kubectl exec -it deployment/ui -n kafka-stream-sim -- \
  nslookup websocket-bridge-service
```

## 📊 Performance Benchmarking

### Load Testing Procedures

#### 1. WebSocket Load Testing
```bash
# Install k6 for load testing
brew install k6  # macOS
# or download from https://k6.io/

# Run WebSocket load test
k6 run tests/load/websocket-load-test.js
```

#### 2. HTTP Endpoint Load Testing
```bash
# Test UI endpoint
k6 run --vus 10 --duration 30s - <<EOF
import http from 'k6/http';
export default function() {
  http.get('http://localhost:3000');
}
EOF

# Test health endpoint
k6 run --vus 50 --duration 1m - <<EOF
import http from 'k6/http';
export default function() {
  http.get('http://localhost:8080/health');
}
EOF
```

### Performance Metrics Collection

#### 1. Resource Usage Monitoring
```bash
# Docker Compose
docker stats

# Kubernetes
kubectl top pods -n kafka-stream-sim
kubectl top nodes
```

#### 2. Application Metrics
```bash
# Collect WebSocket metrics
curl http://localhost:8080/metrics

# Monitor Kafka metrics (if JMX enabled)
docker exec kafka-container kafka-run-class.sh kafka.tools.JmxTool \
  --object-name kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec
```

## 📝 Test Reporting

### Test Results Documentation
```bash
# Generate test report
cat > test-results.md << EOF
# Test Results - $(date)

## Environment
- Deployment: Docker Compose / Kubernetes
- Test Duration: X minutes
- Services Tested: 6

## Results Summary
- [ ] All services deployed successfully
- [ ] Health endpoints responding
- [ ] WebSocket connections functional
- [ ] UI accessible and functional
- [ ] End-to-end data flow verified
- [ ] Performance within acceptable limits

## Issues Found
1. Issue description
   - Root cause: ...
   - Resolution: ...
   - Status: Fixed/Pending

## Performance Metrics
- Startup time: X seconds
- Memory usage: X MB
- CPU usage: X%
- Message throughput: X msg/sec
- WebSocket latency: X ms

## Recommendations
1. Recommendation 1
2. Recommendation 2
EOF
```

## 🔄 Continuous Testing

### Automated Testing Setup
```bash
# Create test automation script
cat > run-tests.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting automated endpoint testing..."

# Deploy application
docker-compose up -d

# Wait for services
sleep 60

# Run health checks
curl -f http://localhost:8080/health
curl -f http://localhost:3000

# Run WebSocket test
timeout 30s node test-websocket.js

# Cleanup
docker-compose down

echo "✅ All tests passed!"
EOF

chmod +x run-tests.sh
```

### CI/CD Integration
```yaml
# .github/workflows/endpoint-tests.yml
name: Endpoint Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run endpoint tests
        run: ./run-tests.sh
```

---

This comprehensive testing procedure ensures thorough validation of all application endpoints and functionality across both deployment environments.
