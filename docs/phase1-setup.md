# Phase 1: Single-Host Development Environment Setup

This guide provides step-by-step instructions for setting up and running the Kafka streaming simulation in a single-host development environment using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0 or higher
- At least 4GB of available RAM
- At least 2GB of free disk space

## Quick Start

### 1. Start the Environment

```bash
# Navigate to project directory
cd kafka-stream-sim

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps
```

Expected output:
```
NAME                   IMAGE                              COMMAND                  SERVICE      CREATED         STATUS                   PORTS
kafka-sim-broker       confluentinc/cp-kafka:latest       "/etc/confluent/dock…"   kafka        2 minutes ago   Up 2 minutes (healthy)   0.0.0.0:9092->9092/tcp, 0.0.0.0:9101->9101/tcp
kafka-sim-consumer     kafka-stream-sim_consumer          "python read_ticks.py"   consumer     2 minutes ago   Up 2 minutes (healthy)   
kafka-sim-producer     kafka-stream-sim_producer          "python send_ticks.py"   producer     2 minutes ago   Up 2 minutes (healthy)   
kafka-sim-zookeeper    confluentinc/cp-zookeeper:latest   "/etc/confluent/dock…"   zookeeper    2 minutes ago   Up 2 minutes (healthy)   0.0.0.0:2181->2181/tcp
```

### 2. Monitor the System

```bash
# View producer logs (stock tick generation)
docker-compose logs -f producer

# View consumer logs (stock tick consumption)
docker-compose logs -f consumer

# View all logs
docker-compose logs -f
```

### 3. Validate the Setup

```bash
# Run validation script (Linux/Mac)
./scripts/validate-cluster.sh

# Or manually check topics
docker exec kafka-sim-broker kafka-topics --bootstrap-server localhost:9092 --list
```

## Detailed Setup Instructions

### Step 1: Environment Preparation

1. **Clone or create the project structure:**
   ```
   kafka-stream-sim/
   ├── docker-compose.yml
   ├── producer/
   │   ├── Dockerfile
   │   ├── requirements.txt
   │   └── send_ticks.py
   ├── consumer/
   │   ├── Dockerfile
   │   ├── requirements.txt
   │   └── read_ticks.py
   └── scripts/
       ├── create-topics.sh
       ├── validate-cluster.sh
       └── cleanup.sh
   ```

2. **Verify Docker is running:**
   ```bash
   docker --version
   docker-compose --version
   ```

### Step 2: Build and Start Services

1. **Build custom images:**
   ```bash
   docker-compose build
   ```

2. **Start services in detached mode:**
   ```bash
   docker-compose up -d
   ```

3. **Wait for services to be healthy:**
   ```bash
   # Check health status
   docker-compose ps

   # Wait for all services to show "healthy" status
   # This may take 1-2 minutes for initial startup
   ```

### Step 3: Verify Topic Creation

The `stock_ticks` topic should be created automatically. Verify with:

```bash
# List topics
docker exec kafka-sim-broker kafka-topics --bootstrap-server localhost:9092 --list

# Describe the stock_ticks topic
docker exec kafka-sim-broker kafka-topics --bootstrap-server localhost:9092 --describe --topic stock_ticks
```

Expected topic configuration:
- **Topic**: stock_ticks
- **Partitions**: 3
- **Replication Factor**: 1
- **Retention**: 7 days

### Step 4: Monitor Message Flow

1. **Producer Output:**
   ```bash
   docker-compose logs producer
   ```
   
   You should see JSON logs like:
   ```json
   {"asctime": "2024-01-15 10:30:15,123", "name": "send_ticks", "levelname": "INFO", "message": "Tick sent successfully", "symbol": "AAPL", "price": 150.25, "volume": 1500, "partition": 1, "offset": 42, "message_count": 43}
   ```

2. **Consumer Output:**
   ```bash
   docker-compose logs consumer
   ```
   
   You should see formatted table output:
   ```
   +----------+--------+---------+-------+--------+------------------+
   | Time     | Symbol | Price   | Trend | Volume | Partition:Offset |
   +==========+========+=========+=======+========+==================+
   | 10:30:15 | AAPL   | $150.25 | ↑     | 1,500  | P1:O42          |
   +----------+--------+---------+-------+--------+------------------+
   ```

### Step 5: Test Message Production and Consumption

