#!/bin/sh
set -e

npm run prisma:generate
exec node /app/dist/index.js "$SERVER_TYPE"