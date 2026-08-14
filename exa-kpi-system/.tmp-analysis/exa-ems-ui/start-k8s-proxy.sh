#!/bin/bash
# Keeps kubectl port-forward alive for local dev.
# The EMS UI docker-compose proxies /api to host.docker.internal:9090,
# which this script forwards to the Docker Desktop K8s ingress controller.

PORT=9090
CONTEXT=docker-desktop
NAMESPACE=ingress-nginx
SERVICE=svc/ingress-nginx-controller
TARGET_PORT=80

cleanup() {
  kill $PF_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

while true; do
  echo "[$(date)] Starting port-forward on :$PORT -> $SERVICE:$TARGET_PORT"
  kubectl --context "$CONTEXT" port-forward -n "$NAMESPACE" "$SERVICE" "$PORT:$TARGET_PORT" &
  PF_PID=$!
  wait $PF_PID
  echo "[$(date)] Port-forward died, restarting in 2s..."
  sleep 2
done