1. **Manual message production:**
   ```bash
   # Send a test message
   echo '{"symbol":"TEST","price":100.00,"timestamp":"2024-01-15T10:30:00.000Z","volume":1000}' | \
   docker exec -i kafka-sim-broker kafka-console-producer --bootstrap-server localhost:9092 --topic stock_ticks
   ```

2. **Manual message consumption:**
   ```bash
   # Consume messages from beginning
   docker exec kafka-sim-broker kafka-console-consumer \
     --bootstrap-server localhost:9092 \
     --topic stock_ticks \
     --from-beginning \
     --max-messages 5
   ```

## Configuration Options

### Environment Variables

You can customize the behavior by setting environment variables in `docker-compose.yml`:

#### Producer Configuration
- `PRODUCER_INTERVAL`: Time between messages (default: 1.5 seconds)
- `LOG_LEVEL`: Logging level (default: INFO)

#### Consumer Configuration
- `KAFKA_GROUP_ID`: Consumer group ID (default: stock_tick_consumers)
- `STATS_INTERVAL`: Statistics display interval (default: 30 seconds)

#### Kafka Configuration
- `KAFKA_AUTO_CREATE_TOPICS_ENABLE`: Auto-create topics (default: true)
- `KAFKA_NUM_PARTITIONS`: Default partitions for new topics (default: 3)

### Example Customization

```yaml
# In docker-compose.yml
producer:
  # ... other config
  environment:
    KAFKA_BOOTSTRAP_SERVERS: kafka:29092
    KAFKA_TOPIC: stock_ticks
    PRODUCER_INTERVAL: 0.5  # Send messages every 500ms
    LOG_LEVEL: DEBUG
```

## Troubleshooting

### Common Issues

1. **Services not starting:**
   ```bash
   # Check logs for errors
   docker-compose logs

   # Restart services
   docker-compose restart
   ```

2. **Port conflicts:**
   ```bash
   # Check if ports are in use
   netstat -an | grep :9092
   netstat -an | grep :2181

   # Stop conflicting services or change ports in docker-compose.yml
   ```

3. **Out of memory errors:**
   ```bash
   # Increase Docker memory allocation in Docker Desktop settings
   # Minimum recommended: 4GB
   ```

4. **Topic not found:**
   ```bash
   # Create topic manually
   docker exec kafka-sim-broker kafka-topics \
     --bootstrap-server localhost:9092 \
     --create \
     --topic stock_ticks \
     --partitions 3 \
     --replication-factor 1
   ```

### Health Checks

All services include health checks. Check status with:

```bash
# Overall health
docker-compose ps

# Individual service health
docker inspect kafka-sim-broker --format='{{.State.Health.Status}}'
docker inspect kafka-sim-zookeeper --format='{{.State.Health.Status}}'
```

### Performance Tuning

For better performance in development:

1. **Increase producer batch size:**
   ```python
   # In producer/send_ticks.py
   batch_size=32768  # Increase from 16384
   ```

2. **Adjust consumer poll timeout:**
   ```python
   # In consumer/read_ticks.py
   consumer_timeout_ms=5000  # Increase from 1000
   ```

3. **Optimize Docker resources:**
   ```yaml
   # In docker-compose.yml
   services:
     kafka:
       deploy:
         resources:
           limits:
             memory: 2G
           reservations:
             memory: 1G
   ```

## Cleanup

### Stop Services
```bash
# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down
```

### Complete Cleanup
```bash
# Remove everything including volumes
docker-compose down -v

# Remove custom images
docker rmi kafka-stream-sim_producer kafka-stream-sim_consumer

# Or use the cleanup script
./scripts/cleanup.sh full
```

## Next Steps

Once Phase 1 is working correctly:

1. **Experiment with scaling:**
   ```bash
   # Scale consumer instances
   docker-compose up -d --scale consumer=3
   ```

2. **Monitor performance:**
   ```bash
   # View resource usage
   docker stats
   ```

3. **Prepare for Phase 2:**
   - Review the production deployment guide
   - Plan for multi-node setup
   - Consider security requirements

## Validation Checklist

- [ ] All containers are running and healthy
- [ ] Producer is generating stock tick messages
- [ ] Consumer is processing messages and displaying formatted output
- [ ] Topic `stock_ticks` exists with correct configuration
- [ ] No error messages in logs
- [ ] Message flow is continuous and stable
- [ ] Resource usage is within acceptable limits

For additional help, see the [Troubleshooting Guide](troubleshooting.md) or check the logs for specific error messages.
