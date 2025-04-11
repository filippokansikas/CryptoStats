import { fetchHistoricalData, calculateLogReturns, calculateCorrelation, displayCorrelationMatrix } from './utils.js';

async function fetchMultiplePairs(pairs, interval = "1h", limit = 100) {
    let dataMap = {};

    for (let pair of pairs) {
        const prices = await fetchHistoricalData(pair, interval, limit);
        if (prices.length > 0) {
            dataMap[pair] = prices;
        } else {
            console.warn(`Skipping ${pair} due to insufficient data.`);
        }
    }

    return dataMap;
}

function computeCorrelationMatrix(priceData) {
    const pairs = Object.keys(priceData);
    const matrix = {};

    // Ensure all datasets have the same length
    const minLength = Math.min(...Object.values(priceData).map(arr => arr.length));

    pairs.forEach(pairA => {
        matrix[pairA] = {};
        const trimmedA = priceData[pairA].slice(-minLength);

        pairs.forEach(pairB => {
            if (pairA === pairB) {
                matrix[pairA][pairB] = 1; // Self-correlation is always 1
            } else {
                const trimmedB = priceData[pairB].slice(-minLength);
                const logReturnsA = calculateLogReturns(trimmedA);
                const logReturnsB = calculateLogReturns(trimmedB);
                matrix[pairA][pairB] = calculateCorrelation(logReturnsA, logReturnsB) || 0;
            }
        });
    });

    return matrix;
}

// Initialize Correlation Analysis
async function initCorrelationAnalysis() {
    const tradingPairs = ["XRPUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT"];

    const priceData = await fetchMultiplePairs(tradingPairs, "1h", 1000);
    if (Object.keys(priceData).length < 2) {
        document.getElementById("correlation-matrix").innerText = "Not enough data for correlation analysis.";
        return;
    }

    const correlationMatrix = computeCorrelationMatrix(priceData);
    displayCorrelationMatrix(correlationMatrix, "correlation-matrix");
}

// Run the correlation analysis when the page loads
document.addEventListener("DOMContentLoaded", initCorrelationAnalysis);
