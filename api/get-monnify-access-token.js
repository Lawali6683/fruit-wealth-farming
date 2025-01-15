const express = require("express");
const axios = require("axios");
require("dotenv").config(); // Load environment variables

const app = express();

// Middleware to handle JSON requests
app.use(express.json());

// Route: Fetch Monnify Access Token
app.post("/api/get-monnify-access-token", async (req, res) => {
    const { MONNIFY_API_KEY, MONNIFY_SECRET_KEY } = process.env;

    if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
        return res.status(500).json({
            success: false,
            message: "Environment variables MONNIFY_API_KEY or MONNIFY_SECRET_KEY are missing.",
        });
    }

    // Encode API Key and Secret Key to Base64
    const credentials = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64");

    try {
        // Request Monnify token
        const response = await axios.post("https://api.monnify.com/api/v1/auth/login", {}, {
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/json",
            },
        });

        if (response.data.responseCode === "00") {
            return res.status(200).json({
                success: true,
                accessToken: response.data.response.accessToken,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Failed to authenticate with Monnify.",
                error: response.data.responseMessage,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching token from Monnify.",
            error: error.message,
        });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
