#!/bin/bash

# Kafka Stream Simulator Kubernetes Deployment Script
set -e

# Configuration
PRODUCTION=false
MONITORING=false
AUTOSCALING=false
SECURITY=false
INGRESS=false

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --production     Deploy with production configuration"
    echo "  --monitoring     Enable monitoring (Prometheus/Grafana)"
    echo "  --autoscaling    Enable horizontal pod autoscaling"
    echo "  --security       Enable security features (RBAC, Network Policies)"
    echo "  --ingress        Deploy ingress configuration"
    echo "  --help           Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --production)
            PRODUCTION=true
            shift
            ;;
        --monitoring)
            MONITORING=true
            shift
            ;;
        --autoscaling)
            AUTOSCALING=true
            shift
            ;;
        --security)
            SECURITY=true
            shift
            ;;
        --ingress)
            INGRESS=true
            shift
            ;;
        --help)
            show_usage
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_usage
            ;;
    esac
done

echo "🚀 Starting Kafka Stream Simulator deployment to Kubernetes..."
echo "📋 Configuration: Production=$PRODUCTION, Monitoring=$MONITORING, Autoscaling=$AUTOSCALING, Security=$SECURITY, Ingress=$INGRESS"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if Kubernetes cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    exit 1
fi

echo "✅ Kubernetes cluster is accessible"

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f namespace.yaml

# Create ConfigMaps
echo "⚙️  Creating ConfigMaps..."
kubectl apply -f configmap.yaml

# Create Persistent Volume Claims
echo "💾 Creating Persistent Volume Claims..."
kubectl apply -f persistent-volumes.yaml

# Deploy Zookeeper
echo "🐘 Deploying Zookeeper..."
kubectl apply -f zookeeper.yaml

# Wait for Zookeeper to be ready
echo "⏳ Waiting for Zookeeper to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/zookeeper -n kafka-stream-sim

# Deploy Kafka
echo "📨 Deploying Kafka..."
kubectl apply -f kafka.yaml

# Wait for Kafka to be ready
echo "⏳ Waiting for Kafka to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/kafka -n kafka-stream-sim

# Deploy Producer
echo "📤 Deploying Producer..."
kubectl apply -f producer.yaml

# Deploy Consumer
echo "📥 Deploying Consumer..."
kubectl apply -f consumer.yaml

# Deploy WebSocket Bridge
echo "🌐 Deploying WebSocket Bridge..."
kubectl apply -f websocket-bridge.yaml

# Wait for WebSocket Bridge to be ready
echo "⏳ Waiting for WebSocket Bridge to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/websocket-bridge -n kafka-stream-sim

# Deploy UI
echo "🖥️  Deploying UI..."
kubectl apply -f ui.yaml

# Wait for UI to be ready
echo "⏳ Waiting for UI to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/ui -n kafka-stream-sim

# Deploy optional components based on flags
if [ "$SECURITY" = true ]; then
    echo "🔒 Deploying security components..."
    kubectl apply -f security/rbac.yaml
    kubectl apply -f security/network-policies.yaml
fi

if [ "$MONITORING" = true ]; then
    echo "📊 Deploying monitoring components..."
    kubectl apply -f monitoring/servicemonitor.yaml
fi

if [ "$AUTOSCALING" = true ]; then
    echo "📈 Deploying autoscaling components..."
    kubectl apply -f hpa/producer-hpa.yaml
fi

if [ "$INGRESS" = true ]; then
    echo "🌐 Deploying ingress configuration..."
    kubectl apply -f ingress.yaml
fi

echo "🎉 Deployment completed successfully!"

# Show status
echo "📊 Current deployment status:"
kubectl get pods -n kafka-stream-sim

echo "🌐 Services:"
kubectl get services -n kafka-stream-sim

echo "💾 Persistent Volume Claims:"
kubectl get pvc -n kafka-stream-sim

if [ "$INGRESS" = true ]; then
    echo "🌐 Ingress:"
    kubectl get ingress -n kafka-stream-sim
fi

if [ "$AUTOSCALING" = true ]; then
    echo "📈 Horizontal Pod Autoscalers:"
    kubectl get hpa -n kafka-stream-sim
fi

echo ""
if [ "$INGRESS" = true ]; then
    echo "🔗 Access the application via ingress (configure DNS/hosts file):"
    echo "https://kafka-stream-sim.example.com"
else
    echo "🔗 To access the UI, run:"
    echo "kubectl port-forward service/ui-service 3000:80 -n kafka-stream-sim"
    echo "Then open http://localhost:3000 in your browser"
fi

echo ""
echo "🔗 To access WebSocket Bridge, run:"
echo "kubectl port-forward service/websocket-bridge-service 8080:8080 -n kafka-stream-sim"

echo ""
echo "📖 For more information, see k8s/DEPLOYMENT_GUIDE.md"
