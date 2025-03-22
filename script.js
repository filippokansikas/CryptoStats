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
            price: parseFloat(item.lastPrice).toFixed(7),
            volume: parseFloat(item.quoteVolume).toFixed(2),
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
