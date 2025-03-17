// Get the symbol from the query string
function getQueryParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
  
  // Fetch historical price data from Binance API
  async function fetchHistoricalData(symbol, interval = "1h", limit = 100) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
    try {
      console.log(`Fetching historical data for ${symbol}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API Error (${symbol}): ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`No data available for ${symbol}`);
      }
      // Extract closing prices
      return data.map(candle => parseFloat(candle[4]));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  }
  
  // Calculate Pearson correlation coefficient
  function calculateCorrelation(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1.length === 0) return null;
    return ss.sampleCorrelation(arr1, arr2);
  }
  
  // Perform Augmented Dickey-Fuller (ADF) test for stationarity
  function adfTest(series, threshold = 0.1) {
    if (series.length < 2) return false;
    // Compute first differences manually
    const differences = series.slice(1).map((val, i) => val - series[i]);
    const differencesVariance = ss.sampleVariance(differences);
    const seriesVariance = ss.sampleVariance(series);
    return differencesVariance < seriesVariance * threshold;
  }
  
  // Check cointegration using Engle-Granger two-step method
  function checkCointegration(series1, series2, threshold = 0.1) {
    if (series1.length !== series2.length || series1.length === 0) return false;
  
    // Step 1: Perform OLS regression (y = mx + b)
    const xMean = ss.mean(series1);
    const yMean = ss.mean(series2);
    const covariance = ss.sampleCovariance(series1, series2);
    const varianceX = ss.sampleVariance(series1);
    const slope = covariance / varianceX;
    const intercept = yMean - slope * xMean;
  
    // Calculate residuals
    const residuals = series1.map((x, i) => series2[i] - (slope * x + intercept));
  
    // Step 2: Test residuals for stationarity (ADF test)
    return adfTest(residuals, threshold);
  }
  
  // Initialize the page
  async function initPage() {
    const firstPair = getQueryParameter("symbol");
    if (!firstPair) {
      console.error("Symbol not found in query parameters");
      document.getElementById("chart-title").innerText = "Invalid Symbol";
      return;
    }
  
    // Update the chart title
    document.getElementById("chart-title").innerText = `${firstPair} TradingView Chart`;
  
    // Initialize the TradingView widget
    new TradingView.widget({
      autosize: true,
      symbol: firstPair, // Use the full symbol (e.g., BTCUSDT)
      interval: "1", // Default interval (1 minute)
      timezone: "Etc/UTC",
      theme: "light", // or "dark"
      style: "1", // Chart style (candles)
      locale: "en",
      toolbar_bg: "#f1f3f6",
      enable_publishing: false,
      allow_symbol_change: true,
      container_id: "tradingview-widget-container",
      studies: ["RSI@tv-basicstudies"],
    });
  
    // Fetch historical data for the first pair
    const firstPairPrices = await fetchHistoricalData(firstPair, "1h", 1000);
  
    // Connect button and input for comparing pairs
    const compareButton = document.getElementById("compare-pairs-btn");
    const secondPairInput = document.getElementById("second-pair-input");
    const comparisonResults = document.getElementById("comparison-results");
  
    compareButton.addEventListener("click", async () => {
      const secondPair = secondPairInput.value.trim().toUpperCase();
      if (!secondPair || !secondPair.endsWith("USDT")) {
        comparisonResults.innerText = "Please enter a valid USDT pair (e.g., ETHUSDT).";
        return;
      }
  
      // Fetch historical data for the second pair
      const secondPairPrices = await fetchHistoricalData(secondPair, "1h", 100);
      if (secondPairPrices.length === 0) {
        comparisonResults.innerText = `Failed to fetch data for ${secondPair}.`;
        return;
      }
  
      // Ensure both datasets have the same length
      const minLength = Math.min(firstPairPrices.length, secondPairPrices.length);
      const firstPairTrimmed = firstPairPrices.slice(-minLength);
      const secondPairTrimmed = secondPairPrices.slice(-minLength);
      console.log(`Trimmed data lengths: First Pair = ${firstPairTrimmed.length}, Second Pair = ${secondPairTrimmed.length}`);
  
      // Calculate correlation
      const correlation = calculateCorrelation(firstPairTrimmed, secondPairTrimmed);
  
      // Check cointegration (default threshold = 0.1)
      const isCointegrated = checkCointegration(firstPairTrimmed, secondPairTrimmed, 0.1);
  
      // Display results
      comparisonResults.innerHTML = `
        <p><strong>Correlation:</strong> ${correlation !== null ? correlation.toFixed(2) : "N/A"}</p>
        <p><strong>Cointegration:</strong> ${isCointegrated ? "Yes" : "No"}</p>
      `;
    });
  }
  
  // Initialize the page when the DOM is ready
  document.addEventListener("DOMContentLoaded", initPage);
  