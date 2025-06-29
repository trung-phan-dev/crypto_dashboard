let priceChart, dominanceChart, volumeChart, modalPriceChart;
let cryptoData = [];
let currentZoom = 1;
let modalZoom = 1;

const chartColors = {
    primary: '#00ff88',
    secondary: '#ff4444',
    accent: '#ffaa00',
    background: 'rgba(0, 255, 136, 0.1)',
    grid: 'rgba(0, 255, 136, 0.2)'
};



async function fetchData(endpoint) {
    try {
        const response = await fetch(endpoint);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return null;
    }
}

function updateMarketStats() {
    fetchData('/api/market-overview').then(data => {
        if (data && data.total_market_cap) {
            const marketCap = (data.total_market_cap.usd / 1e12).toFixed(2);
            document.getElementById('totalMarketCap').querySelector('.value').textContent = `$${marketCap}T`;
            
            // BTC Dominance
            const btcDominance = data.market_cap_percentage?.btc || 0;
            document.getElementById('btcDominance').querySelector('.value').textContent = `${btcDominance.toFixed(1)}%`;
        }
    });

    fetchData('/api/fear-greed').then(data => {
        if (data && data.value) {
            const fgElement = document.getElementById('fearGreedIndex').querySelector('.value');
            fgElement.textContent = `${data.value}`;
            fgElement.style.color = data.value > 50 ? '#00ff88' : '#ff4444';
        }
    });
    
    // Calculate Crypto VIX (volatility index)
    if (cryptoData.length > 0) {
        const avgVolatility = cryptoData.reduce((sum, crypto) => 
            sum + Math.abs(crypto.price_change_percentage_24h || 0), 0) / cryptoData.length;
        const vixElement = document.getElementById('volatilityIndex').querySelector('.value');
        vixElement.textContent = avgVolatility.toFixed(1);
        vixElement.style.color = avgVolatility > 5 ? '#ff4444' : avgVolatility > 3 ? '#ffaa00' : '#00ff88';
    }
}

function filterPortfolio() {
    const filter = document.getElementById('portfolioFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredData = cryptoData.filter(crypto => {
        const matchesSearch = !searchTerm || 
            crypto.name.toLowerCase().includes(searchTerm) || 
            crypto.symbol.toLowerCase().includes(searchTerm);
            
        if (!matchesSearch) return false;
        
        switch(filter) {
            case 'top-100': return crypto.market_cap_rank <= 100;
            case 'large-cap': return crypto.market_cap > 10e9;
            case 'mid-cap': return crypto.market_cap > 1e9 && crypto.market_cap <= 10e9;
            case 'small-cap': return crypto.market_cap <= 1e9;
            case 'meme': return ['shib', 'doge', 'pepe', 'floki', 'bonk'].includes(crypto.symbol);
            case 'defi': return ['uni', 'aave', 'comp', 'mkr', 'snx', 'crv', 'sushi'].includes(crypto.symbol);
            default: return true;
        }
    });
    
    createCryptoTable(filteredData);
}

function searchCoins() {
    filterPortfolio();
}

function createCryptoTable(data) {
    const table = document.getElementById('cryptoTable');
    const displayCount = data.length > 50 ? 50 : data.length;
    table.innerHTML = data.slice(0, displayCount).map(crypto => {
        const change24h = crypto.price_change_percentage_24h || 0;
        const changeClass = change24h >= 0 ? 'positive' : 'negative';
        const changeSymbol = change24h >= 0 ? '+' : '';
        
        // Risk assessment based on volatility and volume
        const volatility = Math.abs(change24h);
        const volumeRatio = (crypto.total_volume / crypto.market_cap) * 100;
        let riskClass = 'risk-low';
        if (volatility > 15 || volumeRatio > 20) riskClass = 'risk-high';
        else if (volatility > 8 || volumeRatio > 10) riskClass = 'risk-medium';
        
        return `
            <div class="crypto-row">
                <img src="${crypto.image}" alt="${crypto.symbol}" class="crypto-icon">
                <div>
                    <div class="crypto-symbol ${riskClass}">${crypto.symbol.toUpperCase()}</div>
                    <div class="crypto-name">${crypto.name}</div>
                </div>
                <div class="crypto-price">$${crypto.current_price.toLocaleString()}</div>
                <div class="crypto-change ${changeClass}">${changeSymbol}${change24h.toFixed(2)}%</div>
                <div class="crypto-volume">${(crypto.total_volume / 1e9).toFixed(1)}B</div>
                <canvas class="sparkline" data-sparkline="${crypto.sparkline_in_7d?.price?.slice(-20).join(',') || ''}"></canvas>
            </div>
        `;
    }).join('');
    
    setTimeout(drawSparklines, 100);
}

