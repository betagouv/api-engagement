#!/bin/sh

echo "🚀 Running DB migration..."
npm run db:migrate

if [ -n "${JOB_CMD:-}" ]; then
  echo "🔧 Executing JOB_CMD: $JOB_CMD"
  exec sh -lc "$JOB_CMD"
fi