#!/bin/bash

# Mantaray-on-IaC Debug Utility
# Provides a quick overview of cluster and application health.

echo "--- NODE STATUS ---"
kubectl get nodes -o wide --show-labels

echo -e "\n--- POD STATUS ---"
kubectl get pods -o wide

echo -e "\n--- SERVICE STATUS ---"
kubectl get svc

echo -e "\n--- RECENT ERRORS (Last 20 Lines of logs for failing pods) ---"
STATUS_ERRORS=$(kubectl get pods | grep -E "Error|CrashLoopBackOff|ImagePullBackOff" | awk '{print $1}')

if [ -z "$STATUS_ERRORS" ]; then
    echo "No pods currently reporting status errors."
else
    for POD in $STATUS_ERRORS; do
        echo "Logs for $POD:"
        kubectl logs "$POD" --tail=20
        echo "---"
    done
fi

echo -e "\n--- RECENT CLUSTER EVENTS ---"
kubectl get events --sort-by='.metadata.creationTimestamp' | tail -n 10
