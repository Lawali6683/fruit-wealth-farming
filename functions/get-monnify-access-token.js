const fetch = require("node-fetch");

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, message: "Method not allowed" }),
        };
    }

    // Tabbatar da Environment Variables
    const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY;
    const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY;

    if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Environment variables MONNIFY_API_KEY or MONNIFY_SECRET_KEY are missing.",
            }),
        };
    }

    // Generate Base64 Authorization Token
    const authToken = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64");

    try {
        // Send POST request to Monnify
        const response = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
            method: "POST",
            headers: {
                Authorization: `Basic ${authToken}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    success: false,
                    message: "Failed to retrieve Monnify access token.",
                    error: errorResponse.responseMessage || "Unknown error",
                }),
            };
        }

        const data = await response.json();

        if (data.responseCode === "0") {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    accessToken: data.responseBody.accessToken,
                }),
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: data.responseMessage || "Unexpected response from Monnify.",
                }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "An error occurred while fetching Monnify access token.",
                error: error.message,
            }),
        };
    }
};
