const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/24hr";
const RSI_PERIOD = 14;
const BB_PERIOD = 20;
const BB_STD_DEV = 2;

// Function to calculate RSI
async function calculateRSI(symbol) {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${RSI_PERIOD + 1}`);
        if (!response.ok) throw new Error("Failed to fetch RSI data");
        
        const data = await response.json();
        const closes = data.map(item => parseFloat(item[4])); // Closing prices
        
        let gains = 0;
        let losses = 0;
        
        // Calculate initial average gain and loss
        for (let i = 1; i < RSI_PERIOD + 1; i++) {
            const change = closes[i] - closes[i - 1];
            if (change >= 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        
        let avgGain = gains / RSI_PERIOD;
        let avgLoss = losses / RSI_PERIOD;
        
        // Calculate RSI
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return rsi.toFixed(2);
    } catch (error) {
        console.error(`Error calculating RSI for ${symbol}:`, error);
        return "N/A";
    }
}

// Function to calculate Bollinger Bands Width
async function calculateBBWidth(symbol) {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${BB_PERIOD}`);
        if (!response.ok) throw new Error("Failed to fetch BB data");
        
        const data = await response.json();
        const closes = data.map(item => parseFloat(item[4])); // Closing prices
        
        // Calculate Simple Moving Average (SMA)
        const sum = closes.reduce((a, b) => a + b, 0);
        const sma = sum / BB_PERIOD;
        
        // Calculate Standard Deviation
        const squaredDifferences = closes.map(price => Math.pow(price - sma, 2));
        const variance = squaredDifferences.reduce((a, b) => a + b, 0) / BB_PERIOD;
        const stdDev = Math.sqrt(variance);
        
        // Calculate Bollinger Bands
        const upperBand = sma + (BB_STD_DEV * stdDev);
        const lowerBand = sma - (BB_STD_DEV * stdDev);
        
        // Calculate Band Width
        const bandWidth = ((upperBand - lowerBand) / sma) * 100;
        
        return bandWidth.toFixed(2);
    } catch (error) {
        console.error(`Error calculating BB Width for ${symbol}:`, error);
        return "N/A";
    }
}

// Fetch top 100 cryptocurrencies by trading volume
async function fetchTopCryptos() {
    try {
        const response = await fetch(BINANCE_API_URL);
        if (!response.ok) throw new Error("Failed to fetch data from Binance API");

        const data = await response.json();

        // Filter only USDT pairs and sort by trading volume (descending)
        const sortedData = data
            .filter(item => item.symbol.endsWith("USDT"))
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, 100);

        // Calculate RSI and BB Width for each cryptocurrency
        const cryptoData = await Promise.all(sortedData.map(async item => {
            const [rsi, bbWidth] = await Promise.all([
                calculateRSI(item.symbol),
                calculateBBWidth(item.symbol)
            ]);
            
            return {
                symbol: item.symbol,
                price: parseFloat(item.lastPrice).toFixed(5),
                volume: parseFloat(item.quoteVolume),
                change_24h: parseFloat(item.priceChangePercent).toFixed(2),
                rsi: rsi,
                bbWidth: bbWidth
            };
        }));

        return cryptoData;
    } catch (error) {
        console.error("Error fetching cryptocurrency data:", error);
        return [];
    }
}

