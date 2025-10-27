// functions/ai/gptContentGenerator.js
// Optimized GPT Content Generation Module

const admin = require("firebase-admin");
const functions = require("firebase-functions");
const axios = require("axios");

// GPT Content Generation
exports.generateContentWithGPT = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { prompt, contentType, platform, brandVoice, targetAudience } = data;
  const userId = context.auth.uid;

  try {
    // Get user's brand kit for context
    const brandKit = await getUserBrandKit(userId);
    
    // Enhanced prompt with brand context
    const enhancedPrompt = createEnhancedPrompt(prompt, contentType, platform, brandVoice, targetAudience, brandKit);

    // Call GPT API
    const response = await callGPTAPI(enhancedPrompt, contentType);
    
    // Save generation to user history
    await saveGenerationHistory(userId, {
      prompt,
      contentType,
      platform,
      brandVoice,
      targetAudience,
      response: response.content,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      content: response.content,
      usage: response.usage
    };
  } catch (error) {
    throw new functions.https.HttpsError("internal", `Content generation failed: ${error.message}`);
  }
});

// Helper function to get user brand kit
async function getUserBrandKit(userId) {
  const brandKitDoc = await admin.firestore()
    .collection("users")
    .doc(userId)
    .collection("brandKit")
    .doc("main")
    .get();
  
  return brandKitDoc.exists ? brandKitDoc.data() : {};
}

// Helper function to create enhanced prompt
function createEnhancedPrompt(prompt, contentType, platform, brandVoice, targetAudience, brandKit) {
  const basePrompt = `Generate ${contentType} content for ${platform} platform.`;
  const brandContext = brandKit.brandVoice ? `Brand voice: ${brandKit.brandVoice}. ` : '';
  const audienceContext = targetAudience ? `Target audience: ${targetAudience}. ` : '';
  
  return `${basePrompt} ${brandContext}${audienceContext}Content request: ${prompt}`;
}

// Helper function to call GPT API
async function callGPTAPI(prompt, contentType) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a professional content creator specializing in ${contentType}. Create engaging, high-quality content that resonates with the target audience.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 500,
    temperature: 0.7
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return {
    content: response.data.choices[0].message.content,
    usage: response.data.usage
  };
}

// Helper function to save generation history
async function saveGenerationHistory(userId, generationData) {
  await admin.firestore()
    .collection("users")
    .doc(userId)
    .collection("generationHistory")
    .add(generationData);
}
