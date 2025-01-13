export default function handler(req, res) {
  if (req.method === "GET") {
    const UFITPAY_API_KEY = process.env.UFITPAY_API_KEY;

    if (UFITPAY_API_KEY) {
      return res.status(200).json({ 
        success: true, 
        apiKey: UFITPAY_API_KEY 
      });
    } else {
      console.error("Environment Variables Missing:");
      console.error("UFITPAY_API_KEY:", process.env.UFITPAY_API_KEY);

      return res.status(500).json({ 
        success: false, 
        message: "UfitPay API Key not found." 
      });
    }
  } else {
    return res.setHeader("Allow", ["GET"]).status(405).json({ 
      success: false, 
      message: `Method ${req.method} Not Allowed.` 
    });
  }
}
