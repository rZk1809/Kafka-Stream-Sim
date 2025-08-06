# Troubleshooting Guide

## Common Issues and Solutions

### 1. Services Won't Start

#### Problem: Docker services fail to start
**Symptoms**:
- `docker-compose up` fails with errors
- Services show "Exited" status
- Port binding errors

**Solutions**:

```bash
# Check Docker daemon status
docker --version
docker info

# Verify Docker Compose version
docker-compose --version

# Check port availability
netstat -an | grep :9092   # Kafka
netstat -an | grep :8080   # WebSocket Bridge
netstat -an | grep :2181   # Zookeeper

# Clean restart all services
docker-compose down
docker system prune -f
docker-compose up -d

# Check service logs
docker-compose logs --tail=50 [service-name]
```

#### Problem: Kafka broker fails to start
**Symptoms**:
- Kafka container exits immediately
- "Connection refused" errors
- Zookeeper connection issues

**Solutions**:

```bash
# Ensure Zookeeper is running first
docker-compose up -d zookeeper
sleep 30
docker-compose up -d kafka

# Check Zookeeper logs
docker-compose logs zookeeper

# Verify Zookeeper connectivity
docker-compose exec zookeeper zkCli.sh ls /

# Reset Kafka data (CAUTION: Data loss)
docker-compose down
docker volume rm kafka-stream-sim_kafka-data
docker-compose up -d
```

### 2. WebSocket Connection Issues

#### Problem: Dashboard can't connect to WebSocket bridge
**Symptoms**:
- "Disconnected" status in dashboard
- Console errors about connection failures
- No real-time data updates

**Solutions**:

```bash
# Check WebSocket bridge status
docker-compose ps websocket-bridge
docker-compose logs websocket-bridge

# Verify bridge is listening on correct port
docker-compose exec websocket-bridge netstat -tlnp | grep 8080

# Test HTTP health endpoint
curl http://localhost:8080/health

# Check firewall/antivirus blocking
# Windows: Check Windows Defender Firewall
# macOS: Check System Preferences > Security & Privacy
# Linux: Check iptables rules

# Test from different browser/incognito mode
# Clear browser cache and cookies
```

#### Problem: WebSocket bridge can't connect to Kafka
**Symptoms**:
- Bridge starts but shows Kafka connection errors
- "ECONNREFUSED" errors in logs
- No data flowing from Kafka to WebSocket

**Solutions**:

```bash
# Verify Kafka is accessible from bridge container
docker-compose exec websocket-bridge ping kafka

# Check Kafka broker status
docker-compose exec kafka kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Verify topic exists
docker-compose exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092

# Check consumer group status
docker-compose exec kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Reset consumer group offsets
docker-compose exec kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group websocket-consumers --reset-offsets --to-earliest --topic stock_ticks --execute
```

### 3. No Data in Dashboard

#### Problem: Dashboard connects but shows no stock data
**Symptoms**:
- WebSocket connection successful
- No stock price updates
- Empty charts and metrics

**Solutions**:

```bash
# Check producer status
docker-compose logs producer
docker-compose ps producer

# Verify producer is sending messages
docker-compose exec kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic stock_ticks --from-beginning

# Check topic configuration
docker-compose exec kafka kafka-topics.sh --describe --topic stock_ticks --bootstrap-server localhost:9092

# Verify consumer group is consuming
docker-compose exec kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group websocket-consumers

# Check WebSocket bridge subscription
# Open browser dev tools and check WebSocket messages
```

#### Problem: Producer not generating data
**Symptoms**:
- Producer container running but no output
- Empty Kafka topic
- No messages in consumer

**Solutions**:

```bash
# Check producer logs for errors
docker-compose logs --tail=100 producer

# Verify producer configuration
docker-compose exec producer env | grep KAFKA

# Test Kafka connectivity from producer
docker-compose exec producer python -c "
from confluent_kafka import Producer
p = Producer({'bootstrap.servers': 'kafka:9092'})
print('Kafka connection test successful')
"

# Restart producer with debug logging
docker-compose stop producer
docker-compose run --rm -e LOG_LEVEL=DEBUG producer

# Check topic permissions
docker-compose exec kafka kafka-acls.sh --bootstrap-server localhost:9092 --list
```

### 4. Performance Issues

#### Problem: High latency or slow updates
**Symptoms**:
- Delayed stock price updates
- High memory usage
- Slow chart rendering

**Solutions**:

```bash
# Monitor resource usage
docker stats

# Check Kafka consumer lag
docker-compose exec kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group websocket-consumers

# Optimize Docker resource limits
# Edit docker-compose.yml:
services:
  websocket-bridge:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

# Enable Kafka compression
# Edit producer configuration:
KAFKA_COMPRESSION_TYPE=snappy

# Optimize WebSocket message batching
# Check websocket-bridge configuration
```

#### Problem: Memory leaks or high CPU usage
**Symptoms**:
- Continuously increasing memory usage
- High CPU utilization
- System becomes unresponsive

**Solutions**:

```bash
# Monitor specific container resources
docker stats websocket-bridge

# Check for memory leaks in Node.js
docker-compose exec websocket-bridge node --inspect=0.0.0.0:9229 server.js

# Enable garbage collection logging
docker-compose run --rm -e NODE_OPTIONS="--max-old-space-size=512" websocket-bridge

# Restart services periodically
# Add to crontab:
# 0 2 * * * cd /path/to/project && docker-compose restart websocket-bridge
```

### 5. Data Quality Issues

#### Problem: Incorrect or missing stock data
**Symptoms**:
- Stock prices seem unrealistic
- Missing volume data
- Timestamp issues

