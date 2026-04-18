import { Request, Response, NextFunction } from 'express';
import { authUtils } from '../utils/auth.js';
import { adminAuth } from '../firebaseAdmin.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';

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
      try {
        const firebaseUser = await adminAuth.verifyIdToken(token);
        
        // Assign role based on email or default to analyst
        // Avoid using getFirestore() here as it requires service account credentials
        let role = 'analyst';
        if (firebaseUser.email === 'blueparasite1234@gmail.com' || firebaseUser.email === '1dt24cy038@dsatm.edu.in') {
          role = 'admin';
        }
        
        (req as any).user = {
          id: firebaseUser.uid,
          username: firebaseUser.email?.split('@')[0] || 'User',
          role: role,
          isFirebase: true
        };
        return next();
      } catch (verifyErr) {
        console.error(`Firebase token verification failed explicitly:`, verifyErr);
        fs.appendFileSync('/app/applet/auth_errors.log', new Date().toISOString() + ' - ' + (verifyErr instanceof Error ? verifyErr.message : String(verifyErr)) + '\n');
        return res.status(401).json({ error: 'Unauthorized: Invalid Firebase token', details: verifyErr instanceof Error ? verifyErr.message : String(verifyErr) });
      }
    }
  } catch (err) {
    console.warn(`Error decoding token:`, err);
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
