export default function handler(req, res) {
  if (req.method === "GET") {
    const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY;

    if (MONNIFY_SECRET_KEY) {
      return res.status(200).json({
        success: true,
        message: "Monnify secret key retrieved successfully.",
        secretKey: MONNIFY_SECRET_KEY,
      });
    } else {
      console.error("Environment Variable Missing: MONNIFY_SECRET_KEY");

      return res.status(500).json({
        success: false,
        message: "Monnify secret key not found.",
      });
    }
  } else {
    return res.setHeader("Allow", ["GET"]).status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed.`,
    });
  }
}
