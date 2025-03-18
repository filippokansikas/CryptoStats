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

// Calculate log returns
function calculateLogReturns(prices) {
    if (prices.length < 2) return [];
    return prices.slice(1).map((price, i) => Math.log(price / prices[i]));
}

// Calculate Pearson correlation
function calculateCorrelation(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1.length < 2) return null;
    return ss.sampleCorrelation(arr1, arr2);
}

// Perform OLS regression to find residuals (for cointegration check)
function olsRegression(seriesX, seriesY) {
    const xMean = ss.mean(seriesX);
    const yMean = ss.mean(seriesY);
    const covariance = ss.sampleCovariance(seriesX, seriesY);
    const varianceX = ss.sampleVariance(seriesX);

    const beta = covariance / varianceX;
    const alpha = yMean - beta * xMean;

    // Compute residuals
    const residuals = seriesX.map((x, i) => seriesY[i] - (alpha + beta * x));
    return { residuals, beta };
}

// Approximate ADF test for cointegration
function adfTest(series, threshold = 0.05) {
    if (series.length < 2) return false;

    const firstDifferences = series.slice(1).map((val, i) => val - series[i]);
    const varianceOriginal = ss.sampleVariance(series);
    const varianceDiffs = ss.sampleVariance(firstDifferences);

    return varianceDiffs < varianceOriginal * threshold;
}

// Check cointegration using Engle-Granger method
function checkCointegration(seriesX, seriesY) {
    if (seriesX.length !== seriesY.length || seriesX.length === 0) return false;

    const { residuals } = olsRegression(seriesX, seriesY);
    return adfTest(residuals, 0.05);
}

// Compare URL Token with User-Selected Token
async function compareTokens() {
    const primaryTicker = getQueryParameter("symbol") || "BTCUSDT";
    const userInput = document.getElementById("second-pair-input").value.trim().toUpperCase();
    const comparisonResults = document.getElementById("comparison-results");

    if (!userInput || !userInput.endsWith("USDT")) {
        comparisonResults.innerHTML = "<p>Please enter a valid USDT pair (e.g., ETHUSDT).</p>";
        return;
    }

    console.log(`Comparing ${primaryTicker} with ${userInput}...`);

    // Fetch historical data
    const primaryPrices = await fetchHistoricalData(primaryTicker, "4h", 2000);
    const userPrices = await fetchHistoricalData(userInput, "4h", 2000);

    if (primaryPrices.length === 0 || userPrices.length === 0) {
        comparisonResults.innerHTML = `<p>Failed to fetch price data.</p>`;
        return;
    }

    // Ensure same length
    const minLength = Math.min(primaryPrices.length, userPrices.length);
    const primaryTrimmed = primaryPrices.slice(-minLength);
    const userTrimmed = userPrices.slice(-minLength);

    // Calculate log returns
    const primaryLogReturns = calculateLogReturns(primaryTrimmed);
    const userLogReturns = calculateLogReturns(userTrimmed);

    // Calculate correlation
    const correlation = calculateCorrelation(primaryLogReturns, userLogReturns);

    // Check cointegration
    const isCointegrated = checkCointegration(primaryLogReturns, userLogReturns);

    // Display results
    comparisonResults.innerHTML = `
        <p><strong>Correlation:</strong> ${correlation !== null ? correlation.toFixed(2) : "N/A"}</p>
        <p><strong>Cointegration:</strong> ${isCointegrated ? "Yes" : "No"}</p>
    `;
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

    displayCorrelationMatrix(matrix);
}

// Display correlation matrix in HTML
function displayCorrelationMatrix(matrix) {
    const tickers = Object.keys(matrix);
    const container = document.getElementById("correlation-matrix");
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

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
    const primaryTicker = getQueryParameter("symbol") || "BTCUSDT";

    new TradingView.widget({
        autosize: true,
        symbol: primaryTicker,
        interval: "1",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingview-widget-container",
    });

    await generateCorrelationMatrix(primaryTicker);
});

// Attach event listener to the compare button
document.getElementById("compare-pairs-btn").addEventListener("click", compareTokens);
