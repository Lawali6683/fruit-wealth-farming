exports.handler = async function (event, context) {
    // Ensure the request method is POST
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, message: "Method not allowed" }),
        };
    }

    // Retrieve environment variables for Monnify API keys
    const { MONNIFY_API_KEY, MONNIFY_SECRET_KEY } = process.env;

    // Check if environment variables are missing
    if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Environment variables MONNIFY_API_KEY or MONNIFY_SECRET_KEY are missing.",
            }),
        };
    }

    // Generate Basic Auth Token (Updated to use Buffer for base64 encoding)
    const authToken = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64");

    try {
        // Fetch the token from Monnify API
        const response = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
            method: "POST",
            headers: {
                Authorization: `Basic ${authToken}`,
                "Content-Type": "application/json",
            },
        });

        // Parse the response from Monnify
        const data = await response.json();
        console.log("Response Data:", data); // Log the response for debugging

        // Check if the response is successful
        if (data.responseCode === "00") {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    accessToken: data.response.accessToken,
                }),
            };
        } else {
            console.error("Monnify Error:", data); // Log the error for debugging
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
        // Handle errors in the request or network issues
        console.error("Fetch Error:", error.message); // Log the error for debugging
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
