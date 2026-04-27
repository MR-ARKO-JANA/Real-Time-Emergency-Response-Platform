require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Try to list models
        console.log('Fetching models...');
        // Note: listModels is not directly on genAI in some versions, but let's try
        // Actually, let's just try to generate with gemini-pro which is very stable
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-pro:", result.response.text());
    } catch (err) {
        console.error("Failed with gemini-pro:", err.message);
        
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
            const result = await model.generateContent("Hello");
            console.log("Success with gemini-1.5-flash (v1):", result.response.text());
        } catch (err2) {
            console.error("Failed with gemini-1.5-flash (v1):", err2.message);
        }
    }
}

test();
