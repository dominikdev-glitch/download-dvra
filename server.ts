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

// Helper to sanitize and normalize RSA Private Key strings from various ENV formats
function cleanPrivateKey(key: string): string {
  if (!key) return '';
  let cleaned = key.trim();
  
  // Remove wrapping quotes if present (e.g. '"-----BEGIN ..."' or "'-----BEGIN ...'")
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  // Replace literal escaped \n with real newlines
  cleaned = cleaned.replace(/\\n/g, '\n');

  // If newlines were lost into single-line format
  if (!cleaned.includes('\n') && cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
    cleaned = cleaned
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }

  return cleaned;
}

// Resolve Firebase Admin Service Account safely from Environment Variables
function getEnvironmentServiceAccount(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  // 1. Check full JSON string in FIREBASE_SERVICE_ACCOUNT / firebase_service_account / SERVICE_ACCOUNT
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.firebase_service_account ||
    process.env.SERVICE_ACCOUNT ||
    process.env.service_account;

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      const projId = parsed.project_id || parsed.projectId;
      const privKey = parsed.private_key || parsed.privateKey;
      const cEmail = parsed.client_email || parsed.clientEmail;

      if (projId && privKey && cEmail) {
        return {
          projectId: projId.trim(),
          clientEmail: cEmail.trim(),
          privateKey: cleanPrivateKey(privKey),
        };
      }
    } catch (e: any) {
      console.warn('[Firebase Admin] Could not parse service account JSON:', e.message);
    }
  }

  // 2. Check individual environment variables (accepts both UPPERCASE and lowercase from JSON like private_key, client_email, project_id)
  const envProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.PROJECT_ID ||
    process.env.project_id ||
    process.env.projectId;

  const envClientEmail =
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL ||
    process.env.client_email ||
    process.env.clientEmail;

  const envPrivateKey =
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    process.env.private_key ||
    process.env.privateKey;

  if (envProjectId && envPrivateKey && envClientEmail) {
    return {
      projectId: envProjectId.trim(),
      clientEmail: envClientEmail.trim(),
      privateKey: cleanPrivateKey(envPrivateKey),
    };
  }

  // 3. Check for local serviceAccountKey.json if present
  try {
    const localKeyPath = path.join(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(localKeyPath)) {
      const fileData = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      const projId = fileData.project_id || fileData.projectId;
      const privKey = fileData.private_key || fileData.privateKey;
      const cEmail = fileData.client_email || fileData.clientEmail;
      if (projId && privKey && cEmail) {
        return {
          projectId: projId.trim(),
          clientEmail: cEmail.trim(),
          privateKey: cleanPrivateKey(privKey),
        };
      }
    }
  } catch {
    // Ignore if file doesn't exist
  }

  return null;
}

function initDefaultFirebase() {
  try {
    const svc = getEnvironmentServiceAccount();
    if (!activeApp && svc) {
      activeApp = initializeApp({
        credential: cert({
          projectId: svc.projectId,
          privateKey: svc.privateKey,
          clientEmail: svc.clientEmail,
        }),
      }, 'default-firebase-app');
      activeFirestore = getFirestore(activeApp);
      activeProjectInfo = {
        projectId: svc.projectId,
        clientEmail: svc.clientEmail,
        connectedAt: new Date().toISOString(),
      };
      console.log(`[Firebase Admin] Successfully initialized Firestore connection for project: ${svc.projectId}`);
    } else {
      console.log('[Firebase Admin] No environment service account configured. Ready for connect via Admin UI or ENV.');
    }
  } catch (err: any) {
    console.error('[Firebase Admin] Startup initialization notice:', err.message);
  }
}

// Auto-initialize from environment if provided
initDefaultFirebase();

