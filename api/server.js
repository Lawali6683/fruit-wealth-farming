const express = require("express");
const { getDatabase, ref, set, get } = require("firebase-admin/database");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

const firebaseAdminSDK = JSON.parse(process.env.FIREBASE_ADMIN_SDK);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(firebaseAdminSDK),
  databaseURL: "https://fruit-wealth-farming-default-rtdb.firebaseio.com",
});

const db = admin.database();
const app = express();

// Parse incoming JSON data
app.use(express.json());

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function verifyPayment(transactionReference) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${transactionReference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const data = await response.json();
  return data.status === "success" ? data.data : null;
}

app.post("/webhook", async (req, res) => {
  const { event, data } = req.body;

  if (event === "charge.success") {
    const transactionDetails = await verifyPayment(data.reference);

    if (transactionDetails) {
      const { email } = data.customer;
      const userUid = await getUserUidByEmail(email);

      if (userUid) {       
        const alreadyProcessed = await checkTransactionProcessed(userUid, data.reference);

        if (alreadyProcessed) {
          return res.status(400).send("This transaction has already been processed.");
        }

        const investmentAmount = transactionDetails.amount / 100;                    
        await updateInvestment(userUid, investmentAmount, data.reference);
        res.status(200).send("Payment verified and investment updated");
      } else {
        res.status(400).send("User not found");
      }
    } else {
      res.status(400).send("Payment verification failed");
    }
  } else {
    res.status(400).send("Invalid event");
  }
});

// Function to get user UID by email
async function getUserUidByEmail(email) {
  const usersRef = ref(db, "users");
  const usersSnapshot = await get(usersRef);
  const usersData = usersSnapshot.val();

  for (let userId in usersData) {
    if (usersData[userId].email === email) {
      return userId;
    }
  }
  return null; // Return null if user not found
}

async function checkTransactionProcessed(userUid, transactionReference) {
  const userRef = ref(db, "users/" + userUid);
  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val();

  if (userData && userData.transactions) {
  
    return userData.transactions.includes(transactionReference);
  }
  return false;
}

// Function to update investment in Firebase
async function updateInvestment(userUid, investmentAmount, transactionReference) {
  const userRef = ref(db, "users/" + userUid);
  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val();

  if (userData) {
    const newInvestment = (userData.investment || 0) + investmentAmount;
   
    await set(userRef, {
      ...userData,
      investment: newInvestment,
      transactions: userData.transactions ? [...userData.transactions, transactionReference] : [transactionReference],
    });
    console.log("User investment updated successfully");
  }
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
