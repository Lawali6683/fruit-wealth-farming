import { getDatabase, ref, get, set, child } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtwsxKGlpX-ofm-yE4o6_5FNYyKFy7X7w",
  authDomain: "fruit-wealth-farming.firebaseapp.com",
  databaseURL: "https://fruit-wealth-farming-default-rtdb.firebaseio.com",
  projectId: "fruit-wealth-farming",
  storageBucket: "fruit-wealth-farming.appspot.com",
  messagingSenderId: "417203511096",
  appId: "1:417203511096:web:1ecaca3d0a705a8c16ebcd",
  measurementId: "G-BZFLHB4KM2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// Function to initialize or update user data
function initializeUserData(user) {
  const userRef = ref(db, 'users/' + user.uid);

  get(userRef).then((snapshot) => {
    if (!snapshot.exists()) {
      // If user data doesn't exist, initialize it
      set(userRef, {
        investment: 0.00,
        dailyUpgrade: 0.00,
        userBalance: 0.00,
        investmentReferral: 0,
        referralBy: null,
        referralCode: null,
        tsohonUser: 'no', // Mark as new user
        lastUpgradeTime: 0,
      });
    }
  }).catch((error) => {
    console.error("Error initializing user data:", error);
  });
}

// Function to check expired investments
function checkExpiredInvestments(user) {
  const userRef = ref(db, 'users/' + user.uid);

  get(userRef).then((snapshot) => {
    if (snapshot.exists()) {
      const userData = snapshot.val();
      const currentTime = new Date().getTime();
      const lastUpgradeTime = userData.lastUpgradeTime || 0;
      const daysElapsed = Math.floor((currentTime - lastUpgradeTime) / (24 * 60 * 60 * 1000));

      let maxDays = 0;
      if (userData.investment >= 3500 && userData.investment < 8000) maxDays = 35;
      else if (userData.investment >= 8000 && userData.investment < 15000) maxDays = 35;
      else if (userData.investment >= 15000 && userData.investment < 35000) maxDays = 36;
      else if (userData.investment >= 35000 && userData.investment < 70000) maxDays = 37;
      else if (userData.investment >= 70000 && userData.investment < 140000) maxDays = 39;
      else if (userData.investment >= 140000 && userData.investment < 280000) maxDays = 40;
      else if (userData.investment >= 280000) maxDays = 42;

      if (daysElapsed >= maxDays) {
        alert("Congratulations to you, esteemed member of the special FWF Company! You can continue investing once your deposit period ends. If you are a new member, start now and receive a 500 bonus in your withdrawal account. ");
      }
    }
  }).catch((error) => {
    console.error("Error checking expired investments:", error);
  });
}

// Function to handle deposits and bonuses
function handleDeposit(amount) {
  const user = auth.currentUser;

  if (user) {
    const userRef = ref(db, 'users/' + user.uid);

    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();

        if (userData.tsohonUser === 'yes') {
          alert("Welcome bonus already claimed. No further bonuses available.");
          return;
        }

        let bonus = 0;
        let dailyBonus = 0;
        let daysRemaining = 0;

        if (amount >= 3500 && amount < 8000) {
          bonus = 500;
          dailyBonus = 160;
          daysRemaining = 35;
        } else if (amount >= 8000 && amount < 15000) {
          bonus = 500;
          dailyBonus = 350;
          daysRemaining = 35;
        } else if (amount >= 15000 && amount < 35000) {
          bonus = 500;
          dailyBonus = 780;
          daysRemaining = 36;
        } else if (amount >= 35000 && amount < 70000) {
          bonus = 500;
          dailyBonus = 1560;
          daysRemaining = 37;
        } else if (amount >= 70000 && amount < 140000) {
          bonus = 500;
          dailyBonus = 3120;
          daysRemaining = 39;
        } else if (amount >= 140000 && amount < 280000) {
          bonus = 500;
          dailyBonus = 6240;
          daysRemaining = 40;
        } else if (amount >= 280000) {
          bonus = 500;
          dailyBonus = 12480;
          daysRemaining = 42;
        }

        const currentTime = new Date().getTime();
        const newUserBalance = (userData.userBalance || 0) + bonus;

        // Update user data with new deposit and bonuses
        set(userRef, {
          investment: amount,
          userBalance: newUserBalance,
          dailyUpgrade: dailyBonus,
          expirationDate: currentTime + (daysRemaining * 24 * 60 * 60 * 1000),
          lastUpgradeTime: currentTime,
          tsohonUser: 'yes', // Mark as an existing user after first deposit
          investmentReferral: userData.investmentReferral || 0,
          referralBy: userData.referralBy || null,
          referralCode: userData.referralCode || null,
        });

        // Referral bonus handling
        if (userData.referralBy) {
          const referralUserRef = ref(db, 'users/' + userData.referralBy);

          get(referralUserRef).then((referralSnapshot) => {
            if (referralSnapshot.exists()) {
              const referralUserData = referralSnapshot.val();

              let referralBonus = 0;
              let dailyReferralBonus = 0;

              if (amount >= 3500 && amount < 8000) {
                referralBonus = 280;
                dailyReferralBonus = 12.8;
              } else if (amount >= 8000 && amount < 15000) {
                referralBonus = 640;
                dailyReferralBonus = 28;
              } else if (amount >= 15000 && amount < 35000) {
                referralBonus = 1200;
                dailyReferralBonus = 124.8;
              } else if (amount >= 35000 && amount < 70000) {
                referralBonus = 2800;
                dailyReferralBonus = 124.8;
              } else if (amount >= 70000 && amount < 140000) {
                referralBonus = 5600;
                dailyReferralBonus = 245.6;
              } else if (amount >= 140000 && amount < 280000) {
                referralBonus = 11200;
                dailyReferralBonus = 499.2;
              } else if (amount >= 280000) {
                referralBonus = 22400;
                dailyReferralBonus = 998.4;
              }

              let newReferralBalance = referralUserData.userBalance + referralBonus;
              let newReferralDailyUpgrade = (referralUserData.dailyUpgrade || 0) + dailyReferralBonus;

              // Update the referring user
              set(referralUserRef, {
                ...referralUserData,
                userBalance: newReferralBalance,
                dailyUpgrade: newReferralDailyUpgrade,
                investmentReferral: (referralUserData.investmentReferral || 0) + 1,
              });

              alert("Referral bonus added successfully!");
            }
          }).catch((error) => {
            console.error("Error updating referral bonus:", error);
          });
        }
      }
    }).catch((error) => {
      console.error("Error handling deposit:", error);
    });
  }
}

// Monitor authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    initializeUserData(user);
    checkExpiredInvestments(user);
  }
});
