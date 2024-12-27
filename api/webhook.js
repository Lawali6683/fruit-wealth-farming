import { createHmac } from 'crypto';
import admin from 'firebase-admin';
import fetch from 'node-fetch';

// Firebase initialization
if (!admin.apps.length) {
  const firebaseAdminSDK = process.env.FIREBASE_ADMIN_SDK;

  if (!firebaseAdminSDK) {
    throw new Error("FIREBASE_ADMIN_SDK environment variable is not set");
  }

  let parsedSDK;
  try {
    parsedSDK = JSON.parse(firebaseAdminSDK);
  } catch (error) {
    throw new Error("Invalid JSON in FIREBASE_ADMIN_SDK");
  }

  admin.initializeApp({
    credential: admin.credential.cert(parsedSDK),
    databaseURL: "https://fruit-wealth-farming-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY environment variable is not set");
}

// Validate Paystack signature
function validatePaystackSignature(req, signature) {
  const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === signature;
}

// Verify payment
async function verifyPayment(transactionReference) {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${transactionReference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();
    console.log('Verification Response:', data);

    return data.status && data.data.status === 'success' ? data.data : null;
  } catch (error) {
    console.error('Error verifying payment:', error.message);
    return null;
  }
}

// Webhook handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed.');
  }

  if (!req.body || !req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid Request.');
  }

  const signature = req.headers['x-paystack-signature'];
  if (!validatePaystackSignature(req, signature)) {
    console.error('Invalid Signature');
    return res.status(400).send('Invalid signature.');
  }

  console.log('Webhook Received:', req.body);
  const { event, data } = req.body;

  if (event === 'charge.success') {
    try {
      const transactionDetails = await verifyPayment(data.reference);

      if (transactionDetails) {
        const { email } = transactionDetails.customer;
        const userUid = await getUserUidByEmail(email);

        if (userUid) {
          const alreadyProcessed = await checkTransactionProcessed(
            userUid,
            transactionDetails.reference
          );

          if (alreadyProcessed) {
            console.warn('Transaction already processed:', data.reference);
            return res.status(400).send('Transaction already processed.');
          }

          const investmentAmount = transactionDetails.amount / 100;
          await updateInvestment(userUid, investmentAmount, transactionDetails.reference);
          console.log('Investment updated successfully');
          return res.status(200).send('Payment verified and investment updated.');
        } else {
          console.warn('User not found for email:', email);
          return res.status(400).send('User not found.');
        }
      } else {
        console.error('Payment verification failed for reference:', data.reference);
        return res.status(400).send('Payment verification failed.');
      }
    } catch (error) {
      console.error('Error processing webhook:', error.message);
      return res.status(500).send('Internal Server Error.');
    }
  } else {
    console.warn('Invalid event type:', event);
    return res.status(400).send('Invalid event.');
  }
}

// Helper functions
async function getUserUidByEmail(email) {
  try {
    const usersRef = db.ref('users');
    const usersSnapshot = await usersRef.once('value');
    const usersData = usersSnapshot.val();

    for (let userId in usersData) {
      if (usersData[userId].email === email) {
        return userId;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching user UID:', error.message);
    return null;
  }
}

async function checkTransactionProcessed(userUid, transactionReference) {
  try {
    const userRef = db.ref(`users/${userUid}/transactions`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    return userData ? userData.includes(transactionReference) : false;
  } catch (error) {
    console.error('Error checking transaction:', error.message);
    return false;
  }
}

async function updateInvestment(userUid, investmentAmount, transactionReference) {
  try {
    const userRef = db.ref(`users/${userUid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      throw new Error('User data not found');
    }

    const newInvestment = (userData.investment || 0) + investmentAmount;
    const updatedTransactions = userData.transactions
      ? [...userData.transactions, transactionReference]
      : [transactionReference];

    await userRef.update({
      investment: newInvestment,
      transactions: updatedTransactions,
    });
  } catch (error) {
    console.error('Error updating investment:', error.message);
    throw error;
  }
}
