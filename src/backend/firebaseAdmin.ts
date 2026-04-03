import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// Read config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let projectId = 'gen-lang-client-0754958878';

try {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.projectId) {
      projectId = config.projectId;
    }
  }
} catch (e) {
  console.error('Failed to read firebase config for admin', e);
}

// Initialize without credentials, it can still verify ID tokens
if (getApps().length === 0) {
  initializeApp({
    projectId: projectId
  });
}

export const adminAuth = getAuth();

