# Kafka Stream Simulator - Kubernetes Deployment

This directory contains all the necessary Kubernetes manifests and scripts to deploy the Kafka Stream Simulator in a Kubernetes cluster.

## 🏗️ Architecture

The deployment consists of the following components:

- **Zookeeper**: Coordination service for Kafka
- **Kafka**: Message broker for streaming data
- **Producer**: Generates mock stock market data
- **Consumer**: Processes messages from Kafka
- **WebSocket Bridge**: Provides real-time data to the UI
- **UI**: React-based web interface

## 📋 Prerequisites

- Kubernetes cluster (v1.20+)
- `kubectl` configured to access your cluster
- At least 4 CPU cores and 8GB RAM available
- Storage provisioner for persistent volumes

## 🚀 Quick Start

### Basic Deployment
```bash
# Deploy with default settings
./deploy.sh
```

### Production Deployment
```bash
# Deploy with all production features
./deploy.sh --production --monitoring --autoscaling --security --ingress
```

## 📁 File Structure

```
k8s/
├── README.md                    # This file
├── DEPLOYMENT_GUIDE.md          # Detailed deployment guide
├── deploy.sh                    # Main deployment script
├── cleanup.sh                   # Cleanup script
├── production-values.yaml       # Production configuration values
├── namespace.yaml               # Namespace definition
├── configmap.yaml              # Configuration maps
├── persistent-volumes.yaml     # Storage definitions
├── zookeeper.yaml              # Zookeeper deployment
├── kafka.yaml                  # Kafka deployment
├── producer.yaml               # Producer deployment
├── consumer.yaml               # Consumer deployment
├── websocket-bridge.yaml       # WebSocket bridge deployment
├── ui.yaml                     # UI deployment
├── ingress.yaml                # Ingress configuration
├── hpa/                        # Horizontal Pod Autoscaler configs
│   └── producer-hpa.yaml
├── monitoring/                 # Monitoring configurations
│   └── servicemonitor.yaml
└── security/                   # Security configurations
    ├── rbac.yaml
    └── network-policies.yaml
```

## 🔧 Configuration Options

### Deployment Flags

| Flag | Description |
|------|-------------|
| `--production` | Use production-ready resource limits and replicas |
| `--monitoring` | Deploy Prometheus monitoring and Grafana dashboards |
| `--autoscaling` | Enable Horizontal Pod Autoscaling |
| `--security` | Deploy RBAC and Network Policies |
| `--ingress` | Configure ingress for external access |

### Environment Variables

The application can be configured using the ConfigMap in `configmap.yaml`:

```yaml
KAFKA_BOOTSTRAP_SERVERS: "kafka-service:9092"
KAFKA_TOPIC: "stock-prices"
PRODUCER_INTERVAL: "1000"
WEBSOCKET_PORT: "8080"
```

## 📊 Monitoring

When deployed with `--monitoring`, the following monitoring components are included:

- **ServiceMonitor**: Prometheus scraping configuration
- **PrometheusRule**: Alerting rules for common issues
- **Grafana Dashboard**: Pre-configured dashboard for metrics visualization

### Key Metrics

- Message throughput (messages/second)
- Consumer lag
- Pod CPU and memory usage
- WebSocket connection count
- Kafka broker health

## 🔒 Security

When deployed with `--security`, the following security features are enabled:

- **RBAC**: Role-based access control with minimal permissions
- **Network Policies**: Restrict pod-to-pod communication
- **Pod Security Policies**: Enforce security standards
- **Service Accounts**: Dedicated service accounts for each component

## 📈 Scaling

### Manual Scaling
```bash
# Scale producer
kubectl scale deployment producer --replicas=3 -n kafka-stream-sim

# Scale consumer
kubectl scale deployment consumer --replicas=5 -n kafka-stream-sim
```

### Auto Scaling
When deployed with `--autoscaling`, HPA is configured for:
- CPU utilization (70% threshold)
- Memory utilization (80% threshold)
- Custom metrics (consumer lag)

## 🌐 Access

### Local Access (Port Forwarding)
```bash
# UI
kubectl port-forward service/ui-service 3000:80 -n kafka-stream-sim

# WebSocket Bridge
kubectl port-forward service/websocket-bridge-service 8080:8080 -n kafka-stream-sim
```

### External Access (Ingress)
When deployed with `--ingress`:
- UI: `https://kafka-stream-sim.example.com`
- WebSocket: `wss://kafka-stream-sim.example.com/ws`

## 🔍 Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n kafka-stream-sim
kubectl describe pod <pod-name> -n kafka-stream-sim
```

### View Logs
```bash
# All components
kubectl logs -f deployment/producer -n kafka-stream-sim
kubectl logs -f deployment/consumer -n kafka-stream-sim
kubectl logs -f deployment/websocket-bridge -n kafka-stream-sim
kubectl logs -f deployment/ui -n kafka-stream-sim
```

### Common Issues

1. **Pods stuck in Pending**: Check resource availability and PVC status
2. **Kafka connection issues**: Verify Kafka service and network policies
3. **UI not loading**: Check ingress configuration and service endpoints

## 🧹 Cleanup

```bash
# Remove all components
./cleanup.sh

# Or manually
kubectl delete namespace kafka-stream-sim
```

## 📚 Additional Resources

- [Detailed Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Production Configuration](production-values.yaml)
- [Security Best Practices](security/)
- [Monitoring Setup](monitoring/)

## 🤝 Contributing

When adding new Kubernetes manifests:

1. Follow the existing naming conventions
2. Add appropriate labels and annotations
3. Include resource limits and requests
4. Update this README and the deployment script
5. Test in a development cluster first

## 📄 License

This project is licensed under the MIT License - see the main project LICENSE file for details.
