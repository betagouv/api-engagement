# API

## Deployment

### PM2 Setup

#### Installation and configure

Install pm2

```bash
npm install pm2
```

Start application (used with `npm run start`)

```bash
pm2 start dist/index.js --name api
```

Restart application

```bash
pm2 restart api
```

Stop application (used with `npm run stop`)

```bash
pm2 stop api
```

#### Logs rotation

Install `pm2-logrotate`

```bash
pm2 install pm2-logrotate
```

Configure log rotate to keep the last 2 months of logs

```bash
# Rotate logs when they reach a specific size (optional, e.g., 10 MB)
pm2 set pm2-logrotate:max_size 100M

# Set the retention period to 2 months (60 days)
pm2 set pm2-logrotate:retain 60

# Set the interval to check logs (e.g., daily rotation)
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```
