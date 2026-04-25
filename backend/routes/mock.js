const express = require('express');
const router = express.Router();
const { chatWithGemini } = require('../lib/gemini');
const { db } = require('../lib/firebase');
const { optionalAuth, requireAuth } = require('../middleware/auth');

// ─── POST /api/mock — Legacy chat (kept for backward compatibility) ────────────
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { targetRole, chatHistory, sessionId } = req.body;

    if (!targetRole) {
      return res.status(400).json({ error: 'targetRole is required' });
    }

    const systemPrompt = `You are a strict but fair technical interviewer for a ${targetRole} role.
Your job is to conduct a mock interview simulator.
1. When the conversation starts, introduce yourself briefly and ask the first question.
2. When the user responds, evaluate their answer, provide a score out of 10, offer short constructive feedback, and then seamlessly ask the NEXT relevant question.
3. Keep your responses concise, professional, and directly related to the interview format.
Do not break character. Do not use markdown backticks unless writing a specific code snippet.`;

    const history = (chatHistory || []).slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const lastMessage =
      chatHistory && chatHistory.length > 0
        ? chatHistory[chatHistory.length - 1].content
        : 'Start the interview please.';

    const response = await chatWithGemini(systemPrompt, history, lastMessage);

    let currentSessionId = sessionId || null;
    if (req.user) {
      const sessionData = {
        userId: req.user.uid,
        targetRole,
        chatHistory: [...(chatHistory || []), { role: 'assistant', content: response }],
        updatedAt: new Date().toISOString(),
      };
      if (currentSessionId) {
        await db.collection('mock_sessions').doc(currentSessionId).update(sessionData);
      } else {
        sessionData.createdAt = new Date().toISOString();
        const docRef = await db.collection('mock_sessions').add(sessionData);
        currentSessionId = docRef.id;
      }
    }

    res.json({ response, sessionId: currentSessionId });
  } catch (error) {
    console.error('Mock Interview Error:', error.message);
    res.status(500).json({ error: 'Failed to communicate with interviewer. ' + error.message });
  }
});

// ─── POST /api/mock/generate — Generate a coding problem or behavioral scenario ─
router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const { skill, mode, category, candidateName, candidateRole } = req.body;

    if (!skill || !mode) {
      return res.status(400).json({ error: 'skill and mode are required' });
    }

    const nameCtx = candidateName ? ` for ${candidateName}` : '';
    const roleCtx = candidateRole ? ` (target role: ${candidateRole})` : '';

    let prompt;

    if (mode === 'coding') {
      prompt = `You are a senior ${skill} engineer creating a technical interview question${nameCtx}${roleCtx}.
Generate a single coding problem for a ${skill} developer interview.
Respond ONLY with a JSON object in this exact format (no markdown, no backticks):
{
  "title": "Problem title here",
  "difficulty": "Medium",
  "timeLimit": "20 minutes",
  "problem": "Full detailed problem statement here. Include context, requirements, and constraints.",
  "examples": [
    { "input": "example input", "output": "expected output", "explanation": "why this output" }
  ],
  "hints": ["Hint 1", "Hint 2"]
}`;
    } else {
      prompt = `You are a behavioral interview expert for ${skill} skills.
Generate a realistic behavioral/roleplay scenario for a ${skill} interview${nameCtx}${roleCtx}.
Respond ONLY with a JSON object in this exact format (no markdown, no backticks):
{
  "title": "Scenario title here",
  "context": "Set the scene. Describe the situation the candidate is in.",
  "task": "What the candidate needs to do or explain in this scenario",
  "roleplay": "The exact question or scenario prompt to present to the candidate",
  "criteria": ["Evaluation criterion 1", "Evaluation criterion 2", "Evaluation criterion 3"]
}`;
    }

    const raw = await chatWithGemini(
      'You are an expert interview question generator. Always respond with valid JSON only, no extra text.',
      [],
      prompt
    );

    // Strip markdown fences if any
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    let questionData;
    try {
      questionData = JSON.parse(cleaned);
    } catch {
      questionData =
        mode === 'coding'
          ? { title: `${skill} Challenge`, difficulty: 'Medium', timeLimit: '20 minutes', problem: cleaned, examples: [], hints: [] }
          : { title: `${skill} Scenario`, context: '', task: '', roleplay: cleaned, criteria: [] };
    }

    res.json({ question: questionData, mode, skill, category });
  } catch (error) {
    console.error('Mock Generate Error:', error.message);
    res.status(500).json({ error: 'Failed to generate interview question. ' + error.message });
  }
});

