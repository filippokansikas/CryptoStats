async function fetchPriceData(symbol, interval = "1d", limit = 100) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch price data for ${symbol}`);
        
        const data = await response.json();
        return data.map(candle => ({
            time: candle[0],  
            close: parseFloat(candle[4]) 
        }));
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function fetchTVLData(chain) {
    const url = `https://api.llama.fi/v2/historicalChainTvl/${chain}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch TVL data for ${chain}`);

        const data = await response.json();
        return data.map(entry => ({
            time: entry.date * 1000,  
            tvl: entry.tvl
        }));
    } catch (error) {
        console.error(error);
        return [];
    }
}

function calculateCorrelation(priceData, tvlData) {
    if (priceData.length === 0 || tvlData.length === 0) return null;

    // Align datasets by timestamp
    const alignedData = [];
    const priceMap = new Map(priceData.map(entry => [entry.time, entry.close]));
    tvlData.forEach(entry => {
        if (priceMap.has(entry.time)) {
            alignedData.push({
                time: entry.time,
                price: priceMap.get(entry.time),
                tvl: entry.tvl
            });
        }
    });

    // Extract final aligned values
    const prices = alignedData.map(d => d.price);
    const tvls = alignedData.map(d => d.tvl);

    if (prices.length < 2 || tvls.length < 2) return null;

    return ss.sampleCorrelation(prices, tvls);
}

function plotChart(priceData, tvlData) {
    const ctx = document.getElementById("correlationChart").getContext("2d");

    const labels = priceData.map(entry => new Date(entry.time).toLocaleDateString());
    const prices = priceData.map(entry => entry.close);
    const tvls = tvlData.map(entry => entry.tvl);

    new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Price (USD)",
                    data: prices,
                    borderColor: "blue",
                    fill: false
                },
                {
                    label: "TVL (USD)",
                    data: tvls,
                    borderColor: "green",
                    fill: false
                }
            ]
        },
        options: {
            scales: {
                y: {
                    type: 'logarithmic',
                    position: 'left',
                    ticks: {
                        callback: function(value, index, values) {
                            return value.toLocaleString(); // Format ticks with commas
                        }
                    },
                    title: {
                        display: true,
                        text: 'Value (Logarithmic Scale)'
                    }
                }
            }
        }
    });
}

document.getElementById("compare-btn").addEventListener("click", async () => {
    const symbol = document.getElementById("symbol-input").value.toUpperCase();
    const chain = document.getElementById("chain-input").value.toLowerCase();

    if (!symbol || !chain) {
        document.getElementById("result").innerText = "Please enter valid inputs.";
        return;
    }

    const priceData = await fetchPriceData(symbol);
    const tvlData = await fetchTVLData(chain);

    if (priceData.length === 0 || tvlData.length === 0) {
        document.getElementById("result").innerText = "Failed to fetch data.";
        return;
    }

    const correlation = calculateCorrelation(priceData, tvlData);
    document.getElementById("result").innerHTML = `<strong>Correlation:</strong> ${correlation !== null ? correlation.toFixed(2) : "N/A"}`;

    plotChart(priceData, tvlData);
});
