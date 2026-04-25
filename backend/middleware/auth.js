const { auth } = require('../lib/firebase');

/**
 * Authentication middleware — verifies Firebase ID token.
 * Attaches decoded user info to req.user if valid.
 * Returns 401 if token is missing or invalid.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header. Expected: Bearer <token>' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
    };
    next();
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth middleware — if a token is provided, it verifies it.
 * If no token is provided, the request continues without user info.
 * This allows routes to work for both authenticated and anonymous users.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
    };
  } catch (error) {
    // Token was provided but invalid — still allow the request, just no user
    req.user = null;
  }

  next();
}

module.exports = { requireAuth, optionalAuth };