// Function to format volume with k notation
function formatVolume(volume) {
    if (volume >= 1000000000) {
        return (volume / 1000000000).toFixed(2) + 'B';
    } else if (volume >= 1000000) {
        return (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
        return (volume / 1000).toFixed(2) + 'K';
    }
    return volume.toFixed(2);
}

// Populate the table with data
async function populateTable() {
    const cryptoData = await fetchTopCryptos();
    const tableBody = document.querySelector("#cryptoTable tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    cryptoData.forEach(item => {
        const row = `
            <tr onclick="openChart('${item.symbol}')">
                <td>${item.symbol}</td>
                <td>$${item.price}</td>
                <td data-sort="${item.volume}">$${formatVolume(item.volume)}</td>
                <td>${item.change_24h}%</td>
                <td>${item.rsi}</td>
                <td>${item.bbWidth}%</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML("beforeend", row);
    });

    // Destroy existing DataTable instance if it exists
    if ($.fn.DataTable.isDataTable('#cryptoTable')) {
        $('#cryptoTable').DataTable().destroy();
    }

    // Initialize DataTables with volume as the default sort column
    $('#cryptoTable').DataTable({
        order: [[2, 'desc']], // Sort by volume (column index 2) in descending order
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        columnDefs: [
            {
                targets: 2, // Volume column
                type: 'num', // Specify that this column contains numeric data
                render: function(data, type, row) {
                    if (type === 'sort') {
                        return data; // Use the data-sort attribute for sorting
                    }
                    return row[2]; // Use the formatted value for display
                }
            }
        ]
    });
}

// Redirect to the chart page
function openChart(symbol) {
    window.location.href = `chart.html?symbol=${symbol}`;
}

// Initialize DataTables and set up refresh interval
let refreshInterval;

function initializeTable() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    // Initial data load
    populateTable();

    // Set up refresh interval (30 seconds)
    refreshInterval = setInterval(populateTable, 30000);
}

// Call initializeTable when the page loads
document.addEventListener('DOMContentLoaded', initializeTable);

// Clean up interval when page is unloaded
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

$(document).ready(function () {
    // Function to fetch historical TVL data for a specific chain
    async function getChainTVL(chainName) {
        try {
            const response = await $.ajax({
                url: `https://api.llama.fi/v2/historicalChainTvl/${chainName}`,
                method: "GET",
                dataType: "json"
            });

            console.log("TVL API Response:", response); // Debugging

            // Map the TVL data to the required format
            const tvlData = response.map(item => ({
                date: new Date(item.date * 1000), // Convert timestamp to Date
                tvl: item.tvl
            }));

            console.log("Mapped TVL Data:", tvlData); // Debugging
            return tvlData;
        } catch (error) {
            console.error("TVL API Error:", error);
            return null;
        }
    }

    // Function to fetch historical price data for a trading pair using Binance API
    async function getBinancePriceData(symbol) {
        try {
            const response = await $.ajax({
                url: `https://api.binance.com/api/v3/klines`,
                method: "GET",
                dataType: "json",
                data: {
                    symbol: symbol.toUpperCase(), // Trading pair (e.g., ETHUSDT)
                    interval: "1d", // Daily data
                    limit: 6000 // Maximum number of data points
                }
            });

            console.log("Binance API Response:", response); // Debugging

            // Map the price data to the required format
            const priceData = response.map(item => ({
                date: new Date(item[0]), // Convert timestamp to Date
                price: parseFloat(item[4]) // Closing price
            }));

            console.log("Mapped Price Data:", priceData); // Debugging
            return priceData;
        } catch (error) {
            console.error("Binance API Error:", error);
            return null;
        }
    }

    // Function to calculate the correlation coefficient between TVL and Price
    function calculateCorrelation(tvlData, priceData) {
        // Align TVL and Price data by date
        const alignedData = [];
        let tvlIndex = 0, priceIndex = 0;

        while (tvlIndex < tvlData.length && priceIndex < priceData.length) {
            const tvlDate = tvlData[tvlIndex].date.getTime();
            const priceDate = priceData[priceIndex].date.getTime();

            if (tvlDate === priceDate) {
                alignedData.push({
                    tvl: tvlData[tvlIndex].tvl,
                    price: priceData[priceIndex].price
                });
                tvlIndex++;
                priceIndex++;
            } else if (tvlDate < priceDate) {
                tvlIndex++;
            } else {
                priceIndex++;
            }
        }

        if (alignedData.length === 0) return null;

        // Calculate correlation coefficient
        const n = alignedData.length;
        const sumTvl = alignedData.reduce((sum, item) => sum + item.tvl, 0);
        const sumPrice = alignedData.reduce((sum, item) => sum + item.price, 0);
        const sumTvlPrice = alignedData.reduce((sum, item) => sum + item.tvl * item.price, 0);
        const sumTvlSquared = alignedData.reduce((sum, item) => sum + item.tvl * item.tvl, 0);
        const sumPriceSquared = alignedData.reduce((sum, item) => sum + item.price * item.price, 0);

        const numerator = sumTvlPrice - (sumTvl * sumPrice) / n;
        const denominator = Math.sqrt(
            (sumTvlSquared - (sumTvl * sumTvl) / n) *
            (sumPriceSquared - (sumPrice * sumPrice) / n)
        );

        return denominator === 0 ? 0 : numerator / denominator;
    }

    // Function to plot TVL and Price data
    async function fetchAndPlot() {
        const chainName = $("#chainName").val().trim();
        const symbol = $("#symbol").val().trim();
        const errorMessageDiv = $("#error-message");
        const correlationDiv = $("#correlation");
        const chartDiv = $("#chart");

        errorMessageDiv.text(""); // Clear previous error messages
        correlationDiv.text(""); // Clear previous correlation
        chartDiv.empty(); // Clear previous chart

        // Validate input
        if (!chainName || !symbol) {
            errorMessageDiv.text("Error: Please enter a valid chain name and trading pair.");
            return;
        }

        const tvlData = await getChainTVL(chainName);
        const priceData = await getBinancePriceData(symbol);

        if (!tvlData || tvlData.length === 0 || !priceData || priceData.length === 0) {
            errorMessageDiv.text("Error: Invalid Chain Name, Trading Pair, or no data available.");
            return;
        }

        // Calculate correlation
        const correlation = calculateCorrelation(tvlData, priceData);
        correlationDiv.text(`Correlation between TVL and Price: ${correlation.toFixed(2)}`);

        // Prepare Plotly traces
        const traceTVL = {
            x: tvlData.map(item => item.date),
            y: tvlData.map(item => item.tvl),
            type: 'scatter',
            name: 'TVL',
            yaxis: 'y1'
        };

        const tracePrice = {
            x: priceData.map(item => item.date),
            y: priceData.map(item => item.price),
            type: 'scatter',
            name: 'Price',
            yaxis: 'y2'
        };

        // Define layout
        const layout = {
            title: `${chainName} TVL vs Price`,
            yaxis: { title: 'TVL (USD)' },
            yaxis2: { title: 'Price (USD)', overlaying: 'y', side: 'right' },
            xaxis: { title: 'Date', rangeslider: { visible: true } }
        };

        // Plot the chart
        Plotly.newPlot('chart', [traceTVL, tracePrice], layout);
    }

    // Attach event listener to the "Plot" button
    $("#plotButton").on("click", fetchAndPlot);
});
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

function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
    
    // Optional: Toggle hamburger animation
    const hamburger = document.querySelector('.hamburger');
    hamburger.classList.toggle('active');
}