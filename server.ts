import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp, cert, getApps, App, deleteApp } from 'firebase-admin/app';
import { getFirestore, Firestore, Query, DocumentReference } from 'firebase-admin/firestore';

let activeApp: App | null = null;
let activeFirestore: Firestore | null = null;
let activeProjectInfo: {
  projectId?: string;
  clientEmail?: string;
  connectedAt?: string;
} | null = null;

// Provided Firebase Admin Service Account
const DEFAULT_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "radio-app-2af91",
  private_key_id: "5aa07d9f42527ea97da2c77e35947db8ebf7bd4c",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCnu0gNOJvAUaIH\nMdeGB5uSc6Yz/wPlSiUwqec+62VOI6PlTZi7xS2ECeEUoWfy5VkaJAlXWnkT5F5b\nUN8MvtKzd/40xYOy0Uykb3wLgYcGoIKvk0aXkQlxmGAHyr1khnx5nmbTHGPGLnJo\nZUeXohVSCQturSNejDyBTPCpsJVgj2UVD1yFmUXw9SPekUFwAUWoWwg3UoQ1R8jV\n1LlqiKY6/rjaAvAiAgNnTX0tews3C496FAaTr5FERh75B2v81YhclQeYcwsYyIta\nahhKiDveSYuMs6drObMVxxcovYRjnytJ7eIkbQku3kV+9/yxjJHbA087whrGCUrP\nhkt7Ts1hAgMBAAECggEAEDupMX5ftIaHWTg9qj8Pk2ZAmO+pVNuO1d2GVSnlrWD4\nT7eUJzgMu6apHfIGZBTw6/1o2gdriGf6/yNzMtc/qmwxMgebmLF2QBkktt2w+mHh\nGVT2PrJOvlZc6jl43Zhrxj7KUiGBQSuQRFeTojKRlartFv0IBfJ/OJRVsQE3Xmza\nN1dAp+nWPpQFse4MpVc+/8BLzZJ3hM1xvgtFIuCLcjOBDQwgQW4ti52MXyMEjVZ6\nrInJQTPlreT2eFCU40Y71cdzBwJ3ZERZE+oJmwBQ1/fndTq1qJh9s3qGySr2ftmW\nVEVSYDS0hhd62CTa4NzL6RSW+3+ciC2qKEEomfzlcQKBgQDSwz8iE+hXOQ+FWkFY\n1/jCtfYnnDPMB8mm4s28g069gTWk+EKbTyJMgaSDi25SeZjt6zTlrdeAUJ0VewWF\nzAasqg5ijE02Iakj81QC9RBczrKs8WuiC7CmC56DH/DC3e9gQdY2Hwn90xUlbzzr\nlXi6f3umeAPJUmaUr7pOdvj5fwKBgQDLu5vregogDOM9hDb+5eiV0p4Z5dTywiVX\nkfUL8E6Wi96UiEM2MZk0KS5iVIa72NM6s+DHOnL9/YJvzC+KOdSnAvSA1oqIAa5W\nVSXKOCs+kmJsM/nReCZeTV1jLqtL3MG4SFy3zHy9GwuoOsuS5aEhHdZVuU5hf0dY\nn4dJCezpHwKBgEEodYsuhmT40hCTD6LM2i4wHRKv2t+YBMKgWaSPH7e8i34d9lGX\njG4Eony8jXXX++yKC8d6ECauRXIPn2x24BVfWaUj5Pb4PxdLMczcQJvAl0KaPIFT\nheA/tViqdj94Z3nlwLjorakYKfBxzG60vidCJFMZxWnnHKmZDksVwvE3AoGAAc/2\ncB7SzjwvHVH6x0O2UPbhrytLPKmbeW7z9ho6KL6vyTR5HJdOXJdtMTS9ShiAsIn/\nGuabNUU3DtWLKrie+qldEXRXISSar2vsfSMIx3K362x+8W0XMkmP5hz5KyCYnJIQ\nORZZmbkO3n0/aFwgldHVIUgXuWhPcytgIbcz41MCgYAvvRQnCb4vMz7opwFaZ+3r\nDdsSb6BrlOm9GtDaOHva+xGSGSdbL3nmnwfpqGigU9XMjYRaUjXa6n6vsf2/zZgi\n6FHRYLSFF2bWK8jtOz1zJJSmIcJNFWTdBxPbE1rGqYIPXBFiVpjrwWqe3pzqADnJ\nphN36fNGq8yCw+OqI9txQw==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@radio-app-2af91.iam.gserviceaccount.com",
  client_id: "115341548424717957993",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40radio-app-2af91.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

