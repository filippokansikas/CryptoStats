const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS so frontend can access this server
app.use(cors());
app.use(express.json());

const API_URL = 'https://api.coinmarketcal.com/v1/events';
const API_KEY = 'tqgkGSmnoz8bLVh5yTikE7FSAyJ5pDwx3eiMuzYU';

app.get('/api/events', async (req, res) => {
    try {
        console.log("Fetching events from CoinMarketCal...");

        const response = await axios.get(API_URL, {
            headers: {
                'Accept': 'application/json',
                'x-api-key': API_KEY,
                'Accept-Encoding': 'deflate, gzip'
            },
            decompress: true
        });

        console.log("API Response:", response.data);

        res.json(response.data);
    } catch (error) {
        console.error("Error fetching events:", error.response ? error.response.data : error.message);
        
        res.status(500).json({
            error: "Failed to fetch events",
            details: error.response ? error.response.data : error.message
        });
    }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
