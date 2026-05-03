const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testKey() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing Key:", key);
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Say 'Key is valid'");
        console.log("Response:", result.response.text());
    } catch (err) {
        console.error("TEST FAILED:", err.message);
        if (err.response) {
            console.error("Detailed Error:", JSON.stringify(err.response, null, 2));
        }
    }
}

testKey();
