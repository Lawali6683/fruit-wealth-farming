export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const { MONNIFY_API_KEY, MONNIFY_SECRET_KEY } = process.env;

    if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
        return res.status(500).json({
            success: false,
            message: "Environment variables MONNIFY_API_KEY or MONNIFY_SECRET_KEY are missing.",
        });
    }

    // Generate Basic Auth Token
    const authToken = btoa(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`);

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
            return res.status(200).json({
                success: true,
                accessToken: data.response.accessToken,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Failed to retrieve Monnify access token.",
                error: data.responseMessage,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching Monnify access token.",
            error: error.message,
        });
    }
}
