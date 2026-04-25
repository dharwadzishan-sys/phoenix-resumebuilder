const express = require('express');
const router = express.Router();
const { generateJSON } = require('../lib/gemini');
const { db } = require('../lib/firebase');
const { optionalAuth, requireAuth } = require('../middleware/auth');

// POST /api/topics — Generate study roadmap (optionally saves to Firestore)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { targetRole, experience } = req.body;

    if (!targetRole) {
      return res.status(400).json({ error: 'targetRole is required' });
    }

    const prompt = `You are a career counselor and technical mentor.
Generate a structured study plan for a ${targetRole} with ${experience || 'entry'} level experience.
Create exactly 3 to 4 core modules that the candidate should master to ace their interview.

Return ONLY a valid JSON object in this exact format (no markdown, no backticks):
{
  "modules": [
    {
      "title": "Module Name (e.g. System Design)",
      "desc": "Short description of what the module covers",
      "topics": ["Specific Topic 1", "Specific Topic 2", "Specific Topic 3"]
    }
  ]
}`;

    const parsed = await generateJSON(prompt);
    const modules = parsed.modules || [];

    // Save to Firestore if user is authenticated
    let docId = null;
    if (req.user) {
      const docRef = await db.collection('study_plans').add({
        userId: req.user.uid,
        targetRole,
        experience: experience || '',
        modules,
        createdAt: new Date().toISOString(),
      });
      docId = docRef.id;
    }

    res.json({ modules, docId });
  } catch (error) {
    console.error('Topics Generation Error:', error.message);
    res.status(500).json({ error: 'Failed to generate study plan. ' + error.message });
  }
});

// GET /api/topics/history — Get user's past study plans (requires auth)
router.get('/history', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('study_plans')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ plans });
  } catch (error) {
    console.error('Topics History Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch study plan history. ' + error.message });
  }
});

// GET /api/topics/:id — Get a specific study plan by ID (requires auth)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('study_plans').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Study plan not found' });
    }

    const data = doc.data();

    if (data.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ id: doc.id, ...data });
  } catch (error) {
    console.error('Topics Fetch Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch study plan. ' + error.message });
  }
});

module.exports = router;
