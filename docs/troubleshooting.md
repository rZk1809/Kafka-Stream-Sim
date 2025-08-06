# Troubleshooting Guide

This comprehensive guide covers common issues, diagnostic procedures, and solutions for the Kafka streaming simulation project.

## Quick Diagnostic Commands

### Check Overall System Status

```bash
# Phase 1 (Docker Compose)
docker-compose ps
docker-compose logs --tail=50

# Phase 2 (Docker Swarm)
docker stack services kafka-sim
docker service ls --filter "name=kafka-sim"
```

### Check Individual Services

```bash
# Phase 1
docker logs kafka-sim-producer --tail=20
docker logs kafka-sim-consumer --tail=20
docker logs kafka-sim-broker --tail=20
docker logs kafka-sim-zookeeper --tail=20

# Phase 2
docker service logs kafka-sim_producer --tail=20
docker service logs kafka-sim_consumer --tail=20
docker service logs kafka-sim_kafka-1 --tail=20
docker service logs kafka-sim_zookeeper-1 --tail=20
```

### Check Resource Usage

```bash
# Container resource usage
docker stats

# System resources
docker system df
docker system info
```

## Common Issues and Solutions

### 1. Services Not Starting

#### Symptoms
- Containers exit immediately
- Health checks failing
- Services stuck in "starting" state

#### Diagnostic Steps

```bash
# Check container logs
docker-compose logs <service-name>

# Check exit codes
docker ps -a

# Verify image builds
docker images | grep kafka-stream-sim
```

#### Common Causes and Solutions

**Port Conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :9092
netstat -tulpn | grep :2181

# Solution: Stop conflicting services or change ports
sudo systemctl stop kafka  # If system Kafka is running
```

**Insufficient Memory:**
```bash
# Check available memory
free -h
docker system info | grep Memory

# Solution: Increase Docker memory limit or reduce service memory requirements
```

**Missing Dependencies:**
```bash
# Rebuild images
docker-compose build --no-cache

# Check Python dependencies
docker run --rm kafka-stream-sim_producer pip list
```

### 2. Kafka Broker Issues

#### Symptoms
- Broker not accepting connections
- Topics not being created
- Producer/consumer connection failures

#### Diagnostic Steps

```bash
# Test Kafka connectivity
docker exec kafka-sim-broker kafka-broker-api-versions --bootstrap-server localhost:9092

# Check Kafka logs
docker logs kafka-sim-broker | grep ERROR

# List topics
docker exec kafka-sim-broker kafka-topics --bootstrap-server localhost:9092 --list
```

#### Solutions

**Zookeeper Connection Issues:**
```bash
# Check Zookeeper status
docker exec kafka-sim-zookeeper zkCli.sh -server localhost:2181 ls /

# Restart Zookeeper first, then Kafka
docker-compose restart zookeeper kafka
```

**Advertised Listeners Configuration:**
```bash
# For external access, ensure correct advertised listeners
# In docker-compose.yml:
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
```

**Topic Creation Failures:**
```bash
# Manual topic creation
docker exec kafka-sim-broker kafka-topics \
  --bootstrap-server localhost:9092 \
  --create \
  --topic stock_ticks \
  --partitions 3 \
  --replication-factor 1
```

### 3. Producer Issues

#### Symptoms
- No messages being produced
- Producer connection timeouts
- High error rates in producer logs

#### Diagnostic Steps

```bash
# Check producer logs
docker logs kafka-sim-producer | grep -E "(ERROR|WARN)"

# Test manual message production
echo "test message" | docker exec -i kafka-sim-broker \
  kafka-console-producer --bootstrap-server localhost:9092 --topic stock_ticks
```

#### Solutions

**Connection Timeouts:**
```bash
# Increase timeout values in producer code
request_timeout_ms=30000
retry_backoff_ms=100
```

**Serialization Errors:**
```bash
# Check message format
docker logs kafka-sim-producer | grep "serialization"

# Verify JSON format in producer code
```

**Kafka Not Ready:**
```bash
# Wait for Kafka to be fully ready
./scripts/validate-cluster.sh
```

### 4. Consumer Issues

#### Symptoms
- Consumer not receiving messages
- Consumer group rebalancing issues
- Offset commit failures

#### Diagnostic Steps

```bash
# Check consumer logs
docker logs kafka-sim-consumer | grep -E "(ERROR|WARN)"

# Check consumer group status
docker exec kafka-sim-broker kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe \
  --group stock_tick_consumers
```

#### Solutions

**Consumer Lag:**
```bash
# Check consumer group lag
docker exec kafka-sim-broker kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe \
  --group stock_tick_consumers

# Scale up consumers if needed
docker-compose up -d --scale consumer=3
```

**Offset Issues:**
```bash
# Reset consumer group offsets
docker exec kafka-sim-broker kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group stock_tick_consumers \
  --reset-offsets \
  --to-earliest \
  --topic stock_ticks \
  --execute
```

**Deserialization Errors:**
```bash
# Check message format compatibility
docker exec kafka-sim-broker kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic stock_ticks \
  --from-beginning \
  --max-messages 5
```

### 5. Docker Swarm Issues (Phase 2)

#### Symptoms
- Services not deploying
- Node placement failures
- Network connectivity issues

#### Diagnostic Steps

```bash
# Check Swarm status
docker info | grep Swarm

# Check node labels
docker node ls
docker node inspect <node-name> --format '{{.Spec.Labels}}'

