import admin from "firebase-admin";
import fetch from "node-fetch";

// Initialize Firebase Admin SDK
const firebaseAdminSDK = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminSDK),
        databaseURL: "https://fruit-wealth-farming-default-rtdb.firebaseio.com",
    });
}

const db = admin.database();
const apiKey = process.env.UFITPAY_API_KEY;
const apiToken = process.env.UFITPAY_API_TOKEN;

// Fetch users and create virtual accounts if needed
const processUser = async (userId, userData) => {
    if (userData.accountDetails) {
        console.log(`Account already exists for user ${userId}`);
        return;
    }

    try {
        // Create UfitPay customer
        const customerRequestData = {
            email: userData.email,
            full_name: userData.fullName,
            phone_number: userData.phoneNumber,
        };

        const customerResponse = await fetchWithRetry(
            "https://api.ufitpay.com/v1/create_customer",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Api-Key": apiKey,
                    "Api-Token": apiToken,
                },
                body: JSON.stringify(customerRequestData),
            }
        );

        const customerData = await customerResponse.json();

        // Create virtual account for Wema Bank
        const virtualAccountRequestData = {
            customer_id: customerData.customer_id,
            bank_name: "Wema Bank",
            currency: "NGN",
            reference_id: `${userId}-${Date.now()}`,
        };

        const virtualAccountResponse = await fetchWithRetry(
            "https://api.ufitpay.com/v1/create_bank_account",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Api-Key": apiKey,
                    "Api-Token": apiToken,
                },
                body: JSON.stringify(virtualAccountRequestData),
            }
        );

        const virtualAccountData = await virtualAccountResponse.json();

        // Save account details in Firebase
        const accountDetails = {
            accountNumber: virtualAccountData.account_number,
            bankName: "Wema Bank",
            accountName: virtualAccountData.account_name,
            customerId: customerData.customer_id,
            referenceId: virtualAccountData.reference_id,
        };

        await db.ref(`users/${userId}/accountDetails`).set(accountDetails);

        console.log(`Virtual account created for user ${userId}`);
    } catch (error) {
        console.error(`Error creating virtual account for user ${userId}:`, error);
    }
};

// Retry mechanism for API requests
const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            console.error(`Retry ${i + 1}: Failed to fetch ${url}`);
        } catch (error) {
            console.error(`Retry ${i + 1}: Error fetching ${url}`, error);
        }
    }
    throw new Error(`Failed after ${retries} retries`);
};

// Process all existing users
const processExistingUsers = async () => {
    const snapshot = await db.ref("users").once("value");
    const users = snapshot.val();

    if (users) {
        for (const userId of Object.keys(users)) {
            const userData = users[userId];
            await processUser(userId, userData);
        }
    } else {
        console.log("No users found in the database.");
    }
};

// Listen for new users and process them
db.ref("users").on("child_added", async (snapshot) => {
    const userId = snapshot.key;
    const userData = snapshot.val();
    await processUser(userId, userData);
});

// Start processing existing users
processExistingUsers().catch((error) => console.error("Error processing existing users:", error));
