export default function handler(req, res) {
  if (req.method === "GET") {
    const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY;

    if (MONNIFY_API_KEY) {
      return res.status(200).json({
        success: true,
        message: "Monnify API key retrieved successfully.",
        apiKey: MONNIFY_API_KEY,
      });
    } else {
      console.error("Environment Variable Missing: MONNIFY_API_KEY");

      return res.status(500).json({
        success: false,
        message: "Monnify API key not found.",
      });
    }
  } else {
    return res.setHeader("Allow", ["GET"]).status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed.`,
    });
  }
}
