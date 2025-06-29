# Crypto Dashboard

A minimal Flask-based cryptocurrency dashboard with real-time price tracking and interactive charts.

## Features

- Real-time crypto prices for popular coins (Bitcoin, Ethereum, BNB, Cardano, Solana, Polkadot)
- Interactive price trend charts
- Market cap distribution visualization
- Responsive design
- Auto-refresh every 30 seconds

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py
```

Visit `http://localhost:5050` to view the dashboard.

## Docker Deployment

```bash
# Build image
docker build -t crypto-dashboard .

# Run container
docker run -p 5050:5050 crypto-dashboard
```

## Harness CI/CD

The `.harness/pipeline.yaml` contains the deployment pipeline configuration. Update the Docker repository reference before deploying.

## API

- `GET /` - Dashboard UI
- `GET /api/crypto-data` - JSON crypto data endpoint