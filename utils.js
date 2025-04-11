// Common API functions
const BINANCE_API_URL = "https://api.binance.com/api/v3";

export async function fetchHistoricalData(symbol, interval = "1h", limit = 500) {
    const url = `${BINANCE_API_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API Error (${symbol}): ${response.statusText}`);
        const data = await response.json();
        return data.map(candle => parseFloat(candle[4])); // Extract closing prices
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        return [];
    }
}

// Common calculation functions
export function calculateLogReturns(prices) {
    if (prices.length < 2) return [];
    return prices.slice(1).map((price, i) => Math.log(price / prices[i]));
}

export function calculateCorrelation(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1.length < 2) return null;
    return ss.sampleCorrelation(arr1, arr2);
}

// Common UI functions
export function displayCorrelationMatrix(matrix, containerId) {
    const tickers = Object.keys(matrix);
    const container = document.getElementById(containerId);
    let html = `<h2>Correlation Matrix</h2><table border="1"><tr><th></th>`;

    tickers.forEach(ticker => {
        html += `<th>${ticker}</th>`;
    });
    html += `</tr>`;

    tickers.forEach(ticker => {
        html += `<tr><td><strong>${ticker}</strong></td>`;
        tickers.forEach(t2 => {
            const correlation = matrix[ticker][t2].toFixed(2);
            html += `<td>${correlation}</td>`;
        });
        html += `</tr>`;
    });

    html += `</table>`;
    container.innerHTML = html;
}

// URL parameter handling
export function getQueryParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param)?.toUpperCase();
}

// TradingView widget initialization
export function initializeTradingView(symbol = "BTCUSDT", containerId = "tradingview-widget-container") {
    return new TradingView.widget({
        autosize: true,
        symbol: symbol,
        interval: "1",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerId,
    });
} 