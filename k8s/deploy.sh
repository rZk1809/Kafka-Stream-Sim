#!/bin/bash

# Kafka Stream Simulator Kubernetes Deployment Script
set -e

echo "🚀 Starting Kafka Stream Simulator deployment to Kubernetes..."

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

echo "🎉 Deployment completed successfully!"

# Show status
echo "📊 Current deployment status:"
kubectl get pods -n kafka-stream-sim

echo "🌐 Services:"
kubectl get services -n kafka-stream-sim

echo "💾 Persistent Volume Claims:"
kubectl get pvc -n kafka-stream-sim

echo ""
echo "🔗 To access the UI, run:"
echo "kubectl port-forward service/ui-service 3000:3000 -n kafka-stream-sim"
echo "Then open http://localhost:3000 in your browser"

echo ""
echo "🔗 To access WebSocket Bridge, run:"
echo "kubectl port-forward service/websocket-bridge-service 8080:8080 -n kafka-stream-sim"
