const express = require('express');
const router = express.Router();
const { generateJSON, generateText } = require('../lib/gemini');
const { db } = require('../lib/firebase');
const { optionalAuth, requireAuth } = require('../middleware/auth');

// POST /api/qa — Generate interview Q&A (optionally saves to Firestore)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { targetRole, domain, focusAreas, experienceLevel } = req.body;

    if (!targetRole || !domain) {
      return res.status(400).json({ error: 'targetRole and domain are required' });
    }

    // ── FAST PATH: paragraph explain (no JSON needed) ─────────────────────────
    if (focusAreas && focusAreas.startsWith('Write a detailed explanation')) {
      const text = await generateText(focusAreas);
      return res.json({
        questions: [{ q: targetRole, a: text.trim() }],
      });
    }

    // ── Normal Q&A path ─────────────────────────────────────────────────
    const levelMap = {
      entry:  'Entry Level (0-2 years). Ask foundational questions: basic concepts, definitions, simple scenarios. Avoid advanced architecture or system design.',
      mid:    'Mid Level (2-5 years). Ask intermediate questions: problem-solving, design patterns, real project experience, trade-offs.',
      senior: 'Senior Level (5+ years). Ask advanced questions: system design, architecture decisions, leadership scenarios, performance optimization, trade-offs at scale.',
    };
    const levelInstruction = levelMap[experienceLevel] || levelMap['mid'];

    const prompt = `You are an expert technical interviewer.
Generate EXACTLY 5 relevant interview questions and ideal answers for a ${targetRole} in the ${domain} industry.
Experience Level: ${levelInstruction}
${focusAreas ? `Special focus areas: ${focusAreas}` : ''}

IMPORTANT: Calibrate question depth and complexity STRICTLY to the experience level above.
- Entry: test basic knowledge and learning ability
- Mid: test practical experience and problem-solving
- Senior: test leadership, architecture, and deep technical mastery

Return ONLY a valid JSON object in this exact format (no markdown, no backticks):
{
  "questions": [
    { "q": "Question text here", "a": "Ideal response using STAR method or technical details here" }
  ]
}`;

    const parsed = await generateJSON(prompt);
    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    // Save to Firestore if user is authenticated
    let docId = null;
    if (req.user) {
      const docRef = await db.collection('qa_sessions').add({
        userId: req.user.uid,
        targetRole,
        domain,
        focusAreas: focusAreas || '',
        experienceLevel: experienceLevel || 'mid',
        questions,
        createdAt: new Date().toISOString(),
      });
      docId = docRef.id;
    }

    res.json({ questions, docId });
  } catch (error) {
    console.error('QA Generation Error:', error.message);
    res.status(500).json({ error: 'Failed to generate Q&A. ' + error.message });
  }
});

// GET /api/qa/history — Get user's past Q&A sessions (requires auth)
router.get('/history', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('qa_sessions')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('QA History Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Q&A history. ' + error.message });
  }
});

// GET /api/qa/:id — Get a specific Q&A session by ID (requires auth)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('qa_sessions').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Q&A session not found' });
    }

    const data = doc.data();

    if (data.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ id: doc.id, ...data });
  } catch (error) {
    console.error('QA Fetch Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Q&A session. ' + error.message });
  }
});

module.exports = router;
