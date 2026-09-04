#!/usr/bin/env bash
# Runs `npm audit --omit=dev --audit-level=high` in the current directory, retrying only on
# transient registry-availability errors (npm's legacy /v1/security/audits/quick endpoint has
# been unreliable during its 2026 retirement window — see ISSUE-349). A genuine high/critical
# vulnerability finding fails immediately, without wasting retries.
set -u

max_attempts=5

for attempt in $(seq 1 "$max_attempts"); do
  output=$(npm audit --omit=dev --audit-level=high 2>&1)
  code=$?
  echo "$output"

  if [ "$code" -eq 0 ]; then
    exit 0
  fi

  if echo "$output" | grep -qE "audit endpoint returned an error|ECONNRESET|ETIMEDOUT|ENOTFOUND|503 Service Unavailable|Bad Request.*audits/quick|Gone.*audits/quick"; then
    if [ "$attempt" -lt "$max_attempts" ]; then
      wait_seconds=$((attempt * 15))
      echo "::warning::npm audit hit a transient registry error (attempt ${attempt}/${max_attempts}), retrying in ${wait_seconds}s..."
      sleep "$wait_seconds"
      continue
    fi
    echo "::error::npm audit failed after ${max_attempts} attempts due to registry unavailability"
    exit "$code"
  fi

  # Not a recognized transient-failure signature — likely a real vulnerability finding. Fail fast.
  exit "$code"
done
