#!/bin/sh

echo "Setting up search collections..."
node /workspace/api/dist/jobs/run-job.js setup-search-collections

exec node /workspace/api/dist/index.js