// ─── POST /api/mock/evaluate — Evaluate submission & save to Firestore ─────────
router.post('/evaluate', optionalAuth, async (req, res) => {
  try {
    const { skill, mode, category, question, code, transcript, sessionId, candidateName } = req.body;

    if (!skill || !mode) {
      return res.status(400).json({ error: 'skill and mode are required' });
    }

    const hasSubmission =
      (code && code.trim().length > 10) || (transcript && transcript.trim().length > 5);

    let submissionDesc;
    if (mode === 'coding') {
      submissionDesc = `
PROBLEM: ${question?.problem || question?.title || 'Unknown problem'}
CANDIDATE VOICE TRANSCRIPT (thought process): ${transcript || '(No verbal explanation provided)'}
CANDIDATE CODE SUBMISSION:
\`\`\`
${code || '(No code submitted)'}
\`\`\``;
    } else {
      submissionDesc = `
SCENARIO: ${question?.roleplay || question?.title || 'Unknown scenario'}
CANDIDATE'S SPOKEN RESPONSE: ${transcript || '(No response provided)'}`;
    }

    const evaluationPrompt = `You are a strict but fair ${skill} interview evaluator.
Candidate name: ${candidateName || 'the candidate'}.
Evaluate the following ${mode === 'coding' ? 'coding submission' : 'behavioral answer'} for a ${skill} interview.

${submissionDesc}

${!hasSubmission ? 'NOTE: The candidate submitted nothing — assign a low score and encourage them to attempt next time.\n' : ''}
Respond ONLY with a valid JSON object in this EXACT format (no markdown, no backticks, no extra text):
{
  "score": <integer 1-10>,
  "grade": "<A/B/C/D/F>",
  "feedback": "<2-3 sentences of specific, actionable feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area to improve 1>", "<area to improve 2>"],
  "suggestedResources": [
    {"title": "<Resource name>", "url": "<real working URL>"},
    {"title": "<Resource name>", "url": "<real working URL>"},
    {"title": "<Resource name>", "url": "<real working URL>"}
  ]
}

For suggestedResources use REAL URLs to official docs, tutorials or reputable resources for ${skill}.`;

    const raw = await chatWithGemini(
      'You are a precise interview evaluator. Always respond with valid JSON only.',
      [],
      evaluationPrompt
    );

    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    let evaluation;
    try {
      evaluation = JSON.parse(cleaned);
    } catch {
      evaluation = {
        score: 5,
        grade: 'C',
        feedback: 'Your answer showed some understanding. Keep practicing to improve.',
        strengths: ['Attempted the problem'],
        improvements: ['Provide more detailed explanations', 'Practice more examples'],
        suggestedResources: [
          { title: `${skill} Documentation`, url: 'https://developer.mozilla.org' },
          { title: 'FreeCodeCamp', url: 'https://www.freecodecamp.org' },
          { title: 'LeetCode', url: 'https://leetcode.com' },
        ],
      };
    }

    // ── Save to Firestore (ALWAYS — guests get a temporary ID) ────────────────
    let savedSessionId = sessionId || null;
    const saveUserId = req.user ? req.user.uid : `guest_${Date.now()}`;

    try {
      const sessionData = {
        userId: saveUserId,
        isGuest: !req.user,
        candidateName: candidateName || null,
        skill,
        mode,
        category: category || 'technical',
        question: question || {},
        code: code || null,
        transcript: transcript || null,
        evaluation,
        createdAt: new Date().toISOString(),
      };

      if (savedSessionId && req.user) {
        await db
          .collection('interview_sessions')
          .doc(savedSessionId)
          .set(sessionData, { merge: true });
        console.log(`[Firestore] ✅ Updated session ${savedSessionId} for user ${saveUserId}`);
      } else {
        const docRef = await db.collection('interview_sessions').add(sessionData);
        savedSessionId = docRef.id;
        console.log(
          `[Firestore] ✅ Saved new session ${savedSessionId} for ${req.user ? 'user' : 'guest'} ${saveUserId}`
        );
      }
    } catch (dbError) {
      console.error('[Firestore] ❌ Save error (non-fatal):', dbError.message);
    }

    res.json({ evaluation, sessionId: savedSessionId });
  } catch (error) {
    console.error('Mock Evaluate Error:', error.message);
    res.status(500).json({ error: 'Failed to evaluate submission. ' + error.message });
  }
});

// ─── GET /api/mock/history — Past structured interview sessions ────────────────
router.get('/history', requireAuth, async (req, res) => {
  try {
    const snapshot = await db
      .collection('interview_sessions')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const sessions = snapshot.docs.map((doc) => ({
      id: doc.id,
      skill: doc.data().skill,
      mode: doc.data().mode,
      score: doc.data().evaluation?.score,
      grade: doc.data().evaluation?.grade,
      createdAt: doc.data().createdAt,
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('Mock History Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch interview history. ' + error.message });
  }
});

// ─── GET /api/mock/sessions/history — Legacy chat sessions ────────────────────
router.get('/sessions/history', requireAuth, async (req, res) => {
  try {
    const snapshot = await db
      .collection('mock_sessions')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const sessions = snapshot.docs.map((doc) => ({
      id: doc.id,
      targetRole: doc.data().targetRole,
      messageCount: (doc.data().chatHistory || []).length,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('Mock History Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch mock session history. ' + error.message });
  }
});

module.exports = router;
