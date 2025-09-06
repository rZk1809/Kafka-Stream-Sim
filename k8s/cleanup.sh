#!/bin/bash

# Kafka Stream Simulator Kubernetes Cleanup Script
set -e

echo "🧹 Starting Kafka Stream Simulator cleanup from Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace kafka-stream-sim &> /dev/null; then
    echo "ℹ️  Namespace kafka-stream-sim does not exist, nothing to clean up"
    exit 0
fi

echo "🗑️  Deleting all resources in kafka-stream-sim namespace..."

# Delete all deployments
kubectl delete deployment --all -n kafka-stream-sim --ignore-not-found=true

# Delete all services
kubectl delete service --all -n kafka-stream-sim --ignore-not-found=true

# Delete all persistent volume claims
kubectl delete pvc --all -n kafka-stream-sim --ignore-not-found=true

# Delete all configmaps
kubectl delete configmap --all -n kafka-stream-sim --ignore-not-found=true

# Delete the namespace (this will delete any remaining resources)
kubectl delete namespace kafka-stream-sim --ignore-not-found=true

echo "✅ Cleanup completed successfully!"
