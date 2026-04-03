import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.login(username, password);
      localStorage.setItem('soc_token', res.data.token);
      localStorage.setItem('soc_user', JSON.stringify(res.data.user));
      onLoginSuccess(res.data.user);
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Save or update user data in Firestore
      const userRef = doc(db, 'users', user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        return;
      }
      
      const userData: any = {
        uid: user.uid,
        email: user.email,
        lastLogin: new Date().toISOString(),
        role: userSnap.exists() ? userSnap.data().role : 'analyst' // Default role
      };
      
      if (user.displayName) userData.displayName = user.displayName;
      if (user.photoURL) userData.photoURL = user.photoURL;

      try {
        await setDoc(userRef, userData, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        return;
      }

      // For compatibility with existing app state
      const appUser = {
        id: user.uid,
        username: user.email?.split('@')[0] || user.displayName || 'User',
        role: userData.role,
        isFirebase: true
      };

      localStorage.setItem('soc_user', JSON.stringify(appUser));
      // We might need a token for the backend if the backend still expects one.
      // For now, we can use the Firebase ID token.
      const token = await user.getIdToken();
      localStorage.setItem('soc_token', token);
      
      onLoginSuccess(appUser);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-soc-bg flex items-center justify-center p-4 relative overflow-hidden dark">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-soc-blue/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-soc-purple/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-soc-blue via-soc-purple to-soc-blue"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-soc-blue/10 rounded-2xl flex items-center justify-center mb-4 neon-border-blue relative">
              <div className="absolute inset-0 bg-soc-blue/20 blur-md rounded-2xl"></div>
              <ShieldCheck className="w-8 h-8 text-soc-blue relative z-10" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-soc-text to-soc-muted">CyberSOC</h1>
            <p className="text-soc-muted mt-2 font-mono text-xs tracking-widest uppercase">Secure Authentication</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-soc-red/10 border border-soc-red/30 rounded-xl flex items-center gap-3 text-soc-red text-sm shadow-[0_0_10px_rgba(239,68,68,0.1)]"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-bold text-soc-muted uppercase tracking-widest mb-2 ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-soc-muted group-focus-within:text-soc-blue transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-soc-surface/50 border border-soc-border/50 rounded-xl py-3.5 pl-12 pr-4 text-soc-text focus:outline-none focus:border-soc-blue/50 focus:ring-1 focus:ring-soc-blue/50 transition-all"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-soc-muted uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-soc-muted group-focus-within:text-soc-blue transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-soc-surface/50 border border-soc-border/50 rounded-xl py-3.5 pl-12 pr-4 text-soc-text focus:outline-none focus:border-soc-blue/50 focus:ring-1 focus:ring-soc-blue/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-soc-blue text-white font-bold rounded-xl hover:bg-soc-blue/90 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(14,165,233,0.4)] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Initialize Session
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-soc-border/50"></div>
              <span className="flex-shrink-0 mx-4 text-soc-muted text-xs uppercase tracking-widest">Or continue with</span>
              <div className="flex-grow border-t border-soc-border/50"></div>
            </div>
            
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-4 w-full py-3.5 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Sign-In
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-soc-border/30 text-center">
            <p className="text-xs text-soc-muted">
              Default credentials: <span className="text-soc-text font-mono">admin / admin123</span>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-soc-muted mt-8 uppercase tracking-widest">
          Authorized Personnel Only • System Monitored
        </p>
      </motion.div>
    </div>
  );
}
