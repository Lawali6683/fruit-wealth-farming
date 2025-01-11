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
const UFITPAY_API_KEY = process.env.UFITPAY_API_KEY;
const UFITPAY_API_TOKEN = process.env.UFITPAY_API_TOKEN;

if (!UFITPAY_API_KEY || !UFITPAY_API_TOKEN) {
  throw new Error("UfitPay API credentials not found.");
}

// Validate UfitPay signature (Note: Adjust as needed based on UfitPay's signature scheme)
function validateUfitpaySignature(req, signature) {
  const hash = createHmac('sha512', UFITPAY_API_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === signature;
}

async function verifyPayment(transactionReference) {
  try {
    const response = await fetch(
      `https://api.ufitpay.com/v1/transaction/verify/${transactionReference}`,
      {
        method: 'GET',
        headers: {
          "Api-Key": UFITPAY_API_KEY,
          "Api-Token": UFITPAY_API_TOKEN,
        },
      }
    );

    const data = await response.json();
    if (!data.status) {
      console.error('Payment verification failed:', data.message);
      return null;
    }
    return data.data.status === 'success' ? data.data : null;
  } catch (error) {
    console.error('Error verifying payment:', error.message);
    return null;
  }
}

async function verifyWithdrawal(reference) {
  try {
    const response = await fetch(`https://api.ufitpay.com/v1/withdrawal/verify/${reference}`, {
      method: 'GET',
      headers: {
        "Api-Key": UFITPAY_API_KEY,
        "Api-Token": UFITPAY_API_TOKEN,
      },
    });

    const data = await response.json();
    if (!data.status) {
      console.error('Withdrawal verification failed:', data.message);
      return null;
    }
    return data.data.status === 'success' ? data.data : null;
  } catch (error) {
    console.error('Error verifying withdrawal:', error.message);
    return null;
  }
}

// Webhook handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed.');
  }

  if (!req.body || !req.headers['x-ufitpay-signature']) {
    return res.status(400).send('Invalid Request.');
  }

  const signature = req.headers['x-ufitpay-signature'];
  if (!validateUfitpaySignature(req, signature)) {
    return res.status(400).send('Invalid signature.');
  }

  const { event, data } = req.body;

  if (event === 'charge.success') {
    // Handle deposit (add to investment)
    try {
      const transactionDetails = await verifyPayment(data.reference);

      if (transactionDetails) {
        const { email } = transactionDetails.customer;
        const userUid = await getUserUidByEmail(email);

        if (userUid) {
          const alreadyProcessed = await checkTransactionProcessed(userUid, transactionDetails.reference);

          if (alreadyProcessed) {
            return res.status(400).send('Transaction already processed.');
          }

          const investmentAmount = transactionDetails.amount / 100;
          await updateInvestment(userUid, investmentAmount, transactionDetails.reference);
          return res.status(200).send('Payment verified and investment updated.');
        } else {
          return res.status(400).send('User not found.');
        }
      } else {
        return res.status(400).send('Payment verification failed.');
      }
    } catch (error) {
      console.error('Error processing deposit:', error.message);
      return res.status(500).send('Internal Server Error.');
    }
  } else if (event === 'withdrawal.success') {
    // Handle withdrawal (deduct from userBalance)
    try {
      const withdrawalDetails = await verifyWithdrawal(data.reference);

      if (withdrawalDetails) {
        const { email } = withdrawalDetails.recipient;
        const userUid = await getUserUidByEmail(email);

        if (userUid) {
          const userRef = db.ref(`users/${userUid}`);
          const userSnapshot = await userRef.once('value');
          const userData = userSnapshot.val();

          const withdrawalAmount = withdrawalDetails.amount / 100;
          if (userData.userBalance >= withdrawalAmount) {
            await userRef.update({
              userBalance: userData.userBalance - withdrawalAmount,
              lastWithdrawalStatus: 'Success',
            });
            return res.status(200).send('Withdrawal success.');
          } else {
            return res.status(400).send('Insufficient balance.');
          }
        } else {
          return res.status(400).send('User not found.');
        }
      } else {
        return res.status(400).send('Withdrawal verification failed.');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error.message);
      return res.status(500).send('Internal Server Error.');
    }
  } else {
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
