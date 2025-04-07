const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS so frontend can access this server
app.use(cors());

const API_URL = 'https://api.coinmarketcal.com/v1/events';
const API_KEY = 'tqgkGSmnoz8bLVh5yTikE7FSAyJ5pDwx3eiMuzYU'; // Replace with your real API key

app.get('/api/events', async (req, res) => {
    try {
        console.log("Fetching events from CoinMarketCal...");

        const response = await axios.get(API_URL, {
            headers: {
                'Accept': 'application/json',
                'x-api-key': API_KEY,
                'Accept-Encoding': 'deflate, gzip' // Added Accept-Encoding
            },
            decompress: true // Ensures axios properly handles gzip/deflate responses
        });

        console.log("API Response:", response.data); // Log response data

        res.json(response.data); // Send data to frontend
    } catch (error) {
        console.error("Error fetching events:", error.response ? error.response.data : error.message);
        
        res.status(500).json({
            error: "Failed to fetch events",
            details: error.response ? error.response.data : error.message
        });
    }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
