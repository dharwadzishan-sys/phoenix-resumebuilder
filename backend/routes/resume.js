const express = require('express');
const router = express.Router();
const { generateText } = require('../lib/gemini');
const { db } = require('../lib/firebase');
const { optionalAuth, requireAuth } = require('../middleware/auth');

// ─── Structured Resume Builder Endpoints ─────────────────────────────────────

/**
 * POST /api/resume/builder — Save or update structured resume profile
 * Stores one resume profile per user in the `resume_profiles` collection.
 */
router.post('/builder', requireAuth, async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      location,
      github,
      linkedIn,
      portfolio,
      profilePicUrl,
      professionalSummary,
      experience,
      education,
      skills,
      projects,
    } = req.body;

    // Validate required fields
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'fullName is required and must be a non-empty string' });
    }

    // Sanitize arrays — ensure they are arrays even if missing
    const safeExperience = Array.isArray(experience) ? experience : [];
    const safeEducation = Array.isArray(education) ? education : [];
    const safeSkills = Array.isArray(skills) ? skills : [];
    const safeProjects = Array.isArray(projects) ? projects : [];

    // Validate array items structure
    for (let i = 0; i < safeExperience.length; i++) {
      const exp = safeExperience[i];
      if (typeof exp !== 'object' || exp === null) {
        return res.status(400).json({ error: `experience[${i}] must be an object` });
      }
      // Ensure required string fields
      safeExperience[i] = {
        company: String(exp.company || ''),
        role: String(exp.role || ''),
        startDate: String(exp.startDate || ''),
        endDate: String(exp.endDate || ''),
        description: String(exp.description || ''),
      };
    }

    for (let i = 0; i < safeEducation.length; i++) {
      const edu = safeEducation[i];
      if (typeof edu !== 'object' || edu === null) {
        return res.status(400).json({ error: `education[${i}] must be an object` });
      }
      safeEducation[i] = {
        college: String(edu.college || ''),
        degree: String(edu.degree || ''),
        branch: String(edu.branch || ''),
        year: String(edu.year || ''),
      };
    }

    for (let i = 0; i < safeProjects.length; i++) {
      const proj = safeProjects[i];
      if (typeof proj !== 'object' || proj === null) {
        return res.status(400).json({ error: `projects[${i}] must be an object` });
      }
      safeProjects[i] = {
        title: String(proj.title || ''),
        techStack: String(proj.techStack || ''),
        description: String(proj.description || ''),
        link: String(proj.link || ''),
      };
    }

    // Ensure skills are all strings
    const cleanSkills = safeSkills
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim());

    // Check profilePicUrl size (base64 can be huge — limit to ~2MB)
    const picUrl = typeof profilePicUrl === 'string' ? profilePicUrl : '';
    if (picUrl.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: 'profilePicUrl is too large. Please use an image under 2MB.' });
    }

    const now = new Date().toISOString();
    const docRef = db.collection('resume_profiles').doc(req.user.uid);
    const existing = await docRef.get();

    const resumeData = {
      userId: req.user.uid,
      fullName: fullName.trim(),
      email: typeof email === 'string' ? email.trim() : '',
      phone: typeof phone === 'string' ? phone.trim() : '',
      location: typeof location === 'string' ? location.trim() : '',
      github: typeof github === 'string' ? github.trim() : '',
      linkedIn: typeof linkedIn === 'string' ? linkedIn.trim() : '',
      portfolio: typeof portfolio === 'string' ? portfolio.trim() : '',
      profilePicUrl: picUrl,
      professionalSummary: typeof professionalSummary === 'string' ? professionalSummary.trim() : '',
      experience: safeExperience,
      education: safeEducation,
      skills: cleanSkills,
      projects: safeProjects,
      updatedAt: now,
    };

    if (!existing.exists) {
      resumeData.createdAt = now;
      await docRef.set(resumeData);
    } else {
      await docRef.update(resumeData);
    }

    res.json({ success: true, message: 'Resume profile saved successfully' });
  } catch (error) {
    console.error('Resume Builder Save Error:', error.message);
    res.status(500).json({ error: 'Failed to save resume profile. ' + error.message });
  }
});