function drawSparklines() {
    document.querySelectorAll('.sparkline').forEach(canvas => {
        const ctx = canvas.getContext('2d');
        const data = canvas.dataset.sparkline.split(',').map(Number).filter(n => !isNaN(n));
        
        if (data.length < 2) return;
        
        canvas.width = 60;
        canvas.height = 20;
        
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        
        ctx.strokeStyle = data[data.length - 1] > data[0] ? '#00ff88' : '#ff4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = (index / (data.length - 1)) * 60;
            const y = 20 - ((value - min) / range) * 20;
            index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        
        ctx.stroke();
    });
}

function createPriceChart(data) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    if (priceChart) priceChart.destroy();
    
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.slice(0, 10).map(crypto => crypto.symbol.toUpperCase()),
            datasets: [{
                label: 'Price (USD)',
                data: data.slice(0, 10).map(crypto => crypto.current_price),
                borderColor: chartColors.primary,
                backgroundColor: chartColors.background,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#000',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: chartColors.primary },
                    grid: { color: chartColors.grid }
                },
                y: {
                    type: 'logarithmic',
                    ticks: { 
                        color: chartColors.primary,
                        callback: value => '$' + value.toLocaleString()
                    },
                    grid: { color: chartColors.grid }
                }
            }
        }
    });
    

}

function createDominanceChart(data) {
    const ctx = document.getElementById('dominanceChart').getContext('2d');
    
    if (dominanceChart) dominanceChart.destroy();
    
    const colors = ['#00ff88', '#ff4444', '#ffaa00', '#00aaff', '#aa00ff', '#ff8800', '#88ff00', '#ff0088'];
    
    dominanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.slice(0, 8).map(crypto => crypto.symbol.toUpperCase()),
            datasets: [{
                data: data.slice(0, 8).map(crypto => crypto.market_cap),
                backgroundColor: colors,
                borderColor: '#000',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: chartColors.primary, font: { size: 9 } }
                }
            }
        }
    });
}

function createVolumeChart(data) {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    
    if (volumeChart) volumeChart.destroy();
    
    volumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.slice(0, 8).map(crypto => crypto.symbol.toUpperCase()),
            datasets: [{
                label: 'Volume (24h)',
                data: data.slice(0, 8).map(crypto => crypto.total_volume / 1e9),
                backgroundColor: data.slice(0, 8).map(crypto => 
                    crypto.price_change_percentage_24h >= 0 ? 
                    'rgba(0, 255, 136, 0.7)' : 'rgba(255, 68, 68, 0.7)'
                ),
                borderColor: data.slice(0, 8).map(crypto => 
                    crypto.price_change_percentage_24h >= 0 ? '#00ff88' : '#ff4444'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: chartColors.primary },
                    grid: { color: chartColors.grid }
                },
                y: {
                    ticks: { 
                        color: chartColors.primary,
                        callback: value => value.toFixed(1) + 'B'
                    },
                    grid: { color: chartColors.grid }
                }
            }
        }
    });
}

