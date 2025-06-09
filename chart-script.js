import { fetchHistoricalData, calculateLogReturns, calculateCorrelation, displayCorrelationMatrix, getQueryParameter, initializeTradingView } from './utils.js';

// Get the symbol from the URL
function getQueryParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param)?.toUpperCase();
}

// Fetch historical price data from Binance API
async function fetchHistoricalData(symbol, interval = "1h", limit = 500) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    try {
        console.log(`Fetching historical data for ${symbol}...`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API Error (${symbol}): ${response.statusText}`);
        const data = await response.json();
        
        return data.map(candle => parseFloat(candle[4])); // Extract closing prices
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        return [];
    }
}

// Calculate Pearson correlation
function calculateCorrelation(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1.length < 2) return null;
    return ss.sampleCorrelation(arr1, arr2);
}

// Generate correlation matrix for multiple pairs
async function generateCorrelationMatrix(primaryTicker) {
    const tickers = [primaryTicker, "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT"];
    const historicalData = {};

    console.log("Fetching data for correlation matrix...");

    await Promise.all(tickers.map(async (ticker) => {
        historicalData[ticker] = await fetchHistoricalData(ticker, "1h", 500);
    }));

    const validTickers = tickers.filter(ticker => historicalData[ticker].length > 2);
    if (validTickers.length < 2) {
        console.error("Not enough valid data for correlation matrix.");
        return;
    }

    const logReturns = {};
    validTickers.forEach(ticker => {
        logReturns[ticker] = calculateLogReturns(historicalData[ticker]);
    });

    const matrix = {};
    validTickers.forEach(t1 => {
        matrix[t1] = {};
        validTickers.forEach(t2 => {
            matrix[t1][t2] = t1 === t2 ? 1.00 : (calculateCorrelation(logReturns[t1], logReturns[t2]) || 0);
        });
    });

    displayCorrelationMatrix(matrix, "correlation-matrix");
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
    const primaryTicker = getQueryParameter("symbol") || "BTCUSDT";
    initializeTradingView(primaryTicker);
    await generateCorrelationMatrix(primaryTicker);
});

// Analyze chart data
function analyzeChartData(data) {
    // Calculate basic statistics
    const returns = calculateReturns(data);
    const mean = calculateMean(returns);
    const std = calculateStd(returns);
    const currentZScore = (returns[returns.length - 1] - mean) / std;

    // Create results HTML
    const resultsHtml = `
        <div class="chart-analysis-results">
            <h3>Chart Analysis Results</h3>
            <p><strong>Mean Return:</strong> ${mean.toFixed(4)}</p>
            <p><strong>Return Std:</strong> ${std.toFixed(4)}</p>
            <p><strong>Current Z-Score:</strong> ${currentZScore.toFixed(4)}</p>
            <p><strong>Signal:</strong> ${currentZScore > 2 ? "Overbought" : currentZScore < -2 ? "Oversold" : "Neutral"}</p>
        </div>
    `;

    return resultsHtml;
}
