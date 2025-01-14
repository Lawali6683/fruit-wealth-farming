export default function handler(req, res) {
  if (req.method === "GET") {
   
    const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY;
    const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY;

    // Duba idan duka sun cika
    if (MONNIFY_API_KEY && MONNIFY_SECRET_KEY) {
      // Samar da response mai tsaro
      return res.status(200).json({
        success: true,
        message: "Monnify API credentials retrieved successfully.",
        apiKey: MONNIFY_API_KEY,
        secretKey: MONNIFY_SECRET_KEY,
      });
    } else {
      console.error("Environment Variables Missing:");
      console.error("MONNIFY_API_KEY:", process.env.MONNIFY_API_KEY);
      console.error("MONNIFY_SECRET_KEY:", process.env.MONNIFY_SECRET_KEY);

      return res.status(500).json({
        success: false,
        message: "Monnify API credentials not found.",
      });
    }
  } else {    
    return res.setHeader("Allow", ["GET"]).status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed.`,
    });
  }
}
