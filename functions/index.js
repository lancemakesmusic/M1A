const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")("sk_test_51RlfuGIHhqOsi2FxasxUeuDWheEQIxEACRKMl3hXK9xkMa2GX8M7PbGv1LXXmRW7UdTqzEipB3rPFWW0BN0xXl3i00k5FNItDD");

admin.initializeApp();
const db = admin.firestore();

exports.createStripePaymentIntent = functions.https.onCall(async (data, context) => {
  const { amount } = data;
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid amount.");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: { uid },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error("Stripe Error:", error.message);
    throw new functions.https.HttpsError("internal", "Failed to create PaymentIntent.");
  }
});
