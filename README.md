# 2108Trade — Professional AI Trading Platform

**The Future of Intelligent Investing.** 2108Trade is a professional AI trading platform that gives you an intelligent investment team working 24/7. Connect your brokerage accounts, set risk parameters, and let the AI analyze markets, execute trades, and monitor positions — with full transparency into every decision.

## 🚀 Features

- **AI-Powered Analysis** — Get intelligent market analysis and trade recommendations
- **Smart Automation** — Let the AI execute trades based on your risk profile
- **Intelligent Risk Controls** — Set custom stop-losses, position limits, and exposure caps
- **Global Markets** — Stocks, ETFs, Forex, Crypto, Commodities, Indices
- **Portfolio Analytics** — Track performance and get actionable insights
- **Trade Explanations** — Every AI decision is fully explained

## 💰 Pricing

One plan, everything included: **$8/month** with a 7-day free trial. No hidden fees.

## 📦 Development

```bash
# Clone the repository
git clone https://github.com/aetherhqofficial/2108Trade.git
cd 2108Trade

# Install dependencies
bun install

# Start the landing page
cd apps/landing
bun run dev

# Start the web app
cd apps/web
bun run dev
```

## 🏗️ Architecture

```
2108Trade/
├── apps/
│   ├── web/          # Next.js main trading application
│   └── landing/      # Marketing landing page
├── packages/
│   └── shared/       # Shared types, utilities, and constants
├── services/         # Backend microservices
└── docs/             # Documentation
```

## 🐳 Docker Deployment

```bash
# Start all core services
docker compose up -d

# Start with TLS (requires certs in nginx/certs/)
docker compose --profile tls up -d

# Start with AI services
docker compose --profile ai up -d

# Start everything
docker compose --profile full up -d
```

## 💾 Backup & Restore

### Automated Backups
The `backup-cron` container runs daily at 2:00 AM UTC, storing gzipped dumps
in the `backup_data` Docker volume. Keeps last 7 daily + last 4 weekly backups.

### Manual Backup
```bash
# With Docker Compose stack running:
docker compose exec backup-cron /usr/local/bin/backup.sh

# Or from host:
DB_HOST=localhost DB_USER=2108trade DB_NAME=2108trade DB_PASSWORD=<pw> ./scripts/backup.sh
```

### Restore
```bash
# Copy backup from volume
docker compose cp backup-cron:/backups/2108trade_YYYY-MM-DD_HHMMSS.sql.gz ./restore.sql.gz

# Restore (interactive — confirms before dropping)
DB_HOST=localhost DB_USER=2108trade DB_NAME=2108trade DB_PASSWORD=<pw> \
  ./scripts/restore.sh ./restore.sql.gz

# Or non-interactive (for CI/automation)
./scripts/restore.sh ./restore.sql.gz --force
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full production deployment guide.

## 📄 License

2108Trade is open-source software licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See [LICENSE](LICENSE) for details.

## 🔗 Links

- [Website](https://2108trade.com)
