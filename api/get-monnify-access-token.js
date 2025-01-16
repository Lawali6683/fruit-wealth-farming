const express = require("express");
const axios = require("axios");
require("dotenv").config(); 
const app = express();

app.use(express.json());

// Route for getting Monnify access token
app.post("/api/get-monnify-access-token", async (req, res) => {
    const { MONNIFY_API_KEY, MONNIFY_SECRET_KEY } = process.env;

    if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
        return res.status(500).json({
            success: false,
            message: "Environment variables MONNIFY_API_KEY or MONNIFY_SECRET_KEY are missing.",
        });
    }

    const credentials = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64");

    try {
        const response = await axios.post("https://sandbox.monnify.com/api/v1/auth/login", {}, {
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
                message: "Failed to retrieve Monnify access token.",
                error: response.data.responseMessage,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching Monnify access token.",
            error: error.message,
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
