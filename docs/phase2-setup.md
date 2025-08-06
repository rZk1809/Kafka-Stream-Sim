# Phase 2: Production-Ready Docker Swarm Deployment

This guide provides comprehensive instructions for deploying the Kafka streaming simulation in a production-ready Docker Swarm environment with high availability, fault tolerance, and scalability.

## Architecture Overview

### Production Components
- **3-node Zookeeper ensemble** for coordination and metadata management
- **3 Kafka brokers** with replication factor 3 for fault tolerance
- **Schema Registry** for schema management and evolution
- **Scaled producer services** (2 replicas) for load distribution
- **Scaled consumer services** (3 replicas) for parallel processing
- **Persistent volumes** for data durability
- **Health checks and restart policies** for reliability

### Key Production Features
- **High Availability**: Multi-node setup with automatic failover
- **Fault Tolerance**: Replication factor 3 with min.insync.replicas=2
- **Scalability**: Horizontal scaling of producers and consumers
- **Data Durability**: Persistent volumes with proper retention policies
- **Monitoring**: Health checks and resource constraints
- **Security**: Non-root containers and network isolation

## Prerequisites

- Docker Engine 20.10+ with Swarm mode enabled
- At least 8GB of available RAM
- At least 10GB of free disk space
- Multiple nodes (recommended) or single-node Swarm for testing

## Quick Start

### 1. Initialize Docker Swarm

```bash
# Initialize Swarm (if not already done)
docker swarm init

# For multi-node setup, join worker nodes:
# docker swarm join --token <token> <manager-ip>:2377
```

### 2. Label Nodes for Service Placement

```bash
# Label nodes for Zookeeper placement (adjust node names as needed)
docker node update --label-add zookeeper-1=true <node1-name>
docker node update --label-add zookeeper-2=true <node2-name>
docker node update --label-add zookeeper-3=true <node3-name>

# Label nodes for Kafka placement
docker node update --label-add kafka-1=true <node1-name>
docker node update --label-add kafka-2=true <node2-name>
docker node update --label-add kafka-3=true <node3-name>

# For single-node testing, label the same node for all services:
NODE_NAME=$(docker node ls --format "{{.Hostname}}" --filter "role=manager")
docker node update --label-add zookeeper-1=true $NODE_NAME
docker node update --label-add zookeeper-2=true $NODE_NAME
docker node update --label-add zookeeper-3=true $NODE_NAME
docker node update --label-add kafka-1=true $NODE_NAME
docker node update --label-add kafka-2=true $NODE_NAME
docker node update --label-add kafka-3=true $NODE_NAME
```

### 3. Build and Deploy the Stack

```bash
# Build custom images (from Phase 1)
docker-compose build

# Tag images for Swarm deployment
docker tag kafka-stream-sim_producer:latest kafka-stream-sim_producer:latest
docker tag kafka-stream-sim_consumer:latest kafka-stream-sim_consumer:latest

# Deploy the stack
docker stack deploy -c docker-stack.yml kafka-sim

# Verify deployment
docker stack services kafka-sim
```

### 4. Create Production Topics

```bash
# Wait for cluster to be ready (may take 2-3 minutes)
./scripts/create-prod-topics.sh create

# Verify topic creation
./scripts/create-prod-topics.sh describe
```

## Detailed Setup Instructions

### Step 1: Environment Preparation

1. **Verify Docker Swarm:**
   ```bash
   docker info | grep Swarm
   # Should show "Swarm: active"
   ```

2. **Check available resources:**
   ```bash
   docker system df
   docker system info
   ```

3. **Prepare node labels for single-node setup:**
   ```bash
   # Get current node name
   NODE_NAME=$(docker node ls --format "{{.Hostname}}" --filter "role=manager")
   echo "Node name: $NODE_NAME"
   
   # Apply all labels to single node
   for service in zookeeper-1 zookeeper-2 zookeeper-3 kafka-1 kafka-2 kafka-3; do
       docker node update --label-add $service=true $NODE_NAME
   done
   
   # Verify labels
   docker node inspect $NODE_NAME --format '{{.Spec.Labels}}'
   ```

### Step 2: Deploy the Production Stack

1. **Deploy the stack:**
   ```bash
   docker stack deploy -c docker-stack.yml kafka-sim
   ```