/**
 * GET /api/resume/builder — Load saved resume profile for the current user
 */
router.get('/builder', requireAuth, async (req, res) => {
  try {
    const docRef = db.collection('resume_profiles').doc(req.user.uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.json({ resume: null, message: 'No saved resume profile found' });
    }

    const data = doc.data();

    // Double-check ownership (belt-and-suspenders since doc ID = uid)
    if (data.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ resume: data });
  } catch (error) {
    console.error('Resume Builder Load Error:', error.message);
    res.status(500).json({ error: 'Failed to load resume profile. ' + error.message });
  }
});

/**
 * PUT /api/resume/builder — Partial update of resume profile fields
 * Accepts any subset of resume fields and merges them.
 */
router.put('/builder', requireAuth, async (req, res) => {
  try {
    const docRef = db.collection('resume_profiles').doc(req.user.uid);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'No existing resume profile to update. Use POST to create one first.' });
    }

    // Only allow whitelisted fields to be updated
    const allowedFields = [
      'fullName', 'email', 'phone', 'location', 'github', 'linkedIn',
      'portfolio', 'profilePicUrl', 'professionalSummary',
      'experience', 'education', 'skills', 'projects',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    updates.updatedAt = new Date().toISOString();

    await docRef.update(updates);

    res.json({ success: true, message: 'Resume profile updated successfully' });
  } catch (error) {
    console.error('Resume Builder Update Error:', error.message);
    res.status(500).json({ error: 'Failed to update resume profile. ' + error.message });
  }
});

// ─── AI Resume Generation Endpoints (existing) ──────────────────────────────

/**
 * POST /api/resume — Generate ATS resume via AI (optionally saves to Firestore)
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { targetRole, experience, notes } = req.body;

    if (!targetRole || !notes) {
      return res.status(400).json({ error: 'targetRole and notes are required' });
    }

    const prompt = `You are an expert AI Resume Writer.
Given the following details, generate an optimized, ATS-friendly markdown resume for a ${targetRole} with ${experience} level experience.
Focus on incorporating strong action verbs and quantitative achievements in the style of the Harvard Resume format.

Here are the user's raw notes/details to extract from:
${notes}

==== STRICT SYSTEM RULES ====
1. DO NOT invent, hallucinate, or guess ANY contact information.
2. If the user did NOT provide an email, phone number, LinkedIn, or GitHub, you MUST completely omit those fields from the header.
3. NEVER use placeholders like "johndoe@email.com", "[Email]", or "123-456-7890".
=============================

Return ONLY the Markdown output. Do not include introductory text or wrap in code blocks.`;

    const markdown = await generateText(prompt);

    // Save to Firestore if user is authenticated
    let docId = null;
    if (req.user) {
      const docRef = await db.collection('resumes').add({
        userId: req.user.uid,
        targetRole,
        experience: experience || '',
        notes,
        markdown,
        createdAt: new Date().toISOString(),
      });
      docId = docRef.id;
    }

    res.json({ markdown, docId });
  } catch (error) {
    console.error('Resume Generation Error:', error.message);
    res.status(500).json({ error: 'Failed to generate resume. ' + error.message });
  }
});

/**
 * GET /api/resume/history — Get user's past AI-generated resumes (requires auth)
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('resumes')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const resumes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ resumes });
  } catch (error) {
    console.error('Resume History Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch resume history. ' + error.message });
  }
});

/**
 * GET /api/resume/:id — Get a specific AI-generated resume by ID (requires auth)
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('resumes').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const data = doc.data();

    // Ensure the user owns this resume
    if (data.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ id: doc.id, ...data });
  } catch (error) {
    console.error('Resume Fetch Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch resume. ' + error.message });
  }
});

module.exports = router;
