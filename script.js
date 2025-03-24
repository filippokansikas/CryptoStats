const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/24hr";

// Fetch top 100 cryptocurrencies by trading volume
async function fetchTopCryptos() {
    try {
        const response = await fetch(BINANCE_API_URL);
        if (!response.ok) throw new Error("Failed to fetch data from Binance API");

        const data = await response.json();

        // Filter only USDT pairs and sort by trading volume (descending)
        const sortedData = data
            .filter(item => item.symbol.endsWith("USDT")) // Filter only USDT pairs
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)) // Sort by volume
            .slice(0, 100); // Take the top 100

        return sortedData.map(item => ({
            symbol: item.symbol, // Use the full symbol (e.g., BTCUSDT)
            price: parseFloat(item.lastPrice).toFixed(5),
            volume: parseFloat(item.quoteVolume).toFixed(0),
            change_24h: parseFloat(item.priceChangePercent).toFixed(2)
        }));
    } catch (error) {
        console.error("Error fetching cryptocurrency data:", error);
        return [];
    }
}

// Populate the table with data
async function populateTable() {
    const cryptoData = await fetchTopCryptos();
    const tableBody = document.querySelector("#cryptoTable tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    cryptoData.forEach(item => {
        const row = `
            <tr onclick="openChart('${item.symbol}')">
                <td>${item.symbol}</td> <!-- Show the full symbol (e.g., BTCUSDT) -->
                <td>$${item.price}</td>
                <td>$${item.volume}</td>
                <td>${item.change_24h}%</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML("beforeend", row);
    });

    // Initialize DataTables for sorting and pagination
    $('#cryptoTable').DataTable({
        order: [[2, 'desc']] // Order by the third column (volume) in descending order
    });
}

// Redirect to the chart page
function openChart(symbol) {
    window.location.href = `chart.html?symbol=${symbol}`; // Pass the full symbol (e.g., BTCUSDT)
}

// Refresh data every 5 minutes
setInterval(populateTable, 5 * 60 * 1000);

// Initial load
populateTable();

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
                    limit: 4000 // Maximum number of data points
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