function createHeatmap(data) {
    const heatmapGrid = document.getElementById('heatmapGrid');
    heatmapGrid.innerHTML = data.slice(0, 15).map(crypto => {
        const change = crypto.price_change_percentage_24h || 0;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        
        return `
            <div class="heatmap-cell ${changeClass}">
                <div>${crypto.symbol.toUpperCase()}</div>
                <div>${change >= 0 ? '+' : ''}${change.toFixed(1)}%</div>
            </div>
        `;
    }).join('');
}

function updateMarketMovers() {
    fetchData('/api/market-movers').then(data => {
        if (!data) return;
        
        const moversContainer = document.getElementById('moversContainer');
        moversContainer.innerHTML = `
            <div class="mover-section">
                <div class="mover-title">🚀 Top Gainers</div>
                ${data.gainers.slice(0, 3).map(crypto => `
                    <div class="mover-item">
                        <span class="mover-symbol">${crypto.symbol.toUpperCase()}</span>
                        <span class="mover-change positive">+${crypto.price_change_percentage_24h.toFixed(1)}%</span>
                    </div>
                `).join('')}
            </div>
            <div class="mover-section">
                <div class="mover-title">📉 Top Losers</div>
                ${data.losers.slice(0, 3).map(crypto => `
                    <div class="mover-item">
                        <span class="mover-symbol">${crypto.symbol.toUpperCase()}</span>
                        <span class="mover-change negative">${crypto.price_change_percentage_24h.toFixed(1)}%</span>
                    </div>
                `).join('')}
            </div>
        `;
    });
}

function updateLiquidityMetrics() {
    fetchData('/api/liquidity-metrics').then(data => {
        if (!data) return;
        
        const liquidityList = document.getElementById('liquidityList');
        liquidityList.innerHTML = data.slice(0, 8).map(metric => {
            let riskClass = 'risk-low';
            if (metric.liquidity_ratio > 15) riskClass = 'risk-high';
            else if (metric.liquidity_ratio > 8) riskClass = 'risk-medium';
            
            return `
                <div class="liquidity-item">
                    <span class="liquidity-symbol">${metric.symbol}</span>
                    <span class="liquidity-ratio ${riskClass}">${metric.liquidity_ratio}%</span>
                </div>
            `;
        }).join('');
    });
}

function generateRiskAlerts(data) {
    const alerts = [];
    
    data.forEach(crypto => {
        const change24h = crypto.price_change_percentage_24h || 0;
        const volumeRatio = (crypto.total_volume / crypto.market_cap) * 100;
        
        // High volatility alert
        if (Math.abs(change24h) > 15) {
            alerts.push({
                type: 'high-risk',
                icon: 'fa-exclamation-triangle',
                message: `${crypto.symbol.toUpperCase()} extreme volatility: ${Math.abs(change24h).toFixed(1)}%`
            });
        }
        
        // Liquidity risk
        if (volumeRatio < 2) {
            alerts.push({
                type: 'liquidity-risk',
                icon: 'fa-tint',
                message: `${crypto.symbol.toUpperCase()} low liquidity risk detected`
            });
        }
        
        // Unusual volume
        if (volumeRatio > 25) {
            alerts.push({
                type: 'volume-spike',
                icon: 'fa-chart-bar',
                message: `${crypto.symbol.toUpperCase()} unusual volume spike: ${volumeRatio.toFixed(1)}%`
            });
        }
    });
    
    const alertsList = document.getElementById('alertsList');
    alertsList.innerHTML = alerts.length > 0 ? 
        alerts.slice(0, 6).map(alert => `
            <div class="alert-item ${alert.type}">
                <i class="fas ${alert.icon} alert-icon"></i>
                <span>${alert.message}</span>
            </div>
        `).join('') : 
        '<div class="alert-item"><i class="fas fa-shield-alt alert-icon"></i><span>All systems normal</span></div>';
}

