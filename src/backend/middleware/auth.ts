import { Request, Response, NextFunction } from 'express';
import { authUtils } from '../utils/auth.js';
import { adminAuth } from '../firebaseAdmin.js';
import jwt from 'jsonwebtoken';
import { getFirestore } from 'firebase-admin/firestore';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`Auth failed: No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Check if it's a Firebase token (they are JWTs and usually have a specific issuer)
    const decodedToken = jwt.decode(token) as any;
    
    if (decodedToken && decodedToken.iss && decodedToken.iss.includes('securetoken.google.com')) {
      // Verify with Firebase Admin
      const firebaseUser = await adminAuth.verifyIdToken(token);
      
      // We need to fetch the user's role from Firestore since it's not in the token
      // For now, we can just pass the uid and email, and assume 'analyst' unless we fetch it.
      // To be safe, let's fetch the role from Firestore using admin SDK
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
      const role = userDoc.exists ? userDoc.data()?.role : 'analyst';
      
      (req as any).user = {
        id: firebaseUser.uid,
        username: firebaseUser.email?.split('@')[0] || 'User',
        role: role,
        isFirebase: true
      };
      return next();
    }
  } catch (err) {
    console.warn(`Firebase token verification failed:`, err);
    // Fall back to normal JWT verification if Firebase fails or it's not a Firebase token
  }

  const decoded = authUtils.verifyToken(token);

  if (!decoded) {
    console.warn(`Auth failed: Invalid or expired token for ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  (req as any).user = decoded;
  next();
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    console.warn(`Admin auth failed: User ${user?.username} attempted to access ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