function initDefaultFirebase() {
  try {
    if (!activeApp && DEFAULT_SERVICE_ACCOUNT.private_key) {
      activeApp = initializeApp({
        credential: cert({
          projectId: DEFAULT_SERVICE_ACCOUNT.project_id,
          privateKey: DEFAULT_SERVICE_ACCOUNT.private_key.replace(/\\n/g, '\n'),
          clientEmail: DEFAULT_SERVICE_ACCOUNT.client_email,
        }),
      }, 'default-firebase-app');
      activeFirestore = getFirestore(activeApp);
      activeProjectInfo = {
        projectId: DEFAULT_SERVICE_ACCOUNT.project_id,
        clientEmail: DEFAULT_SERVICE_ACCOUNT.client_email,
        connectedAt: new Date().toISOString(),
      };
      console.log(`[Firebase Admin] Successfully initialized Firestore connection for project: ${DEFAULT_SERVICE_ACCOUNT.project_id}`);
    }
  } catch (err: any) {
    console.error('[Firebase Admin] Startup initialization error:', err.message);
  }
}

// Auto-initialize on server load
initDefaultFirebase();

// Admin Authentication & Rate Limiting (5 failed attempts maximum)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2005';
let adminSessionSecret = crypto.randomBytes(32).toString('hex');
let failedLoginAttempts = 0;
let lockoutUntil = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes lockout

function verifyAdmin(req: express.Request): boolean {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token === adminSessionSecret;
}

function adminAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (verifyAdmin(req)) {
    return next();
  }
  return res.status(401).json({
    error: 'Unauthorized: Admin authentication required to access database records or decryption tools.',
    code: 'ADMIN_AUTH_REQUIRED'
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // ==========================================
  // KEEP-ALIVE & CRON RUN POINTS (FOR RENDER / CRON-JOB.ORG)
  // ==========================================
  app.get('/api/cron/ping', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json({
      status: 'active',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'dvra-suite',
      message: 'Render container pinged successfully. Instance is awake.'
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'DVRA Token & Liquidity Suite',
      firebaseConnected: activeFirestore !== null,
      projectId: activeProjectInfo?.projectId || null,
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // PUBLIC SOFTWARE DOWNLOAD ROUTES
  // ==========================================
  const downloadsDir = path.join(process.cwd(), 'downloads');
  const publicDownloadsDir = path.join(process.cwd(), 'public', 'downloads');

  app.use('/downloads', express.static(downloadsDir));
  app.use('/downloads', express.static(publicDownloadsDir));

  // Check which installers exist on disk
  app.get('/api/downloads/status', (req, res) => {
    try {
      const files: string[] = [];
      if (fs.existsSync(downloadsDir)) {
        files.push(...fs.readdirSync(downloadsDir));
      }
      if (fs.existsSync(publicDownloadsDir)) {
        files.push(...fs.readdirSync(publicDownloadsDir));
      }
      res.json({
        availableFiles: Array.from(new Set(files)),
      });
    } catch {
      res.json({ availableFiles: [] });
    }
  });

  // Direct download endpoint
  app.get('/api/download/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    const safeName = path.basename(filename);
    const primaryPath = path.join(downloadsDir, safeName);
    const publicPath = path.join(publicDownloadsDir, safeName);

    if (fs.existsSync(primaryPath)) {
      return res.download(primaryPath, safeName);
    }
    if (fs.existsSync(publicPath)) {
      return res.download(publicPath, safeName);
    }

    // Fallback: If user hasn't dropped the binary into /downloads yet, generate installer stub
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(
      `# DVRA Suite Installer - ${safeName}\n` +
      `# Token Creation, Liquidity Management & Wallet Suite for TRON, BNB, ETH, SOLANA\n` +
      `# Status: Ready for installation\n`
    );
  });

  // ==========================================
  // ADMIN AUTHENTICATION ENDPOINTS
  // ==========================================
  app.post('/api/admin/login', (req, res) => {
    const now = Date.now();
    if (now < lockoutUntil) {
      const waitSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        lockedOut: true,
        error: `Too many failed login attempts. Locked out for ${waitSeconds} more seconds.`,
      });
    }

    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    if (password.trim() === ADMIN_PASSWORD) {
      failedLoginAttempts = 0;
      lockoutUntil = 0;
      return res.json({
        success: true,
        token: adminSessionSecret,
        message: 'Admin access granted.',
      });
    } else {
      failedLoginAttempts += 1;
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - failedLoginAttempts);

      if (failedLoginAttempts >= MAX_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_MS;
        failedLoginAttempts = 0; // reset for after lockout
        return res.status(429).json({
          success: false,
          lockedOut: true,
          error: 'Maximum failed trials reached (5/5). Admin access locked for 5 minutes.',
        });
      }

      return res.status(401).json({
        success: false,
        attemptsLeft,
        error: `Invalid password. ${attemptsLeft} attempts remaining.`,
      });
    }
  });

  app.post('/api/admin/verify', (req, res) => {
    const isValid = verifyAdmin(req);
    return res.json({ valid: isValid });
  });

  // ==========================================
  // PROTECTED ADMIN APIS (Requires Admin Token)
  // ==========================================

  // DVRA Decryption API Endpoint (Protected)
  app.post('/api/dvra/decrypt', adminAuthMiddleware, (req, res) => {
    try {
      const { payload, key = 'dvra-wallet-recovery-v1' } = req.body;
      if (!payload || typeof payload !== 'string') {
        return res.status(400).json({ error: 'Base64 encrypted payload string is required.' });
      }

      const cleanPayload = payload.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
      const k = crypto.createHash('sha256').update(key).digest();
      const b = Buffer.from(cleanPayload, 'base64');

      if (b.length < 32) {
        return res.status(400).json({
          error: `Payload is too short (${b.length} bytes). Must be at least 32 bytes (16 bytes IV + 16 bytes auth tag + ciphertext).`,
        });
      }

      const iv = b.subarray(0, 16);
      const tag = b.subarray(16, 32);
      const ciphertext = b.subarray(32);

      const decipher = crypto.createDecipheriv('aes-256-gcm', k, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

      return res.json({
        success: true,
        decrypted,
        algorithm: 'AES-256-GCM',
        keyUsed: key,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: `DVRA Decryption failed: ${err.message}. Check if recovery key matches and exact encrypted field was pasted.`,
      });
    }
  });

  // 2. Firebase Connection Status (Protected)
  app.get('/api/firebase/status', adminAuthMiddleware, (req, res) => {
    if (activeFirestore && activeProjectInfo) {
      res.json({
        connected: true,
        mode: 'real',
        projectId: activeProjectInfo.projectId,
        clientEmail: activeProjectInfo.clientEmail,
        connectedAt: activeProjectInfo.connectedAt,
      });
    } else {
      res.json({
        connected: false,
        mode: 'sandbox',
        message: 'No live Firebase Service Account loaded. Running in sandbox mode.',
      });
    }
  });

  // 3. Connect Service Account (Protected)
  app.post('/api/firebase/connect', adminAuthMiddleware, async (req, res) => {
    try {
      const { serviceAccountKey } = req.body;
      if (!serviceAccountKey) {
        return res.status(400).json({ error: 'serviceAccountKey payload is required.' });
      }

      let parsedKey: any;
      if (typeof serviceAccountKey === 'string') {
        try {
          parsedKey = JSON.parse(serviceAccountKey);
        } catch (e: any) {
          return res.status(400).json({ error: `Invalid JSON format: ${e.message}` });
        }
      } else {
        parsedKey = serviceAccountKey;
      }

      if (!parsedKey.project_id || !parsedKey.private_key || !parsedKey.client_email) {
        return res.status(400).json({
          error: 'Invalid Service Account Key. Missing required fields: project_id, private_key, or client_email.',
        });
      }

      // Cleanup previous app instance if any
      if (activeApp) {
        try {
          await deleteApp(activeApp);
        } catch {
          // ignore
        }
      }

      // Reformat private key if escaped newlines
      const privateKey = parsedKey.private_key.includes('\\n')
        ? parsedKey.private_key.replace(/\\n/g, '\n')
        : parsedKey.private_key;

      const appName = `app-${Date.now()}`;
      activeApp = initializeApp(
        {
          credential: cert({
            projectId: parsedKey.project_id,
            privateKey: privateKey,
            clientEmail: parsedKey.client_email,
          }),
        },
        appName
      );

      activeFirestore = getFirestore(activeApp);
      // Test firestore connection by listing collections or checking root
      try {
        const collections = await activeFirestore.listCollections();
        activeProjectInfo = {
          projectId: parsedKey.project_id,
          clientEmail: parsedKey.client_email,
          connectedAt: new Date().toISOString(),
        };

        return res.json({
          success: true,
          projectId: parsedKey.project_id,
          clientEmail: parsedKey.client_email,
          initialCollectionsCount: collections.length,
          connectedAt: activeProjectInfo.connectedAt,
        });
      } catch (testErr: any) {
        activeProjectInfo = {
          projectId: parsedKey.project_id,
          clientEmail: parsedKey.client_email,
          connectedAt: new Date().toISOString(),
        };
        return res.json({
          success: true,
          projectId: parsedKey.project_id,
          clientEmail: parsedKey.client_email,
          warning: testErr.message,
          connectedAt: activeProjectInfo.connectedAt,
        });
      }
    } catch (err: any) {
      console.error('Firebase Connect Error:', err);
      return res.status(500).json({
        error: `Failed to connect Firebase: ${err.message || 'Unknown error'}`,
      });
    }
  });

  // 4. Disconnect Service Account (Protected)
  app.post('/api/firebase/disconnect', adminAuthMiddleware, async (req, res) => {
    try {
      if (activeApp) {
        await deleteApp(activeApp);
        activeApp = null;
      }
      activeFirestore = null;
      activeProjectInfo = null;
      res.json({ success: true, message: 'Disconnected from Firebase.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. List Collections (Protected)
  app.get('/api/firebase/collections', adminAuthMiddleware, async (req, res) => {
    if (!activeFirestore) {
      return res.status(400).json({ error: 'No active Firebase connection. Please connect a Service Account.' });
    }

    try {
      const collections = await activeFirestore.listCollections();
      const result = collections.map((col) => ({
        id: col.id,
        path: col.path,
      }));
      res.json({ collections: result });
    } catch (err: any) {
      console.error('List collections error:', err);
      res.status(500).json({ error: err.message || 'Failed to list collections.' });
    }
  });

  // 6. Query/List Documents (Protected)
  app.post('/api/firebase/documents', adminAuthMiddleware, async (req, res) => {
    if (!activeFirestore) {
      return res.status(400).json({ error: 'No active Firebase connection.' });
    }

    try {
      const { collectionPath, limit = 50, orderByField, orderDirection = 'asc', filters } = req.body;
      if (!collectionPath) {
        return res.status(400).json({ error: 'collectionPath is required.' });
      }

      let query: Query = activeFirestore.collection(collectionPath);

      if (Array.isArray(filters)) {
        for (const f of filters) {
          if (f.field && f.operator && f.value !== undefined) {
            let val = f.value;
            if (f.valueType === 'number') val = Number(val);
            else if (f.valueType === 'boolean') val = val === true || val === 'true';
            query = query.where(f.field, f.operator, val);
          }
        }
      }

      if (orderByField) {
        query = query.orderBy(orderByField, orderDirection);
      }

      query = query.limit(Math.min(limit, 200));

      const snapshot = await query.get();
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        path: d.ref.path,
        data: d.data(),
        createTime: d.createTime ? d.createTime.toDate().toISOString() : undefined,
        updateTime: d.updateTime ? d.updateTime.toDate().toISOString() : undefined,
      }));

      res.json({
        documents: docs,
        total: docs.length,
        path: collectionPath,
      });
    } catch (err: any) {
      console.error('Query documents error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch documents.' });
    }
  });

  // 7. Get Single Document Details & Subcollections (Protected)
  app.get('/api/firebase/document', adminAuthMiddleware, async (req, res) => {
    if (!activeFirestore) {
      return res.status(400).json({ error: 'No active Firebase connection.' });
    }

    try {
      const docPath = req.query.path as string;
      if (!docPath) {
        return res.status(400).json({ error: 'Document path query param is required.' });
      }

      const docRef = activeFirestore.doc(docPath);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return res.status(404).json({ error: `Document not found at path: ${docPath}` });
      }

      // Check for subcollections
      let subcollections: string[] = [];
      try {
        const subcols = await docRef.listCollections();
        subcollections = subcols.map((sc) => sc.id);
      } catch {
        // ignore
      }

      res.json({
        document: {
          id: snapshot.id,
          path: docRef.path,
          data: snapshot.data() || {},
          createTime: snapshot.createTime ? snapshot.createTime.toDate().toISOString() : undefined,
          updateTime: snapshot.updateTime ? snapshot.updateTime.toDate().toISOString() : undefined,
          subcollections,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Save/Update Document (Protected)
  app.post('/api/firebase/document/save', adminAuthMiddleware, async (req, res) => {
    if (!activeFirestore) {
      return res.status(400).json({ error: 'No active Firebase connection.' });
    }

    try {
      const { collectionPath, docId, data, merge = true } = req.body;
      if (!collectionPath) {
        return res.status(400).json({ error: 'collectionPath is required.' });
      }

      let docRef: DocumentReference;
      if (docId && docId.trim()) {
        docRef = activeFirestore.collection(collectionPath).doc(docId.trim());
      } else {
        docRef = activeFirestore.collection(collectionPath).doc();
      }

      await docRef.set(data || {}, { merge });
      const savedSnap = await docRef.get();

      res.json({
        success: true,
        document: {
          id: docRef.id,
          path: docRef.path,
          data: savedSnap.data(),
          updateTime: savedSnap.updateTime?.toDate().toISOString(),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save document.' });
    }
  });

  // 9. Delete Document (Protected)
  app.post('/api/firebase/document/delete', adminAuthMiddleware, async (req, res) => {
    if (!activeFirestore) {
      return res.status(400).json({ error: 'No active Firebase connection.' });
    }

    try {
      const { path: docPath } = req.body;
      if (!docPath) {
        return res.status(400).json({ error: 'path is required.' });
      }

      const docRef = activeFirestore.doc(docPath);
      await docRef.delete();

      res.json({ success: true, deletedPath: docPath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Create Collection with First Document (Protected)
  app.post('/api/firebase/collection/create', adminAuthMiddleware, async (req, res) => {
    if (!activeFirestore) {
      return res.status(400).json({ error: 'No active Firebase connection.' });
    }

    try {
      const { collectionName, initialDocId, initialData } = req.body;
      if (!collectionName || !collectionName.trim()) {
        return res.status(400).json({ error: 'collectionName is required.' });
      }

      const colName = collectionName.trim();
      let docRef: DocumentReference;
      if (initialDocId && initialDocId.trim()) {
        docRef = activeFirestore.collection(colName).doc(initialDocId.trim());
      } else {
        docRef = activeFirestore.collection(colName).doc();
      }

      const docData = initialData || {
        _created_at: new Date().toISOString(),
        _note: 'Initial collection seed record',
      };

      await docRef.set(docData);

      res.json({
        success: true,
        collection: { id: colName, path: colName },
        initialDocumentId: docRef.id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
});