// Admin Authentication & Rate Limiting (5 failed attempts maximum)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.admin_password || '2005';
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

  let customDownloadUrlOverride: string =
    process.env.CUSTOM_DOWNLOAD_URL ||
    process.env.custom_download_url ||
    'https://github.com/dominikdev-glitch/download-dvra/releases/download/dvra/DVRA.Setup.1.0.2.exe';

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
        customDownloadUrl: customDownloadUrlOverride || null,
      });
    } catch {
      res.json({ availableFiles: [], customDownloadUrl: customDownloadUrlOverride || null });
    }
  });

  // Direct download endpoint
  app.get('/api/download/:filename', (req, res) => {
    if (customDownloadUrlOverride && customDownloadUrlOverride.startsWith('http')) {
      return res.redirect(302, customDownloadUrlOverride);
    }

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

  // ==========================================
  // LIVE ADMIN CHAT & SUPPORT ENDPOINTS
  // Admin: celiwamama@gmail.com
  // ==========================================
  const ADMIN_CHAT_EMAIL =
    process.env.ADMIN_CHAT_EMAIL ||
    process.env.admin_chat_email ||
    'celiwamama@gmail.com';

  interface ChatMessageItem {
    id: string;
    sessionId: string;
    sender: 'visitor' | 'admin';
    senderName: string;
    senderEmail?: string;
    content: string;
    timestamp: string;
    read: boolean;
  }

  const chatStore: ChatMessageItem[] = [
    {
      id: 'welcome-seed',
      sessionId: 'general',
      sender: 'admin',
      senderName: 'Admin Support',
      senderEmail: ADMIN_CHAT_EMAIL,
      content: `Hello! 👋 Welcome to DVRA Suite support. You can chat live with Admin here or email directly at ${ADMIN_CHAT_EMAIL}. How can we help you?`,
      timestamp: new Date().toISOString(),
      read: true,
    },
  ];

  // Public: Get Admin Chat info
  app.get('/api/chat/config', (req, res) => {
    res.json({
      adminEmail: ADMIN_CHAT_EMAIL,
      adminName: 'Admin Support',
      status: 'online',
    });
  });

  // Public: Get messages for current visitor session
  app.get('/api/chat/messages', (req, res) => {
    const sessionId = (req.query.sessionId as string) || 'general';
    const sessionMessages = chatStore.filter(
      (m) => m.sessionId === sessionId || m.id === 'welcome-seed'
    );
    res.json({
      messages: sessionMessages,
      adminEmail: ADMIN_CHAT_EMAIL,
    });
  });

  // Public: Visitor sends a message
  app.post('/api/chat/send', (req, res) => {
    const { sessionId = 'general', visitorName = 'Visitor', visitorEmail = '', content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const newMsg: ChatMessageItem = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sessionId: sessionId.trim(),
      sender: 'visitor',
      senderName: visitorName.trim() || 'Visitor',
      senderEmail: visitorEmail.trim(),
      content: content.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    chatStore.push(newMsg);

    if (activeFirestore) {
      activeFirestore.collection('_admin_chats').add(newMsg).catch(() => {});
    }

    const sessionMessages = chatStore.filter(
      (m) => m.sessionId === sessionId || m.id === 'welcome-seed'
    );

    res.json({ success: true, message: newMsg, messages: sessionMessages });
  });

  // Protected: Admin retrieves all conversations
  app.get('/api/chat/admin/conversations', adminAuthMiddleware, (req, res) => {
    const conversationsMap = new Map<string, any>();

    for (const msg of chatStore) {
      if (msg.id === 'welcome-seed') continue;
      const sId = msg.sessionId;
      if (!conversationsMap.has(sId)) {
        conversationsMap.set(sId, {
          sessionId: sId,
          visitorName: msg.sender === 'visitor' ? msg.senderName : 'Visitor',
          visitorEmail: msg.sender === 'visitor' && msg.senderEmail ? msg.senderEmail : '',
          lastMessage: msg.content,
          lastMessageTime: msg.timestamp,
          unreadCount: msg.sender === 'visitor' && !msg.read ? 1 : 0,
          messageCount: 1,
        });
      } else {
        const conv = conversationsMap.get(sId)!;
        if (msg.sender === 'visitor') {
          if (msg.senderName) conv.visitorName = msg.senderName;
          if (msg.senderEmail) conv.visitorEmail = msg.senderEmail;
          if (!msg.read) conv.unreadCount += 1;
        }
        conv.lastMessage = msg.content;
        conv.lastMessageTime = msg.timestamp;
        conv.messageCount += 1;
      }
    }

    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    const totalUnread = chatStore.filter((m) => m.sender === 'visitor' && !m.read).length;

    res.json({
      conversations,
      adminEmail: ADMIN_CHAT_EMAIL,
      totalUnread,
    });
  });

  // Protected: Admin gets conversation messages and marks as read
  app.get('/api/chat/admin/messages', adminAuthMiddleware, (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId parameter is required' });
    }

    chatStore.forEach((m) => {
      if (m.sessionId === sessionId && m.sender === 'visitor') {
        m.read = true;
      }
    });

    const messages = chatStore.filter(
      (m) => m.sessionId === sessionId || m.id === 'welcome-seed'
    );

    res.json({ messages });
  });

  // Protected: Admin sends reply
  app.post('/api/chat/admin/reply', adminAuthMiddleware, (req, res) => {
    const { sessionId, content } = req.body;
    if (!sessionId || !content || !content.trim()) {
      return res.status(400).json({ error: 'sessionId and content are required' });
    }

    const replyMsg: ChatMessageItem = {
      id: `admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sessionId: sessionId.trim(),
      sender: 'admin',
      senderName: `Admin Support (${ADMIN_CHAT_EMAIL})`,
      senderEmail: ADMIN_CHAT_EMAIL,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      read: true,
    };

    chatStore.push(replyMsg);

    if (activeFirestore) {
      activeFirestore.collection('_admin_chats').add(replyMsg).catch(() => {});
    }

    res.json({ success: true, message: replyMsg });
  });

  // Protected: Admin clears conversation
  app.post('/api/chat/admin/clear', adminAuthMiddleware, (req, res) => {
    const { sessionId } = req.body;
    if (sessionId) {
      for (let i = chatStore.length - 1; i >= 0; i--) {
        if (chatStore[i].sessionId === sessionId && chatStore[i].id !== 'welcome-seed') {
          chatStore.splice(i, 1);
        }
      }
    }
    res.json({ success: true });
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