**Solutions**:

```bash
# Verify producer data generation
docker-compose logs producer | grep -E "(AAPL|GOOGL|AMZN|TSLA|MSFT)"

# Check message format in Kafka
docker-compose exec kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic stock_ticks --property print.key=true --property print.value=true

# Validate JSON structure
docker-compose exec kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic stock_ticks | jq '.'

# Check producer configuration
docker-compose exec producer env | grep -E "(STOCK_SYMBOLS|TICK_INTERVAL|PRICE_VOLATILITY)"
```

### 6. Browser-Specific Issues

#### Problem: Dashboard not working in specific browsers
**Symptoms**:
- Works in Chrome but not Firefox
- JavaScript errors in console
- Missing features or styling

**Solutions**:

```javascript
// Check browser compatibility
console.log('Browser:', navigator.userAgent);
console.log('WebSocket support:', 'WebSocket' in window);
console.log('Socket.IO support:', typeof io !== 'undefined');

// Enable CORS for development
// Add to websocket-bridge server.js:
const cors = require('cors');
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

// Check for ad blockers or privacy extensions
// Disable extensions temporarily for testing

// Use HTTPS for production
// Configure SSL certificates for secure WebSocket connections
```

### 7. Network and Connectivity Issues

#### Problem: Connection issues in corporate networks
**Symptoms**:
- WebSocket connections fail
- Proxy-related errors
- Firewall blocking

**Solutions**:

```bash
# Test direct connectivity
telnet localhost 8080

# Check proxy configuration
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Configure proxy for Docker
# Edit ~/.docker/config.json:
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.company.com:8080",
      "httpsProxy": "http://proxy.company.com:8080"
    }
  }
}

# Use polling fallback for WebSocket
// In client code:
const socket = io('http://localhost:8080', {
  transports: ['polling', 'websocket']
});
```

## Debugging Tools and Commands

### Docker Debugging

```bash
# View all containers
docker ps -a

# Inspect container configuration
docker inspect [container-name]

# Execute commands in running container
docker-compose exec [service-name] bash

# View container logs with timestamps
docker-compose logs -t [service-name]

# Follow logs in real-time
docker-compose logs -f [service-name]

# Check container resource usage
docker stats [container-name]
```

### Kafka Debugging

```bash
# List all topics
docker-compose exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092

# Describe topic configuration
docker-compose exec kafka kafka-topics.sh --describe --topic stock_ticks --bootstrap-server localhost:9092

# Consumer group information
docker-compose exec kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group websocket-consumers

# Produce test message
docker-compose exec kafka kafka-console-producer.sh --bootstrap-server localhost:9092 --topic stock_ticks

# Consume messages from beginning
docker-compose exec kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic stock_ticks --from-beginning

# Check broker configuration
docker-compose exec kafka kafka-configs.sh --bootstrap-server localhost:9092 --entity-type brokers --entity-name 1 --describe
```

### WebSocket Debugging

```javascript
// Browser console debugging
// Check WebSocket connection
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);

// Monitor WebSocket events
socket.onAny((event, ...args) => {
  console.log('WebSocket event:', event, args);
});

// Test WebSocket connectivity
const testSocket = io('http://localhost:8080');
testSocket.on('connect', () => console.log('Test connection successful'));
testSocket.on('connect_error', (error) => console.error('Test connection failed:', error));
```

### Network Debugging

```bash
# Check port connectivity
nc -zv localhost 8080
nc -zv localhost 9092

# Monitor network traffic
sudo tcpdump -i any port 8080
sudo tcpdump -i any port 9092

# Check DNS resolution
nslookup kafka
nslookup localhost

# Test HTTP endpoints
curl -v http://localhost:8080/health
curl -v http://localhost:8080/metrics
```

## Log Analysis

### Common Error Patterns

#### Kafka Connection Errors
```
ERROR [KafkaJS] Connection timeout
ERROR [KafkaJS] Broker not available
ERROR [KafkaJS] Topic does not exist
```

#### WebSocket Errors
```
ERROR WebSocket connection failed
ERROR Socket.IO handshake failed
ERROR Client disconnected unexpectedly
```

#### Producer Errors
```
ERROR Failed to send message to Kafka
ERROR Serialization error
ERROR Topic creation failed
```

### Log Aggregation

```bash
# Collect all service logs
docker-compose logs > system.log

# Filter logs by service
docker-compose logs producer > producer.log
docker-compose logs consumer > consumer.log
docker-compose logs websocket-bridge > websocket.log

# Search for specific errors
grep -i error system.log
grep -i "connection" system.log
grep -i "timeout" system.log
```

## Getting Help

### Support Channels

1. **GitHub Issues**: Report bugs and feature requests
2. **Documentation**: Check README.md and API.md
3. **Community Forums**: Stack Overflow with tags `kafka`, `websocket`, `docker`
4. **Official Documentation**: 
   - [Apache Kafka](https://kafka.apache.org/documentation/)
   - [Socket.IO](https://socket.io/docs/)
   - [Docker](https://docs.docker.com/)

### Information to Include in Bug Reports

1. **Environment Information**:
   - Operating system and version
   - Docker and Docker Compose versions
   - Browser version (for frontend issues)

2. **Steps to Reproduce**:
   - Exact commands run
   - Configuration changes made
   - Expected vs actual behavior

3. **Logs and Error Messages**:
   - Complete error messages
   - Relevant log excerpts
   - Screenshots if applicable

4. **System Information**:
   - Available memory and CPU
   - Network configuration
   - Firewall/proxy settings
