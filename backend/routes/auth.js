const express = require('express');
const router = express.Router();
const { db, auth } = require('../lib/firebase');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/signup
 * Creates a new user in Firebase Auth + stores profile in Firestore.
 * Body: { email, password, displayName }
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    // Store user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName || '',
      photoURL: userRecord.photoURL || '',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    });
  } catch (error) {
    console.error('Signup Error:', error.message);

    // Handle Firebase-specific error codes
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    res.status(500).json({ error: 'Failed to create account. ' + error.message });
  }
});

/**
 * POST /api/auth/sync
 * Called after frontend login (email/password or social).
 * Syncs/updates user profile in Firestore.
 * Requires valid Firebase ID token.
 */
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // Update last login
      await userRef.update({
        lastLogin: new Date().toISOString(),
        ...(name && { displayName: name }),
        ...(picture && { photoURL: picture }),
      });
    } else {
      // First time social login — create profile
      await userRef.set({
        email: email || '',
        displayName: name || '',
        photoURL: picture || '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });
    }

    res.json({
      message: 'Profile synced',
      uid,
      email,
      displayName: name,
    });
  } catch (error) {
    console.error('Sync Error:', error.message);
    res.status(500).json({ error: 'Failed to sync profile. ' + error.message });
  }
});

/**
 * GET /api/auth/profile
 * Returns the current user's Firestore profile.
 * Requires valid Firebase ID token.
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ uid, ...userDoc.data() });
  } catch (error) {
    console.error('Profile Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile. ' + error.message });
  }
});

module.exports = router;
