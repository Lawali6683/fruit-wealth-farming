const fetch = require('node-fetch');

module.exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, message: "Method not allowed" }),
        };
    }

    const { MONNIFY_API_KEY, MONNIFY_SECRET_KEY } = process.env;

    if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Environment variables MONNIFY_API_KEY or MONNIFY_SECRET_KEY are missing.",
            }),
        };
    }

    // Generate Basic Auth Token
    const authToken = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString('base64');

    try {
        // Fetch the token
        const response = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
            method: "POST",
            headers: {
                Authorization: `Basic ${authToken}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (data.responseCode === "00") {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    accessToken: data.response.accessToken,
                }),
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: "Failed to retrieve Monnify access token.",
                    error: data.responseMessage,
                }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Error fetching Monnify access token.",
                error: error.message,
            }),
        };
    }
};
