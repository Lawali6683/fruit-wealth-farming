
import { initializeApp } from 'firebase-admin/app';
import admin from 'firebase-admin';
import crypto from 'crypto';
import fetch from 'node-fetch';

if (!admin.apps.length) {
  const firebaseAdminSDK = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
  admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminSDK),
    databaseURL: 'https://fruit-wealth-farming-default-rtdb.firebaseio.com',
  });
}

const db = admin.database();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function validatePaystackSignature(req, signature) {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === signature;
}

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

export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log('Webhook Received:', req.body);

    const signature = req.headers['x-paystack-signature'];
    if (!signature || !validatePaystackSignature(req, signature)) {
      console.error('Invalid Signature');
      return res.status(400).send('Invalid signature.');
    }

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
  } else {
    return res.status(405).send('Method Not Allowed.');
  }
}

async function getUserUidByEmail(email) {
  try {
    const usersRef = admin.database().ref('users');
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
    const userRef = admin.database().ref(`users/${userUid}/transactions`);
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
    const userRef = admin.database().ref(`users/${userUid}`);
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
