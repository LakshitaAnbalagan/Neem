/**
 * quality.js — Neem Quality Checker route
 * POST /api/quality/check
 * Accepts a base64 image of a neem product, sends to Groq vision model,
 * returns quality analysis: grade, moisture estimate, purity, recommendations.
 */
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/check', async (req, res) => {
    try {
        const { imageBase64, mimeType = 'image/jpeg', productType = 'neem product' } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

        const prompt = `You are an expert neem product quality analyst with 20 years of experience in India's neem industry.

Analyze this image of a ${productType} and provide a detailed quality assessment.

Respond in this exact JSON format:
{
  "grade": "A" | "B" | "C" | "Reject",
  "gradeReason": "brief reason (1 sentence)",
  "moistureEstimate": "estimated moisture % range (e.g. 8-10%)",
  "colorAssessment": "color quality observation",
  "purityScore": 0-100,
  "purityNote": "brief purity observation",
  "defectsFound": ["list", "of", "visible", "defects"] or [],
  "recommendations": ["actionable", "suggestions"],
  "marketValue": "estimated price range (₹/kg) based on quality",
  "suitableFor": ["Oil extraction", "Cake fertilizer", etc.]
}

Grade definitions:
A = Premium, export quality, 90+ purity
B = Good commercial grade, 75-89 purity
C = Below standard, local market only <75
Reject = Not suitable for any neem processing

Be specific, practical, and use neem industry terminology.`;

        const response = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: `data:${mimeType};base64,${imageBase64}` }
                        },
                        { type: 'text', text: prompt }
                    ]
                }
            ],
            temperature: 0.3,
            max_tokens: 700
        });

        const raw = response.choices[0]?.message?.content || '';

        // Extract JSON from response
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Could not parse AI response', raw });
        }

        const analysis = JSON.parse(jsonMatch[0]);
        res.json({ success: true, analysis });

    } catch (err) {
        console.error('Quality check error:', err);
        res.status(500).json({ error: err.message || 'Quality check failed' });
    }
});

module.exports = router;