async function updateDashboard() {
    const refreshIndicator = document.getElementById('refreshIndicator');
    refreshIndicator.style.color = '#ffaa00';
    
    const data = await fetchData('/api/crypto-data');
    if (data && data.length > 0) {
        cryptoData = data;
        filterPortfolio(); // Apply current filter to new data
        createPriceChart(data.slice(0, 20));
        createDominanceChart(data.slice(0, 10));
        createVolumeChart(data.slice(0, 10));
        createHeatmap(data.slice(0, 20));
        generateRiskAlerts(data);
        updateMarketMovers();
        updateLiquidityMetrics();
    }
    
    updateMarketStats();
    refreshIndicator.style.color = '#00ff88';
}

// Zoom functions
function zoomChart(direction) {
    if (!priceChart) return;
    
    const zoomFactor = direction === 'in' ? 1.2 : 0.8;
    currentZoom *= zoomFactor;
    
    const dataLength = priceChart.data.labels.length;
    if (direction === 'in') {
        priceChart.options.scales.x.min = Math.floor(dataLength * 0.2);
        priceChart.options.scales.x.max = Math.floor(dataLength * 0.8);
    } else {
        priceChart.options.scales.x.min = undefined;
        priceChart.options.scales.x.max = undefined;
    }
    priceChart.update();
}

function resetZoom() {
    if (!priceChart) return;
    currentZoom = 1;
    priceChart.options.scales.x.min = undefined;
    priceChart.options.scales.x.max = undefined;
    priceChart.update();
}

function zoomModalChart(direction) {
    if (!modalPriceChart) return;
    
    const zoomFactor = direction === 'in' ? 1.2 : 0.8;
    modalZoom *= zoomFactor;
    
    const dataLength = modalPriceChart.data.labels.length;
    if (direction === 'in') {
        modalPriceChart.options.scales.x.min = Math.floor(dataLength * 0.1);
        modalPriceChart.options.scales.x.max = Math.floor(dataLength * 0.9);
    } else {
        modalPriceChart.options.scales.x.min = undefined;
        modalPriceChart.options.scales.x.max = undefined;
    }
    modalPriceChart.update();
}

function resetModalZoom() {
    if (!modalPriceChart) return;
    modalZoom = 1;
    modalPriceChart.options.scales.x.min = undefined;
    modalPriceChart.options.scales.x.max = undefined;
    modalPriceChart.update();
}

function openChartModal() {
    document.getElementById('chartModal').style.display = 'block';
    setTimeout(() => {
        if (cryptoData.length > 0) {
            createModalChart(cryptoData);
        }
    }, 100);
}

function closeChartModal() {
    document.getElementById('chartModal').style.display = 'none';
    if (modalPriceChart) {
        modalPriceChart.destroy();
        modalPriceChart = null;
    }
}

function createModalChart(data) {
    const ctx = document.getElementById('modalPriceChart').getContext('2d');
    
    if (modalPriceChart) modalPriceChart.destroy();
    
    modalPriceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.slice(0, 15).map(crypto => crypto.symbol.toUpperCase()),
            datasets: [{
                label: 'Price (USD)',
                data: data.slice(0, 15).map(crypto => crypto.current_price),
                borderColor: chartColors.primary,
                backgroundColor: chartColors.background,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#000',
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: chartColors.primary, font: { size: 14 } },
                    grid: { color: chartColors.grid }
                },
                y: {
                    type: 'logarithmic',
                    ticks: { 
                        color: chartColors.primary,
                        font: { size: 14 },
                        callback: value => '$' + value.toLocaleString()
                    },
                    grid: { color: chartColors.grid }
                }
            }
        }
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('chartModal');
    if (event.target === modal) {
        closeChartModal();
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    setInterval(updateDashboard, 12000);
    
    document.getElementById('portfolioFilter').addEventListener('change', filterPortfolio);
    
    // Update total coin count in navbar
    setTimeout(() => {
        if (cryptoData.length > 0) {
            document.querySelector('.nav-brand span').textContent = `CRYPTO TERMINAL (${cryptoData.length} COINS)`;
        }
    }, 2000);
});