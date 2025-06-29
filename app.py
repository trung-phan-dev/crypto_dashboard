from flask import Flask, render_template, jsonify
import requests
import json
from datetime import datetime, timedelta

app = Flask(__name__)

def get_crypto_data(page=1, per_page=250):
    """Fetch all available crypto data from market"""
    try:
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            'vs_currency': 'usd',
            'order': 'market_cap_desc',
            'per_page': per_page,
            'page': page,
            'sparkline': True,
            'price_change_percentage': '1h,24h,7d,30d'
        }
        response = requests.get(url, params=params, timeout=15)
        return response.json() if response.status_code == 200 else []
    except:
        return []

def get_all_crypto_data():
    """Fetch multiple pages of crypto data"""
    all_data = []
    for page in range(1, 5):  # Get top 1000 coins (4 pages * 250)
        data = get_crypto_data(page=page, per_page=250)
        if data:
            all_data.extend(data)
        else:
            break
    return all_data

def get_market_overview():
    """Get global market data"""
    try:
        response = requests.get("https://api.coingecko.com/api/v3/global", timeout=10)
        return response.json().get('data', {}) if response.status_code == 200 else {}
    except:
        return {}

def get_fear_greed_index():
    """Get Fear & Greed Index"""
    try:
        response = requests.get("https://api.alternative.me/fng/", timeout=10)
        data = response.json()
        return data.get('data', [{}])[0] if response.status_code == 200 else {}
    except:
        return {}

@app.route('/')
def dashboard():
    """Main dashboard route"""
    return render_template('dashboard.html')

@app.route('/api/crypto-data')
def crypto_data():
    """API endpoint for crypto data"""
    return jsonify(get_all_crypto_data())

@app.route('/api/market-overview')
def market_overview():
    """API endpoint for market overview"""
    return jsonify(get_market_overview())

@app.route('/api/fear-greed')
def fear_greed():
    """API endpoint for Fear & Greed Index"""
    return jsonify(get_fear_greed_index())

@app.route('/api/market-movers')
def market_movers():
    """API endpoint for top gainers/losers"""
    data = get_all_crypto_data()
    gainers = sorted([c for c in data if c.get('price_change_percentage_24h', 0) > 0], 
                    key=lambda x: x.get('price_change_percentage_24h', 0), reverse=True)[:5]
    losers = sorted([c for c in data if c.get('price_change_percentage_24h', 0) < 0], 
                   key=lambda x: x.get('price_change_percentage_24h', 0))[:5]
    return jsonify({'gainers': gainers, 'losers': losers})

@app.route('/api/liquidity-metrics')
def liquidity_metrics():
    """API endpoint for liquidity analysis"""
    data = get_all_crypto_data()
    metrics = []
    for crypto in data:
        volume_to_mcap = (crypto.get('total_volume', 0) / crypto.get('market_cap', 1)) * 100
        metrics.append({
            'symbol': crypto.get('symbol', '').upper(),
            'liquidity_ratio': round(volume_to_mcap, 2),
            'volume': crypto.get('total_volume', 0),
            'market_cap': crypto.get('market_cap', 0)
        })
    return jsonify(sorted(metrics, key=lambda x: x['liquidity_ratio'], reverse=True)[:10])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5050)