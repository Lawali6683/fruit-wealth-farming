export default function handler(req, res) {
  if (req.method === "GET") {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (PAYSTACK_SECRET_KEY) {
      return res.status(200).json({ success: true, key: PAYSTACK_SECRET_KEY });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Paystack API key not found." });
    }
  } else {
    return res.status(405).send("Method Not Allowed.");
  }
}
