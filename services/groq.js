/**
 * Shared Groq API client for AI features. Uses GROQ_API_KEY from env.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

/**
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {{ maxTokens?: number, temperature?: number }} [opts]
 * @returns {Promise<string|null>} Response content or null on failure/missing key.
 */
async function groqChat(systemPrompt, userMessage, opts = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const { maxTokens = 256, temperature = 0.3 } = opts;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: (userMessage || '').slice(0, 1000) }
        ],
        max_tokens: maxTokens,
        temperature
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (err) {
    console.error('Groq request failed:', err.message);
    return null;
  }
}

module.exports = { groqChat };
