export default function handler(req, res) {
  if (req.method === "GET") {
    const UFITPAY_API_KEY = process.env.UFITPAY_API_KEY;
    const UFITPAY_API_TOKEN = process.env.UFITPAY_API_TOKEN;

    if (UFITPAY_API_KEY && UFITPAY_API_TOKEN) {
      return res.status(200).json({ 
        success: true, 
        apiKey: UFITPAY_API_KEY,
        apiToken: UFITPAY_API_TOKEN 
      });
    } else {
      console.error("Environment Variables Missing:");
      console.error("UFITPAY_API_KEY:", process.env.UFITPAY_API_KEY);
      console.error("UFITPAY_API_TOKEN:", process.env.UFITPAY_API_TOKEN);

      return res.status(500).json({ 
        success: false, 
        message: "UfitPay API credentials not found." 
      });
    }
  } else {
    return res.setHeader("Allow", ["GET"]).status(405).json({ 
      success: false, 
      message: `Method ${req.method} Not Allowed.` 
    });
  }
}
