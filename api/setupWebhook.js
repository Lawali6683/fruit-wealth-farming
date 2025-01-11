import fetch from 'node-fetch';

const setupWebhook = async () => {
  const response = await fetch('https://api.ufitpay.com/v1/webhook', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UFITPAY_API_KEY}`, // API Key daga ENV
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://fruit-wealth-farming.vercel.app/api/webhook', // Webhook URL
      event: 'transaction.success', // Event ɗin da ake son saita
    }),
  });

  const data = await response.json();
  console.log('Webhook setup response:', data);
};

setupWebhook();