2. **Monitor deployment progress:**
   ```bash
   # Watch services come online
   watch docker stack services kafka-sim
   
   # Check individual service status
   docker service ls --filter "name=kafka-sim"
   
   # View service logs
   docker service logs kafka-sim_kafka-1
   docker service logs kafka-sim_zookeeper-1
   ```

3. **Wait for all services to be ready:**
   ```bash
   # All services should show "REPLICAS" as "1/1" or "2/2" etc.
   # This may take 3-5 minutes for initial startup
   ```

### Step 3: Configure Production Topics

1. **Create the stock_ticks topic:**
   ```bash
   ./scripts/create-prod-topics.sh create
   ```

2. **Verify topic configuration:**
   ```bash
   # Should show 6 partitions, replication factor 3
   ./scripts/create-prod-topics.sh describe stock_ticks
   ```

3. **Test message flow:**
   ```bash
   ./scripts/create-prod-topics.sh test stock_ticks
   ```

### Step 4: Validate Production Deployment

1. **Check cluster health:**
   ```bash
   ./scripts/create-prod-topics.sh health
   ```

2. **Monitor consumer groups:**
   ```bash
   ./scripts/create-prod-topics.sh groups
   ```

3. **Performance monitoring:**
   ```bash
   # Monitor for 60 seconds
   ./scripts/create-prod-topics.sh monitor stock_ticks 60
   ```

## Scaling Operations

### Scale Producer Services

```bash
# Scale producers to 5 replicas
docker service scale kafka-sim_producer=5

# Verify scaling
docker service ls --filter "name=kafka-sim_producer"

# View distributed producers
docker service ps kafka-sim_producer
```

### Scale Consumer Services

```bash
# Scale consumers to 6 replicas
docker service scale kafka-sim_consumer=6

# Check consumer group rebalancing
./scripts/create-prod-topics.sh groups
```

### Scale Down Services

```bash
# Scale back to original configuration
docker service scale kafka-sim_producer=2
docker service scale kafka-sim_consumer=3
```

## Fault Tolerance Testing

### Test Broker Failure

1. **Stop one Kafka broker:**
   ```bash
   # Get a Kafka service replica
   KAFKA_TASK=$(docker service ps kafka-sim_kafka-1 --format "{{.Name}}.{{.ID}}" | head -n 1)
   
   # Stop the container
   docker stop $KAFKA_TASK
   ```

2. **Verify cluster continues operating:**
   ```bash
   # Check remaining brokers
   ./scripts/create-prod-topics.sh health
   
   # Verify message flow continues
   ./scripts/create-prod-topics.sh monitor stock_ticks 30
   ```

3. **Observe automatic recovery:**
   ```bash
   # Docker Swarm will automatically restart the failed service
   watch docker service ps kafka-sim_kafka-1
   ```

### Test Zookeeper Failure

1. **Stop one Zookeeper node:**
   ```bash
   ZK_TASK=$(docker service ps kafka-sim_zookeeper-1 --format "{{.Name}}.{{.ID}}" | head -n 1)
   docker stop $ZK_TASK
   ```

2. **Verify cluster remains operational:**
   ```bash
   # Zookeeper ensemble should continue with 2/3 nodes
   ./scripts/create-prod-topics.sh health
   ```

### Test Network Partitions

1. **Simulate network issues:**
   ```bash
   # Create temporary network disruption
   docker network disconnect kafka-sim_kafka-cluster $KAFKA_TASK
   
   # Wait and reconnect
   sleep 30
   docker network connect kafka-sim_kafka-cluster $KAFKA_TASK
   ```

## Performance Monitoring

### Resource Usage

```bash
# Monitor service resource usage
docker stats $(docker ps --filter "name=kafka-sim" --format "{{.Names}}")

# Check service constraints
docker service inspect kafka-sim_kafka-1 --format '{{.Spec.TaskTemplate.Resources}}'
```

### Message Throughput

```bash
# Monitor topic performance
./scripts/create-prod-topics.sh monitor stock_ticks 120

# Check consumer lag
./scripts/create-prod-topics.sh groups
```

### Cluster Metrics

```bash
# View cluster-wide metrics
docker service ls --filter "name=kafka-sim"

# Check service distribution across nodes
docker service ps kafka-sim_kafka-1
docker service ps kafka-sim_kafka-2
docker service ps kafka-sim_kafka-3
```

