#!/bin/sh

npm run prisma:migrate:deploy
exec node /app/dist/index.js

