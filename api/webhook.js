import admin from 'firebase-admin';
import fetch from 'node-fetch';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const firebaseAdminSDK = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
  admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminSDK),
    databaseURL: 'https://fruit-wealth-farming-default-rtdb.firebaseio.com',
  });
}

const db = admin.database();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Function to verify payment with Paystack
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
    return data.status && data.data.status === 'success' ? data.data : null;
  } catch (error) {
    console.error('Error verifying payment:', error.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
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
              return res.status(400).send('Transaction already processed.');
            }

            const investmentAmount = transactionDetails.amount / 100; // Convert kobo to Naira
            await updateInvestment(userUid, investmentAmount, transactionDetails.reference);
            return res.status(200).send('Payment verified and investment updated.');
          } else {
            return res.status(400).send('User not found.');
          }
        } else {
          return res.status(400).send('Payment verification failed.');
        }
      } catch (error) {
        console.error('Error processing webhook:', error.message);
        return res.status(500).send('Internal Server Error.');
      }
    } else {
      return res.status(400).send('Invalid event.');
    }
  } else {
    return res.status(405).send('Method Not Allowed.');
  }
}

// Helper Functions
async function getUserUidByEmail(email) {
  const usersRef = ref(db, 'users');
  const usersSnapshot = await get(usersRef);
  const usersData = usersSnapshot.val();
  for (let userId in usersData) {
    if (usersData[userId].email === email) {
      return userId;
    }
  }
  return null; 
}

async function checkTransactionProcessed(userUid, transactionReference) {
  const userRef = ref(db, `users/${userUid}/transactions`);
  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val();
  return userData ? userData.includes(transactionReference) : false; 
}

async function updateInvestment(userUid, investmentAmount, transactionReference) {
  const userRef = ref(db, `users/${userUid}`);
  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val();
  
  if (!userData) {
    throw new Error('User data not found');
  }

  const newInvestment = (userData.investment || 0) + investmentAmount;

  const updatedTransactions = userData.transactions 
    ? [...userData.transactions, transactionReference] 
    : [transactionReference]; 

  await set(userRef, {
    ...userData,
    investment: newInvestment,
    transactions: updatedTransactions, 
  });
}