## Configuration Tuning

### Kafka Broker Tuning

Key production settings in `docker-stack.yml`:

```yaml
environment:
  KAFKA_NUM_PARTITIONS: 6                    # Default partitions
  KAFKA_DEFAULT_REPLICATION_FACTOR: 3        # Replication factor
  KAFKA_MIN_INSYNC_REPLICAS: 2              # Minimum in-sync replicas
  KAFKA_UNCLEAN_LEADER_ELECTION_ENABLE: 'false'  # Prevent data loss
  KAFKA_LOG_RETENTION_HOURS: 168            # 7 days retention
  KAFKA_COMPRESSION_TYPE: snappy            # Compression
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      memory: 2G        # Maximum memory
    reservations:
      memory: 1G        # Reserved memory
```

### Health Check Configuration

```yaml
healthcheck:
  test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
  interval: 30s       # Check every 30 seconds
  timeout: 10s        # 10 second timeout
  retries: 3          # 3 retries before unhealthy
  start_period: 60s   # Wait 60s before first check
```

## Security Considerations

### Network Security

- Services communicate over encrypted overlay network
- No external access to internal Kafka ports (29092)
- Schema Registry exposed only on necessary port (8081)

### Container Security

- Non-root users in custom containers
- Read-only root filesystems where possible
- Resource limits to prevent resource exhaustion

### Data Security

- Persistent volumes for data durability
- Proper backup strategies for production data
- Access control through Docker Swarm RBAC

## Troubleshooting

### Common Issues

1. **Services not starting:**
   ```bash
   # Check service logs
   docker service logs kafka-sim_kafka-1
   
   # Check node constraints
   docker node ls
   docker node inspect <node-name>
   ```

2. **Insufficient resources:**
   ```bash
   # Check available resources
   docker system df
   docker system info
   
   # Adjust resource limits in docker-stack.yml
   ```

3. **Network connectivity issues:**
   ```bash
   # Check overlay network
   docker network ls
   docker network inspect kafka-sim_kafka-cluster
   
   # Test connectivity between services
   docker exec <container> ping kafka-1
   ```

### Recovery Procedures

1. **Complete stack restart:**
   ```bash
   docker stack rm kafka-sim
   # Wait for cleanup
   sleep 30
   docker stack deploy -c docker-stack.yml kafka-sim
   ```

2. **Individual service restart:**
   ```bash
   docker service update --force kafka-sim_kafka-1
   ```

3. **Data recovery:**
   ```bash
   # Volumes persist across restarts
   docker volume ls | grep kafka-sim
   ```

## Cleanup

### Remove Stack

```bash
# Remove the entire stack
docker stack rm kafka-sim

# Verify removal
docker stack ls
```

### Remove Volumes (Data Loss!)

```bash
# List volumes
docker volume ls | grep kafka-sim

# Remove all volumes (WARNING: This deletes all data!)
docker volume ls -q | grep kafka-sim | xargs docker volume rm
```

### Remove Node Labels

```bash
# Remove node labels
NODE_NAME=$(docker node ls --format "{{.Hostname}}" --filter "role=manager")
for label in zookeeper-1 zookeeper-2 zookeeper-3 kafka-1 kafka-2 kafka-3; do
    docker node update --label-rm $label $NODE_NAME
done
```

## Production Checklist

- [ ] Docker Swarm initialized and nodes labeled
- [ ] All services deployed and healthy
- [ ] Topics created with proper replication
- [ ] Producer and consumer services scaled appropriately
- [ ] Fault tolerance tested (broker and Zookeeper failures)
- [ ] Performance monitoring in place
- [ ] Resource limits configured
- [ ] Security measures implemented
- [ ] Backup and recovery procedures documented
- [ ] Monitoring and alerting configured

## Next Steps

1. **Implement monitoring:** Add Prometheus/Grafana for metrics
2. **Add security:** Implement SASL/SSL authentication
3. **Backup strategy:** Implement automated backup procedures
4. **CI/CD integration:** Automate deployment pipeline
5. **Multi-datacenter:** Extend to multiple data centers

For additional help, see the [Troubleshooting Guide](troubleshooting.md) or check service logs for specific error messages.
