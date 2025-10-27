#!/bin/sh

npm run db:migrate
exec "$@"
