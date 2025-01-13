export default function handler(req, res) {
  if (req.method === "GET") {
    
    const UFITPAY_API_KEY = process.env.UFITPAY_API_KEY;
    const UFITPAY_API_TOKEN = process.env.UFITPAY_API_TOKEN;

    if (UFITPAY_API_KEY && UFITPAY_API_TOKEN) {
      // Return API Key and Token securely
      return res.status(200).json({ 
        success: true, 
        apiKey: UFITPAY_API_KEY,
        apiToken: UFITPAY_API_TOKEN 
      });
    } else {
      // Return error if keys are not found
      return res.status(500).json({ 
        success: false, 
        message: "UfitPay API credentials not found." 
      });
    }
  } else {
    // Handle unsupported HTTP methods
    return res.status(405).json({ 
      success: false, 
      message: "Method Not Allowed." 
    });
  }
}
