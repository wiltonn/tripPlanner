#!/usr/bin/env bash
set -euo pipefail

PORTS=(3000 4000 8081)

killed=0
for port in "${PORTS[@]}"; do
  pids=$(ss -tlnp "sport = :$port" | grep -oP 'pid=\K\d+' || true)
  for pid in $pids; do
    kill "$pid" 2>/dev/null && echo "Killed pid $pid on port $port" && ((killed++)) || true
  done
done

if [ "$killed" -eq 0 ]; then
  echo "No dev servers running"
else
  echo "Shut down $killed process(es)"
fi
