# Kubernetes Deployment Guide

This guide provides comprehensive instructions for deploying the Kafka Stream Simulator to Kubernetes.

## Prerequisites

### Required Tools
- `kubectl` (v1.20+)
- `helm` (v3.0+) - Optional, for advanced deployments
- Docker (for building custom images)
- Access to a Kubernetes cluster (v1.20+)

### Cluster Requirements
- **Minimum Resources**: 4 CPU cores, 8GB RAM
- **Recommended Resources**: 8 CPU cores, 16GB RAM
- **Storage**: 50GB+ available storage
- **Networking**: LoadBalancer support (for UI access)

## Quick Start

### 1. Deploy with Default Configuration
```bash
# Clone the repository
git clone <repository-url>
cd Kafka-Stream-Sim/k8s

# Deploy all components
./deploy.sh
```

### 2. Verify Deployment
```bash
# Check all pods are running
kubectl get pods -n kafka-stream-sim

# Check services
kubectl get services -n kafka-stream-sim

# Get UI access URL
kubectl get service ui-service -n kafka-stream-sim
```

## Detailed Deployment Steps

### Step 1: Prepare the Environment

#### Create Namespace
```bash
kubectl apply -f namespace.yaml
```

#### Set Default Namespace (Optional)
```bash
kubectl config set-context --current --namespace=kafka-stream-sim
```

### Step 2: Deploy Storage Components

#### Deploy Persistent Volumes
```bash
kubectl apply -f persistent-volumes.yaml
```

#### Verify Storage
```bash
kubectl get pv
kubectl get pvc -n kafka-stream-sim
```

### Step 3: Deploy Kafka Infrastructure

#### Deploy Zookeeper
```bash
kubectl apply -f zookeeper.yaml
```

#### Wait for Zookeeper to be Ready
```bash
kubectl wait --for=condition=ready pod -l app=zookeeper -n kafka-stream-sim --timeout=300s
```

#### Deploy Kafka
```bash
kubectl apply -f kafka.yaml
```

#### Wait for Kafka to be Ready
```bash
kubectl wait --for=condition=ready pod -l app=kafka -n kafka-stream-sim --timeout=300s
```

### Step 4: Deploy Application Components

#### Deploy Configuration
```bash
kubectl apply -f configmap.yaml
```

#### Deploy Producer
```bash
kubectl apply -f producer.yaml
```

#### Deploy Consumer
```bash
kubectl apply -f consumer.yaml
```

#### Deploy WebSocket Bridge
```bash
kubectl apply -f websocket-bridge.yaml
```

#### Deploy UI
```bash
kubectl apply -f ui.yaml
```

### Step 5: Verify Deployment

#### Check Pod Status
```bash
kubectl get pods -n kafka-stream-sim -w
```

#### Check Logs
```bash
# Producer logs
kubectl logs -f deployment/producer -n kafka-stream-sim

# Consumer logs
kubectl logs -f deployment/consumer -n kafka-stream-sim

# WebSocket bridge logs
kubectl logs -f deployment/websocket-bridge -n kafka-stream-sim

# UI logs
kubectl logs -f deployment/ui -n kafka-stream-sim
```

## Production Deployment

### Using Production Values
```bash
# Apply production configuration
kubectl apply -f production-values.yaml

# Deploy with production settings
./deploy.sh --production
```

### Enable Monitoring
```bash
# Deploy Prometheus (if not already installed)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Apply service monitors
kubectl apply -f monitoring/
```

### Configure Ingress
```bash
# Install NGINX Ingress Controller (if not already installed)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx

# Apply ingress configuration
kubectl apply -f ingress.yaml
```

## Scaling

### Manual Scaling
```bash
# Scale producer
kubectl scale deployment producer --replicas=3 -n kafka-stream-sim

# Scale consumer
kubectl scale deployment consumer --replicas=3 -n kafka-stream-sim

# Scale UI
kubectl scale deployment ui --replicas=2 -n kafka-stream-sim
```

### Auto Scaling
```bash
# Enable HPA for producer
kubectl apply -f hpa/producer-hpa.yaml

# Enable HPA for consumer
kubectl apply -f hpa/consumer-hpa.yaml
```

## Troubleshooting

### Common Issues

#### Pods Stuck in Pending State
```bash
# Check node resources
kubectl describe nodes

# Check PVC status
kubectl get pvc -n kafka-stream-sim

# Check events
kubectl get events -n kafka-stream-sim --sort-by='.lastTimestamp'
```

#### Kafka Connection Issues
```bash
# Check Kafka service
kubectl get service kafka-service -n kafka-stream-sim

# Test Kafka connectivity
kubectl run kafka-test --image=confluentinc/cp-kafka:latest --rm -it --restart=Never -- bash
# Inside the pod:
kafka-topics --bootstrap-server kafka-service:9092 --list
```

#### UI Not Accessible
```bash
# Check UI service
kubectl get service ui-service -n kafka-stream-sim

# Check ingress (if configured)
kubectl get ingress -n kafka-stream-sim

# Port forward for testing
kubectl port-forward service/ui-service 8080:80 -n kafka-stream-sim
```

### Debugging Commands
```bash
# Get detailed pod information
kubectl describe pod <pod-name> -n kafka-stream-sim

# Execute into a pod
kubectl exec -it <pod-name> -n kafka-stream-sim -- /bin/bash

# Check resource usage
kubectl top pods -n kafka-stream-sim
kubectl top nodes
```

## Cleanup

### Remove All Components
```bash
./cleanup.sh
```

### Manual Cleanup
```bash
# Delete all deployments
kubectl delete -f . -n kafka-stream-sim

# Delete namespace
kubectl delete namespace kafka-stream-sim

# Delete persistent volumes (if needed)
kubectl delete pv kafka-pv zookeeper-pv
```

## Security Considerations

### Network Policies
- Enable network policies to restrict pod-to-pod communication
- Configure ingress rules for external access only where needed

### RBAC
- Use service accounts with minimal required permissions
- Enable Pod Security Policies or Pod Security Standards

### Secrets Management
- Store sensitive configuration in Kubernetes secrets
- Use external secret management systems for production

## Performance Tuning

### Kafka Optimization
- Adjust `num.network.threads` and `num.io.threads`
- Configure appropriate `log.segment.bytes` and `log.retention.hours`
- Tune JVM heap settings based on available memory

### Resource Limits
- Set appropriate CPU and memory limits for all containers
- Use resource quotas to prevent resource exhaustion
- Monitor resource usage and adjust as needed

## Monitoring and Alerting

### Key Metrics to Monitor
- Kafka message throughput and latency
- Consumer lag
- Pod CPU and memory usage
- Disk usage for Kafka and Zookeeper
- WebSocket connection count

### Recommended Alerts
- High consumer lag
- Pod restart frequency
- Resource utilization thresholds
- Kafka broker availability
