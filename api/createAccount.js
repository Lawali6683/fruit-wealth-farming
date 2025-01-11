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

db.ref("users").on("child_added", async (snapshot) => {
    const userId = snapshot.key;
    const userData = snapshot.val();

    if (userData.accountDetails) {
        console.log(`Account already exists for user ${userId}`);
        return;
    }

    try {
        // Create UfitPay customer
        const customerRequestData = {
            email: userData.email || `${userId}@fruitwealth.com`,
            full_name: userData.fullName,
            phone_number: userData.phoneNumber || "0000000000",
        };

        const customerResponse = await fetch(
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

        if (!customerResponse.ok) {
            console.error(`Failed to create customer for user ${userId}:`, customerData);
            return;
        }

        // Create virtual account for Wema Bank
        const virtualAccountRequestData = {
            customer_id: customerData.customer_id,
            bank_name: "Wema Bank", 
            currency: "NGN", 
            reference_id: `${userId}-${Date.now()}`, 
        };

        const virtualAccountResponse = await fetch(
            "https://api.ufitpay.com/v1/dedicated_account",
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

        if (!virtualAccountResponse.ok) {
            console.error(`Failed to create virtual account for user ${userId}:`, virtualAccountData);
            return;
        }

        // Save account details in Firebase
        const accountDetails = {
            accountNumber: virtualAccountData.account_number,
            bankName: "Wema Bank",  accountName: virtualAccountData.account_name,
            customerId: customerData.customer_id,
            referenceId: virtualAccountData.reference_id, 
        };

        await db.ref(`users/${userId}/accountDetails`).set(accountDetails);

        console.log(`Virtual account created for user ${userId}`);
    } catch (error) {
        console.error(`Error creating virtual account for user ${userId}:`, error);
    }
});
