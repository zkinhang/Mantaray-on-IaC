#!/bin/bash

# Fetches and displays the robot parameters from the Kubernetes ConfigMap.

echo "--- CURRENT ROBOT PARAMETERS (ConfigMap: robot-params) ---"
kubectl get configmap robot-params -o jsonpath='{.data.robot_params\.json}' | jq .

if [ $? -ne 0 ]; then
    echo "Error: Could not retrieve ConfigMap or jq is not installed."
    echo "Full ConfigMap description:"
    kubectl describe configmap robot-params
fi
