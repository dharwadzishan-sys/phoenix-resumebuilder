const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Using a fast, high-quality Groq model
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

/**
 * Generate text content from Groq
 * @param {string} prompt - The prompt to send
 * @param {string} modelName - Ignored, overridden to Groq model
 * @returns {Promise<string>} Generated text
 */
async function generateText(prompt, modelName = DEFAULT_MODEL) {
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: DEFAULT_MODEL,
  });
  return completion.choices[0].message.content;
}

/**
 * Generate JSON content from Groq (parses the response)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<object>} Parsed JSON object
 */
async function generateJSON(prompt) {
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: DEFAULT_MODEL,
  });
  
  const text = completion.choices[0].message.content;
  
  // Clean up the response — LLMs sometimes wrap JSON in ```json blocks
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    // AI returned plain text instead of JSON — wrap it so callers don't crash
    return { _raw: cleaned, questions: [{ q: 'Explanation', a: cleaned }] };
  }
}

/**
 * Multi-turn chat with Groq
 * @param {string} systemPrompt - System instruction
 * @param {Array} history - Chat history in Gemini format [{role, parts}]
 * @param {string} userMessage - Latest user message
 * @returns {Promise<string>} AI response
 */
async function chatWithGemini(systemPrompt, history, userMessage) {
  // Map Gemini specific history format back to OpenAI/Groq format
  const groqHistory = (history || []).map(h => ({
    role: h.role === 'model' ? 'assistant' : 'user',
    content: h.parts && h.parts[0] ? h.parts[0].text : ''
  }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...groqHistory,
    { role: 'user', content: userMessage }
  ];

  const completion = await groq.chat.completions.create({
    messages: messages,
    model: DEFAULT_MODEL,
  });

  return completion.choices[0].message.content;
}

// Stub function in case anything else tries to call getModel()
function getModel() {
  return {};
}

module.exports = { generateText, generateJSON, chatWithGemini, getModel };
