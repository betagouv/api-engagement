#!/bin/sh
set -e

npm run prisma:generate
npm run prisma:migrate:deploy
exec node /app/dist/index.js "$SERVER_TYPE"