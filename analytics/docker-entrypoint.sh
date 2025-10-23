#!/bin/sh

npm run db:migrate
exec node dist/jobs/run-job.js "$@"