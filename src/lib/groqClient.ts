import Groq from 'groq-sdk';

// Initialize the Groq client
// It requires Node 18+ to run natively without polyfills
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "YOUR_GROQ_API_KEY_HERE",
});

export default groq;