# Check service placement
docker service ps kafka-sim_kafka-1
```

#### Solutions

**Node Label Issues:**
```bash
# Add missing labels
NODE_NAME=$(docker node ls --format "{{.Hostname}}" --filter "role=manager")
docker node update --label-add kafka-1=true $NODE_NAME
```

**Network Issues:**
```bash
# Check overlay network
docker network ls
docker network inspect kafka-sim_kafka-cluster

# Recreate network if needed
docker stack rm kafka-sim
docker network rm kafka-sim_kafka-cluster
docker stack deploy -c docker-stack.yml kafka-sim
```

**Resource Constraints:**
```bash
# Check node resources
docker node ls
docker system info

# Adjust resource limits in docker-stack.yml
```

### 6. Performance Issues

#### Symptoms
- High latency
- Low throughput
- Resource exhaustion

#### Diagnostic Steps

```bash
# Monitor resource usage
docker stats

# Check message rates
./scripts/create-prod-topics.sh monitor stock_ticks 60

# Check consumer lag
./scripts/create-prod-topics.sh groups
```

#### Solutions

**Memory Issues:**
```bash
# Increase memory limits
# In docker-compose.yml or docker-stack.yml:
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G
```

**CPU Issues:**
```bash
# Add CPU limits
deploy:
  resources:
    limits:
      cpus: '1.0'
    reservations:
      cpus: '0.5'
```

**Network Bottlenecks:**
```bash
# Optimize Kafka settings
KAFKA_SOCKET_SEND_BUFFER_BYTES: 102400
KAFKA_SOCKET_RECEIVE_BUFFER_BYTES: 102400
KAFKA_SOCKET_REQUEST_MAX_BYTES: 104857600
```

## Advanced Troubleshooting

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# In docker-compose.yml
environment:
  LOG_LEVEL: DEBUG
  KAFKA_LOG4J_ROOT_LOGLEVEL: DEBUG
```

### Network Debugging

```bash
# Test network connectivity
docker exec kafka-sim-producer ping kafka-sim-broker
docker exec kafka-sim-consumer ping kafka-sim-broker

# Check DNS resolution
docker exec kafka-sim-producer nslookup kafka-sim-broker
```

### Data Debugging

```bash
# Check Kafka data directories
docker exec kafka-sim-broker ls -la /var/lib/kafka/data

# Check Zookeeper data
docker exec kafka-sim-zookeeper ls -la /var/lib/zookeeper/data
```

### Performance Profiling

```bash
# JVM heap dumps (if needed)
docker exec kafka-sim-broker jmap -dump:format=b,file=/tmp/heap.hprof <pid>

# Thread dumps
docker exec kafka-sim-broker jstack <pid>
```

## Recovery Procedures

### Complete System Recovery

```bash
# Phase 1
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Phase 2
docker stack rm kafka-sim
docker volume prune -f
docker stack deploy -c docker-stack.yml kafka-sim
```

### Partial Recovery

```bash
# Restart specific services
docker-compose restart kafka producer consumer

# Or for Swarm
docker service update --force kafka-sim_kafka-1
```

### Data Recovery

```bash
# Backup volumes before recovery
docker run --rm -v kafka-stream-sim_kafka-data:/data -v $(pwd):/backup alpine tar czf /backup/kafka-backup.tar.gz /data

# Restore from backup
docker run --rm -v kafka-stream-sim_kafka-data:/data -v $(pwd):/backup alpine tar xzf /backup/kafka-backup.tar.gz -C /
```

## Monitoring and Alerting

### Health Checks

```bash
# Automated health check script
#!/bin/bash
./scripts/validate-cluster.sh > /tmp/health-check.log 2>&1
if [ $? -ne 0 ]; then
    echo "ALERT: Kafka cluster health check failed"
    cat /tmp/health-check.log
fi
```

### Log Monitoring

```bash
# Monitor for errors
docker-compose logs -f | grep -E "(ERROR|FATAL|Exception)"

# Set up log rotation
docker-compose logs --tail=1000 > kafka-logs-$(date +%Y%m%d).log
```

## Prevention Best Practices

### Resource Management

1. **Set appropriate resource limits**
2. **Monitor disk space regularly**
3. **Implement log rotation**
4. **Use health checks consistently**

### Configuration Management

1. **Version control all configuration files**
2. **Test configuration changes in development first**
3. **Document all customizations**
4. **Implement configuration validation**

### Operational Procedures

1. **Regular backup procedures**
2. **Disaster recovery testing**
3. **Performance baseline monitoring**
4. **Security updates and patches**

## Getting Help

### Log Collection

When seeking help, collect these logs:

```bash
# Collect all logs
mkdir -p troubleshooting-logs/$(date +%Y%m%d-%H%M%S)
cd troubleshooting-logs/$(date +%Y%m%d-%H%M%S)

# Phase 1
docker-compose logs > docker-compose.log
docker-compose ps > services-status.txt
docker stats --no-stream > resource-usage.txt

# Phase 2
docker stack services kafka-sim > stack-services.txt
docker service ls > all-services.txt
for service in $(docker service ls --filter "name=kafka-sim" --format "{{.Name}}"); do
    docker service logs $service > ${service}.log
done
```

### System Information

```bash
# System info
docker version > docker-version.txt
docker-compose version > docker-compose-version.txt
docker system info > docker-system-info.txt
uname -a > system-info.txt
```

### Configuration Files

Include these files when reporting issues:
- `docker-compose.yml`
- `docker-stack.yml`
- Custom configuration files
- Environment variable files

## Contact and Support

For additional support:

1. **Check project documentation** in the `docs/` directory
2. **Review GitHub issues** for similar problems
3. **Create detailed issue reports** with logs and configuration
4. **Include system information** and reproduction steps

Remember to sanitize any sensitive information before sharing logs or configuration files.
