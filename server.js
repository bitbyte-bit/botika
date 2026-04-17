import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import Database from "better-sqlite3";
import cors from "cors";
import webpush from "web-push";
import bcrypt from "bcryptjs";

const FCM_PUBLIC_KEY = "BAyyXxvXJK-U-jjy3qUpmcXrO4_QJ0gw5ODKBVbuiOrk068ix122km1FlNtxB5UPZb8062lVYYfvyA2U3Yio3Q0";
const GOOGLE_CLIENT_ID = "";
const GOOGLE_CLIENT_SECRET = "";

webpush.setVapidDetails(
  "https://botika-4y78.onrender.com",
  FCM_PUBLIC_KEY,
  "4Qi58W1Wqwh9HSV7yrOTkJ8v69erh2at63vB5PR4-1A"
);

if (process.argv.includes("production")) {
  process.env.NODE_ENV = "production";
  console.log("Running in production mode");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("bikuumba.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    displayName TEXT,
    photoURL TEXT,
    role TEXT,
    status TEXT DEFAULT 'active',
    businessName TEXT,
    businessDescription TEXT,
    password TEXT,
    createdAt TEXT,
    location TEXT,
    phoneAirtel TEXT,
    phoneMTN TEXT,
    coverPhoto TEXT,
    socialHandles TEXT
  );

  CREATE TABLE IF NOT EXISTS user_warnings (
    id TEXT PRIMARY KEY,
    userId TEXT,
    reason TEXT,
    createdAt TEXT,
    createdBy TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    price REAL,
    category TEXT,
    images TEXT,
    stock INTEGER,
    isAuthentic INTEGER,
    authenticationDetails TEXT,
    ratingAvg REAL,
    reviewCount INTEGER,
    sellerId TEXT,
    sellerName TEXT,
    createdAt TEXT,
    visitCount INTEGER,
    likeCount INTEGER,
    isApproved INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    bulkDiscountMinQty INTEGER DEFAULT 0,
    bulkDiscountPercent INTEGER DEFAULT 0,
    condition TEXT DEFAULT 'new'
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    items TEXT,
    total REAL,
    status TEXT,
    paymentId TEXT,
    trackingNumber TEXT,
    sellerIds TEXT,
    createdAt TEXT,
    rentFee REAL DEFAULT 0,
    receiverName TEXT,
    phoneMTN TEXT,
    phoneAirtel TEXT,
    pickupOption TEXT,
    deliveryAddress TEXT,
    city TEXT,
    deliveryConfirmation TEXT,
    subOrders TEXT,
    commissionPaid INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sub_orders (
    id TEXT PRIMARY KEY,
    orderId TEXT,
    sellerId TEXT,
    items TEXT,
    subtotal REAL,
    commission REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    createdAt TEXT,
    deliveredAt TEXT,
    FOREIGN KEY (orderId) REFERENCES orders(id),
    FOREIGN KEY (sellerId) REFERENCES users(uid)
  );

  CREATE TABLE IF NOT EXISTS delivery_receipts (
    id TEXT PRIMARY KEY,
    orderId TEXT,
    subOrderId TEXT,
    customerId TEXT,
    sellerId TEXT,
    confirmedAt TEXT,
    confirmedBy TEXT,
    confirmationNotes TEXT,
    photoUrls TEXT,
    FOREIGN KEY (orderId) REFERENCES orders(id),
    FOREIGN KEY (subOrderId) REFERENCES sub_orders(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT,
    senderName TEXT,
    receiverId TEXT,
    content TEXT,
    createdAt TEXT,
    type TEXT,
    read INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY,
    followerId TEXT,
    followingId TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT,
    title TEXT,
    content TEXT,
    createdAt TEXT,
    read INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    productId TEXT,
    userId TEXT,
    userName TEXT,
    rating INTEGER,
    comment TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS fcm_tokens (
    id TEXT PRIMARY KEY,
    userId TEXT,
    token TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS user_status (
    userId TEXT PRIMARY KEY,
    isOnline INTEGER DEFAULT 0,
    lastSeen TEXT
  );

  CREATE TABLE IF NOT EXISTS message_receipts (
    id TEXT PRIMARY KEY,
    messageId TEXT,
    userId TEXT,
    readAt TEXT,
    deliveredAt TEXT
  );

  CREATE TABLE IF NOT EXISTS message_attachments (
    id TEXT PRIMARY KEY,
    messageId TEXT,
    fileName TEXT,
    fileType TEXT,
    fileUrl TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS business_verification (
    id TEXT PRIMARY KEY,
    userId TEXT,
    registeredEmail TEXT,
    registeredPhone TEXT,
    ninNumber TEXT,
    nationalIdFront TEXT,
    nationalIdBack TEXT,
    passportPhoto TEXT,
    businessDocuments TEXT,
    status TEXT DEFAULT 'pending',
    submittedAt TEXT,
    reviewedAt TEXT,
    reviewedBy TEXT,
    denialReason TEXT
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    theme TEXT DEFAULT 'accent',
    fontSize TEXT DEFAULT 'text-sm',
    fontFamily TEXT,
    fontWeight TEXT,
    padding TEXT DEFAULT '8px 16px',
    borderRadius TEXT DEFAULT '0px',
    duration INTEGER DEFAULT 60,
    closable INTEGER DEFAULT 1,
    createdAt TEXT,
    expiresAt TEXT,
    status TEXT DEFAULT 'active',
    buttonText TEXT,
    buttonColor TEXT DEFAULT '#ffffff',
    buttonBgColor TEXT DEFAULT '#000000',
    buttonLink TEXT,
    buttonPadding TEXT DEFAULT '8px 16px',
    buttonRadius TEXT DEFAULT '4px'
  );

  CREATE INDEX IF NOT EXISTS idx_products_seller ON products(sellerId);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_approved ON products(isApproved);
  CREATE INDEX IF NOT EXISTS idx_products_created ON products(createdAt);
  CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId);
  CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId);
  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customerId);
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one symbol' });
    }
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }
    try {
      const uid = Math.random().toString(36).substring(2, 15);
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        uid,
        email,
        displayName,
        photoURL: "",
        role: 'customer',
        status: 'active',
        createdAt: new Date().toISOString(),
        password: hashedPassword
      };
      const stmt = db.prepare(`
        INSERT INTO users (uid, email, displayName, photoURL, role, status, createdAt, password, location, phoneAirtel, phoneMTN, coverPhoto, socialHandles)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(newUser.uid, newUser.email, newUser.displayName, newUser.photoURL, newUser.role, newUser.status, newUser.createdAt, newUser.password, null, null, null, null, null);
      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: err.message || 'Server error during signup' });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Special handling for admin credentials - always works (case-insensitive email check)
    if (email.toLowerCase() === 'bikuumba@gmail.com' && password === 'bikuumba') {
      let adminUser = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get('bikuumba@gmail.com');
      
      // If no admin user exists, create one
      if (!adminUser) {
        const stmt = db.prepare(`
          INSERT INTO users (uid, email, displayName, photoURL, role, status, createdAt, password)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run('admin-' + Date.now(), 'bikuumba@gmail.com', 'Bikuumba Admin', '', 'admin', 'active', new Date().toISOString(), 'bikuumba');
        adminUser = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get('bikuumba@gmail.com');
      } else {
        // Ensure admin user is active and has admin role
        if (adminUser.status !== 'active' || adminUser.role !== 'admin') {
          db.prepare("UPDATE users SET status = 'active', role = 'admin' WHERE LOWER(email) = ?").run('bikuumba@gmail.com');
          adminUser = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get('bikuumba@gmail.com');
        }
      }
      
      const { password: _, ...userWithoutPassword } = adminUser;
      return res.json(userWithoutPassword);
    }
    
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (user.status === 'banned') {
        return res.status(403).json({ error: "Your account has been banned" });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ error: "Your account is currently suspended" });
      }
      let validPassword = false;
      if (user.password && user.password.startsWith('$2')) {
        validPassword = await bcrypt.compare(password, user.password);
      } else {
        validPassword = password === user.password;
      }
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error during login' });
    }
  });

  app.get("/api/users/:uid", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(req.params.uid);
    res.json(user || null);
  });

  app.post("/api/users", (req, res) => {
    const { uid, email, displayName, photoURL, role, status, businessName, businessDescription, password, createdAt, location, phoneAirtel, phoneMTN, coverPhoto, socialHandles } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and email are required' });
    }
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (uid, email, displayName, photoURL, role, status, businessName, businessDescription, password, createdAt, location, phoneAirtel, phoneMTN, coverPhoto, socialHandles)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      stmt.run(uid, email, displayName || null, photoURL || null, role || 'customer', status || 'active', businessName || null, businessDescription || null, password || null, createdAt || new Date().toISOString(), location || null, phoneAirtel || null, phoneMTN || null, coverPhoto || null, socialHandles ? JSON.stringify(socialHandles) : null);
      res.json({ success: true });
    } catch (err) {
      console.error('User insert error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users", (req, res) => {
    const { limit, offset, all } = req.query;
    let limitNum;
    if (all === 'true') {
      limitNum = 10000;
    } else {
      limitNum = Math.min(Number(limit) || 50, 100);
    }
    const offsetNum = Number(offset) || 0;
    const users = db.prepare(`
      SELECT u.*, s.lastSeen as lastSeen, s.isOnline 
      FROM users u 
      LEFT JOIN user_status s ON u.uid = s.userId 
      LIMIT ? OFFSET ?
    `).all(limitNum, offsetNum);
    res.json(users);
  });

  app.get("/api/users/all", (req, res) => {
    const users = db.prepare(`
      SELECT u.*, s.lastSeen as lastSeen, s.isOnline 
      FROM users u 
      LEFT JOIN user_status s ON u.uid = s.userId
    `).all();
    res.json(users);
  });

  app.get("/api/users/:uid/warnings", (req, res) => {
    const warnings = db.prepare("SELECT * FROM user_warnings WHERE userId = ? ORDER BY createdAt DESC").all(req.params.uid);
    res.json(warnings);
  });

  app.post("/api/users/:uid/suspend", (req, res) => {
    const targetUserId = req.params.uid;
    const adminUserId = req.body.adminUserId;
    
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized: adminUserId required' });
    }
    
    const adminUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(adminUserId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'master')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    const targetUser = db.prepare("SELECT role, status FROM users WHERE uid = ?").get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (targetUser.role === 'admin' || targetUser.role === 'master') {
      return res.status(400).json({ error: 'Cannot suspend admin users' });
    }
    
    db.prepare("UPDATE users SET status = 'suspended' WHERE uid = ?").run(targetUserId);
    res.json({ success: true, message: 'User suspended' });
  });

  app.post("/api/users/:uid/activate", (req, res) => {
    const targetUserId = req.params.uid;
    const adminUserId = req.body.adminUserId;
    
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized: adminUserId required' });
    }
    
    const adminUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(adminUserId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'master')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    const targetUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    db.prepare("UPDATE users SET status = 'active' WHERE uid = ?").run(targetUserId);
    res.json({ success: true, message: 'User activated' });
  });

  app.post("/api/users/:uid/ban", (req, res) => {
    const targetUserId = req.params.uid;
    const adminUserId = req.body.adminUserId;
    
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized: adminUserId required' });
    }
    
    const adminUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(adminUserId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'master')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    const targetUser = db.prepare("SELECT role, status FROM users WHERE uid = ?").get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (targetUser.role === 'admin' || targetUser.role === 'master') {
      return res.status(400).json({ error: 'Cannot ban admin users' });
    }
    
    db.prepare("UPDATE users SET status = 'banned' WHERE uid = ?").run(targetUserId);
    res.json({ success: true, message: 'User banned' });
  });

  app.post("/api/users/:uid/warn", (req, res) => {
    const targetUserId = req.params.uid;
    const { reason, adminUserId } = req.body;
    
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized: adminUserId required' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Warning reason is required' });
    }
    
    const adminUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(adminUserId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'master')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    const targetUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (targetUser.role === 'admin' || targetUser.role === 'master') {
      return res.status(400).json({ error: 'Cannot warn admin users' });
    }
    
    const warningId = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO user_warnings (id, userId, reason, createdAt, createdBy)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(warningId, targetUserId, reason, new Date().toISOString(), adminUserId);
    res.json({ success: true, message: 'Warning issued' });
  });

  app.delete("/api/users/:uid", (req, res) => {
    const targetUserId = req.params.uid;
    const adminUserId = req.query.adminUserId;
    
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized: adminUserId required' });
    }
    
    const adminUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(adminUserId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'master')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    const targetUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (targetUser.role === 'admin' || targetUser.role === 'master') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }
    
    db.prepare("DELETE FROM messages WHERE senderId = ? OR receiverId = ?").run(targetUserId, targetUserId);
    db.prepare("DELETE FROM products WHERE sellerId = ?").run(targetUserId);
    db.prepare("DELETE FROM orders WHERE customerId = ?").run(targetUserId);
    db.prepare("DELETE FROM user_warnings WHERE userId = ?").run(targetUserId);
    db.prepare("DELETE FROM user_status WHERE userId = ?").run(targetUserId);
    db.prepare("DELETE FROM fcm_tokens WHERE userId = ?").run(targetUserId);
    db.prepare("DELETE FROM notifications WHERE userId = ?").run(targetUserId);
    db.prepare("DELETE FROM follows WHERE followerId = ? OR followingId = ?").run(targetUserId, targetUserId);
    db.prepare("DELETE FROM users WHERE uid = ?").run(targetUserId);
    res.json({ success: true, message: 'User deleted' });
  });

  app.post("/api/business/verify", (req, res) => {
    const { id, userId, registeredEmail, registeredPhone, ninNumber, nationalIdFront, nationalIdBack, passportPhoto, businessDocuments } = req.body;
    const existing = db.prepare("SELECT * FROM business_verification WHERE userId = ?").get(userId);
    if (existing) {
      db.prepare(`
        UPDATE business_verification SET registeredEmail = ?, registeredPhone = ?, ninNumber = ?, nationalIdFront = ?, nationalIdBack = ?, passportPhoto = ?, businessDocuments = ?, status = 'pending', submittedAt = ?
        WHERE userId = ?
      `).run(registeredEmail, registeredPhone, ninNumber, nationalIdFront, nationalIdBack, passportPhoto, businessDocuments, new Date().toISOString(), userId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO business_verification (id, userId, registeredEmail, registeredPhone, ninNumber, nationalIdFront, nationalIdBack, passportPhoto, businessDocuments, status, submittedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `);
      stmt.run(id, userId, registeredEmail, registeredPhone, ninNumber, nationalIdFront, nationalIdBack, passportPhoto, businessDocuments, new Date().toISOString());
    }
    res.json({ success: true });
  });

  app.get("/api/business/verify/:userId", (req, res) => {
    const verification = db.prepare("SELECT * FROM business_verification WHERE userId = ?").get(req.params.userId);
    res.json(verification || null);
  });

  app.get("/api/business/verify-requests", (req, res) => {
    const { status } = req.query;
    let query = "SELECT * FROM business_verification";
    const params = [];
    if (status && status !== 'all') {
      query += " WHERE status = ?";
      params.push(status);
    }
    query += " ORDER BY submittedAt DESC";
    const requests = db.prepare(query).all(...params);
    res.json(requests);
  });

  app.get("/api/business/verify-requests/all", (req, res) => {
    const requests = db.prepare("SELECT * FROM business_verification ORDER BY submittedAt DESC").all();
    res.json(requests);
  });

  // Announcement endpoints
  app.get("/api/announcements/active", (req, res) => {
    const now = new Date().toISOString();
    const announcements = db.prepare(`
      SELECT * FROM announcements 
      WHERE status = 'active' AND (expiresAt IS NULL OR expiresAt > ?)
      ORDER BY createdAt DESC
    `).all(now);
    res.json(announcements);
  });

  app.post("/api/announcements", (req, res) => {
    const { id, text, theme, fontSize, fontFamily, fontWeight, padding, borderRadius, duration, closable, buttonText, buttonColor, buttonBgColor, buttonLink, buttonPadding, buttonRadius } = req.body;
    const now = new Date().toISOString();
    const expiresAt = duration > 0 ? new Date(Date.now() + duration * 60 * 1000).toISOString() : null;
    
    db.prepare(`
      INSERT OR REPLACE INTO announcements (id, text, theme, fontSize, fontFamily, fontWeight, padding, borderRadius, duration, closable, createdAt, expiresAt, status, buttonText, buttonColor, buttonBgColor, buttonLink, buttonPadding, buttonRadius)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
    `).run(id, text, theme || 'accent', fontSize || 'text-sm', fontFamily || null, fontWeight || null, padding || '8px 16px', borderRadius || '0px', duration || 60, closable ? 1 : 0, now, expiresAt, buttonText || null, buttonColor || '#ffffff', buttonBgColor || '#000000', buttonLink || null, buttonPadding || '8px 16px', buttonRadius || '4px');
    
    res.json({ success: true });
  });

  app.patch("/api/announcements/:id", (req, res) => {
    const { text, theme, fontSize, padding, borderRadius, duration, closable, status } = req.body;
    const updates = [];
    const params = [];
    
    if (text !== undefined) { updates.push('text = ?'); params.push(text); }
    if (theme !== undefined) { updates.push('theme = ?'); params.push(theme); }
    if (fontSize !== undefined) { updates.push('fontSize = ?'); params.push(fontSize); }
    if (fontFamily !== undefined) { updates.push('fontFamily = ?'); params.push(fontFamily); }
    if (fontWeight !== undefined) { updates.push('fontWeight = ?'); params.push(fontWeight); }
    if (padding !== undefined) { updates.push('padding = ?'); params.push(padding); }
    if (borderRadius !== undefined) { updates.push('borderRadius = ?'); params.push(borderRadius); }
    if (duration !== undefined) {
      updates.push('duration = ?'); params.push(duration);
      if (duration > 0) {
        updates.push('expiresAt = ?'); params.push(new Date(Date.now() + duration * 60 * 1000).toISOString());
      }
    }
    if (closable !== undefined) { updates.push('closable = ?'); params.push(closable ? 1 : 0); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (buttonText !== undefined) { updates.push('buttonText = ?'); params.push(buttonText); }
    if (buttonColor !== undefined) { updates.push('buttonColor = ?'); params.push(buttonColor); }
    if (buttonBgColor !== undefined) { updates.push('buttonBgColor = ?'); params.push(buttonBgColor); }
    if (buttonLink !== undefined) { updates.push('buttonLink = ?'); params.push(buttonLink); }
    if (buttonPadding !== undefined) { updates.push('buttonPadding = ?'); params.push(buttonPadding); }
    if (buttonRadius !== undefined) { updates.push('buttonRadius = ?'); params.push(buttonRadius); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(req.params.id);
    db.prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    res.json({ success: true });
  });

  app.delete("/api/announcements/:id", (req, res) => {
    db.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/announcements", (req, res) => {
    const announcements = db.prepare("SELECT * FROM announcements ORDER BY createdAt DESC").all();
    res.json(announcements);
  });

  app.post("/api/business/approve", (req, res) => {
    const { userId, approved, reviewedBy, denialReason } = req.body;
    db.prepare(`
      UPDATE business_verification SET status = ?, reviewedAt = ?, reviewedBy = ?, denialReason = ?
      WHERE userId = ?
    `).run(approved ? 'approved' : 'denied', new Date().toISOString(), reviewedBy, denialReason || null, userId);
    
    if (approved) {
      db.prepare("UPDATE users SET role = 'seller' WHERE uid = ?").run(userId);
      db.prepare("UPDATE products SET isApproved = 1 WHERE sellerId = ?").run(userId);
    }
    
    res.json({ success: true });
  });

  app.get("/api/products", (req, res) => {
    const { includeUnapproved, limit, offset, all } = req.query;
    let limitNum;
    if (all === 'true') {
      limitNum = 10000;
    } else {
      limitNum = Math.min(Number(limit) || 50, 100);
    }
    const offsetNum = Number(offset) || 0;
    let products;
    if (includeUnapproved === 'true') {
      products = db.prepare("SELECT * FROM products ORDER BY createdAt DESC LIMIT ? OFFSET ?").all(limitNum, offsetNum);
    } else {
      products = db.prepare(`
        SELECT p.* FROM products p
        WHERE p.isApproved = 1
        ORDER BY p.createdAt DESC
        LIMIT ? OFFSET ?
      `).all(limitNum, offsetNum);
    }
    res.json(products.map((p) => {
      try {
        const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        return { ...p, images: Array.isArray(images) ? images : [] };
      } catch (e) {
        return { ...p, images: [] };
      }
    }));
  });

  app.get("/api/products/all", (req, res) => {
    const products = db.prepare("SELECT * FROM products ORDER BY createdAt DESC").all();
    res.json(products.map((p) => {
      try {
        const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        return { ...p, images: Array.isArray(images) ? images : [] };
      } catch (e) {
        return { ...p, images: [] };
      }
    }));
  });

  app.get("/api/products/pending", (req, res) => {
    const { limit, offset } = req.query;
    const limitNum = Math.min(Number(limit) || 50, 100);
    const offsetNum = Number(offset) || 0;
    const products = db.prepare("SELECT * FROM products WHERE isApproved = 0 ORDER BY createdAt DESC LIMIT ? OFFSET ?").all(limitNum, offsetNum);
    res.json(products.map((p) => ({ ...p, images: JSON.parse(p.images) })));
  });

  app.get('/api/categories', (req, res) => {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE isApproved = 1 AND category IS NOT NULL AND category != ? ORDER BY category').all('');
    res.json(categories.map((c) => c.category).filter(Boolean));
  });

  app.get('/api/best-sellers', (req, res) => {
    const { limit } = req.query;
    const limitNum = Math.min(Number(limit) || 20, 50);
    const products = db.prepare(`
      SELECT p.*, u.businessName as sellerName, u.photoURL as sellerPhoto,
        (SELECT COUNT(*) FROM reviews r WHERE r.productId = p.id) as reviewCount
      FROM products p
      JOIN users u ON p.sellerId = u.uid
      WHERE p.isApproved = 1
      ORDER BY (COALESCE(p.reviewCount, 0) * 2 + COALESCE(p.likeCount, 0) + COALESCE(p.visitCount, 0)) DESC
      LIMIT ?
    `).all(limitNum);
    res.json(products.map((p) => {
      try {
        const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        return { ...p, images: Array.isArray(images) ? images : [] };
      } catch (e) {
        return { ...p, images: [] };
      }
    }));
  });

  app.get('/api/products/search', (req, res) => {
    const { q, category, minPrice, maxPrice, condition, sortBy, limit, offset } = req.query;
    let query = 'SELECT p.*, u.displayName as sellerName, u.photoURL as sellerPhoto, u.businessName as sellerBusinessName FROM products p JOIN users u ON p.sellerId = u.uid WHERE p.isApproved = 1';
    const params = [];
    
    if (q) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category && category !== 'all') {
      query += ' AND p.category = ?';
      params.push(category);
    }
    if (minPrice) {
      query += ' AND p.price >= ?';
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      query += ' AND p.price <= ?';
      params.push(Number(maxPrice));
    }
    if (condition && condition !== 'all') {
      query += ' AND p.condition = ?';
      params.push(condition);
    }
    
    const sortColumn = (sortBy === 'price_asc' ? 'p.price ASC' : 
                       sortBy === 'price_desc' ? 'p.price DESC' : 
                       sortBy === 'newest' ? 'p.createdAt DESC' : 
                       sortBy === 'popular' ? '(COALESCE(p.likeCount, 0) + COALESCE(p.visitCount, 0)) DESC' :
                       'p.createdAt DESC');
    query += ` ORDER BY ${sortColumn}`;
    
    const limitNum = Math.min(Number(limit) || 50, 100);
    const offsetNum = Number(offset) || 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);
    
    const products = db.prepare(query).all(...params);
    res.json(products.map((p) => {
      try {
        const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        return { ...p, images: Array.isArray(images) ? images : [] };
      } catch (e) {
        return { ...p, images: [] };
      }
    }));
  });

  app.post("/api/products", (req, res) => {
    const { id, name, description, price, category, images, stock, isAuthentic, authenticationDetails, ratingAvg, reviewCount, sellerId, sellerName, createdAt, visitCount, likeCount, isApproved, condition, discount, bulkDiscountMinQty, bulkDiscountPercent } = req.body;
    
    // Check if seller is verified (role = 'seller') and auto-approve their products
    const seller = db.prepare("SELECT role FROM users WHERE uid = ?").get(sellerId);
    const autoApproved = (seller?.role === 'seller') ? 1 : (isApproved ?? 0);
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO products (id, name, description, price, category, images, stock, isAuthentic, authenticationDetails, ratingAvg, reviewCount, sellerId, sellerName, createdAt, visitCount, likeCount, isApproved, condition, discount, bulkDiscountMinQty, bulkDiscountPercent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, description, price, category, JSON.stringify(images), stock, isAuthentic ? 1 : 0, authenticationDetails, ratingAvg, reviewCount, sellerId, sellerName, createdAt, visitCount, likeCount, autoApproved, condition || 'new', discount || 0, bulkDiscountMinQty || 0, bulkDiscountPercent || 0);
    res.json({ success: true });
  });

  app.patch("/api/products/:id/approve", (req, res) => {
    const { approved } = req.body;
    db.prepare("UPDATE products SET isApproved = ? WHERE id = ?").run(approved ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/analytics/seller/:sellerId', (req, res) => {
    const sellerId = req.params.sellerId;
    
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE sellerId = ? AND isApproved = 1").get(sellerId);
    const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE sellerIds LIKE ?", `%${sellerId}%`).get(sellerId);
    
    const totalRevenue = db.prepare(`
      SELECT SUM(total) as revenue FROM orders 
      WHERE sellerIds LIKE ? AND status = 'delivered'
    `%`%${sellerId}%`).get();
    
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE sellerIds LIKE ? AND (status = 'pending' OR status = 'processing')
    `%`%${sellerId}%`).get();
    
    const topProducts = db.prepare(`
      SELECT name, price, likeCount, visitCount, reviewCount 
      FROM products 
      WHERE sellerId = ? AND isApproved = 1 
      ORDER BY (COALESCE(likeCount, 0) + COALESCE(visitCount, 0)) DESC 
      LIMIT 5
    `).all(sellerId);
    
    const recentOrders = db.prepare(`
      SELECT o.*, u.displayName as customerName, u.photoURL as customerPhoto
      FROM orders o
      JOIN users u ON o.customerId = u.uid
      WHERE o.sellerIds LIKE ?
      ORDER BY o.createdAt DESC
      LIMIT 10
    `%`%${sellerId}%`).all();
    
    const monthlySales = db.prepare(`
      SELECT 
        strftime('%Y-%m', createdAt) as month,
        COUNT(*) as orderCount,
        SUM(total) as revenue
      FROM orders
      WHERE sellerIds LIKE ? AND status = 'delivered' AND createdAt >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', createdAt)
      ORDER BY month ASC
    `%`%${sellerId}%`).all();
    
    res.json({
      totalProducts: totalProducts?.count || 0,
      totalOrders: totalOrders?.count || 0,
      totalRevenue: totalRevenue?.revenue || 0,
      pendingOrders: pendingOrders?.count || 0,
      topProducts,
      recentOrders: recentOrders.map(o => ({...o, items: JSON.parse(o.items || '[]')})),
      monthlySales
    });
  });

  app.delete("/api/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/products", (req, res) => {
    db.prepare("DELETE FROM products").run();
    res.json({ success: true, message: 'All products deleted' });
  });

  app.get("/api/orders", (req, res) => {
    const { limit, offset, all } = req.query;
    let limitNum;
if (all === 'true') {
      limitNum = 10000;
    } else {
      limitNum = Math.min(parseInt(limit) || 50, 100);
    }
    const offsetNum = parseInt(offset) || 0;
    const orders = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC LIMIT ? OFFSET ?").all(limitNum, offsetNum);
    res.json(orders.map((o) => ({ 
      ...o, 
      items: JSON.parse(o.items || '[]'),
      sellerIds: JSON.parse(o.sellerIds || '[]'),
      deliveryConfirmation: o.deliveryConfirmation ? JSON.parse(o.deliveryConfirmation) : undefined
    })));
  });

  app.post("/api/orders", (req, res) => {
    const { id, customerId, items, total, status, paymentId, trackingNumber, sellerIds, createdAt, rentFee, receiverName, phoneMTN, phoneAirtel, pickupOption, deliveryAddress, city, deliveryConfirmation, subOrders } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO orders (id, customerId, items, total, status, paymentId, trackingNumber, sellerIds, createdAt, rentFee, receiverName, phoneMTN, phoneAirtel, pickupOption, deliveryAddress, city, deliveryConfirmation, subOrders, commissionPaid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, customerId, JSON.stringify(items), total, status || 'pending', paymentId, trackingNumber, JSON.stringify(sellerIds), createdAt, rentFee || 0, receiverName, phoneMTN, phoneAirtel, pickupOption, deliveryAddress, city, deliveryConfirmation ? JSON.stringify(deliveryConfirmation) : null, JSON.stringify(subOrders || []), 0);
    
    // Create sub-orders for each seller
    if (subOrders && subOrders.length > 0) {
      for (const sub of subOrders) {
        const commission = sub.subtotal * 0.03; // 3% commission
        db.prepare(`
          INSERT INTO sub_orders (id, orderId, sellerId, items, subtotal, commission, status, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(sub.id, id, sub.sellerId, JSON.stringify(sub.items), sub.subtotal, commission, 'pending', createdAt);
      }
    }
    
    res.json({ success: true });
  });

  app.get("/api/orders/:id/sub-orders", (req, res) => {
    const subOrders = db.prepare("SELECT * FROM sub_orders WHERE orderId = ?").all(req.params.id);
    res.json(subOrders.map(s => ({ ...s, items: JSON.parse(s.items || '[]') })));
  });

  app.patch("/api/sub-orders/:id/status", (req, res) => {
    const { status } = req.body;
    const now = new Date().toISOString();
    if (status === 'delivered') {
      db.prepare('UPDATE sub_orders SET status = ?, deliveredAt = ? WHERE id = ?').run(status, now, req.params.id);
    } else {
      db.prepare('UPDATE sub_orders SET status = ? WHERE id = ?').run(status, req.params.id);
    }
    res.json({ success: true });
  });

  app.post("/api/delivery-receipts", (req, res) => {
    const { id, orderId, subOrderId, customerId, sellerId, confirmedAt, confirmedBy, confirmationNotes, photoUrls } = req.body;
    db.prepare(`
      INSERT INTO delivery_receipts (id, orderId, subOrderId, customerId, sellerId, confirmedAt, confirmedBy, confirmationNotes, photoUrls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, orderId, subOrderId, customerId, sellerId, confirmedAt, confirmedBy, confirmationNotes, JSON.stringify(photoUrls || []));
    res.json({ success: true });
  });

  app.get("/api/orders/:id/receipt", (req, res) => {
    const receipts = db.prepare("SELECT * FROM delivery_receipts WHERE orderId = ?").all(req.params.id);
    res.json(receipts.map(r => ({ ...r, photoUrls: JSON.parse(r.photoUrls || '[]') })));
  });

  app.get("/api/orders/:id/receipt/download", (req, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
    const subOrders = db.prepare("SELECT * FROM sub_orders WHERE orderId = ?").all(req.params.id);
    const receipts = db.prepare("SELECT * FROM delivery_receipts WHERE orderId = ?").all(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Delivery Receipt - Order #${order.id.slice(-8).toUpperCase()}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section h3 { border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .signature { display: flex; justify-content: space-between; margin-top: 60px; }
    .signature-line { text-align: center; width: 45%; }
    .signature-line p { border-top: 1px solid #333; padding-top: 10px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Delivery Confirmation Receipt</h1>
    <p>Order #${order.id.slice(-8).toUpperCase()}</p>
    <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
  </div>
  
  <div class="section">
    <h3>Customer Information</h3>
    <p><strong>Name:</strong> ${order.receiverName || 'N/A'}</p>
    <p><strong>Phone:</strong> ${order.phoneMTN || order.phoneAirtel || 'N/A'}</p>
    <p><strong>Delivery Address:</strong> ${order.deliveryAddress || order.pickupOption || 'N/A'}</p>
  </div>
  
  <div class="section">
    <h3>Items</h3>
    ${(JSON.parse(order.items || '[]')).map(item => `
      <div class="item">
        <span>${item.name} x ${item.quantity}</span>
        <span>UGX ${item.price?.toLocaleString()}</span>
      </div>
    `).join('')}
    <div class="item total">
      <span>Total Paid</span>
      <span>UGX ${order.total?.toLocaleString()}</span>
    </div>
  </div>
  
  <div class="section">
    <h3>Commission</h3>
    <p>3% platform commission has been deducted from each sub-order.</p>
    ${subOrders.map(sub => `
      <div class="item">
        <span>Seller: ${sub.sellerId}</span>
        <span>UGX ${sub.commission?.toLocaleString()}</span>
      </div>
    `).join('')}
  </div>
  
  ${receipts.length > 0 ? `
  <div class="section">
    <h3>Delivery Confirmation</h3>
    ${receipts.map(r => `
      <p><strong>Confirmed by:</strong> ${r.confirmedBy}</p>
      <p><strong>Date:</strong> ${new Date(r.confirmedAt).toLocaleString()}</p>
      <p><strong>Notes:</strong> ${r.confirmationNotes || 'None'}</p>
    `).join('')}
  </div>
  ` : ''}
  
  <div class="footer">
    <p>This is an official receipt confirming the delivery of order items.</p>
    <p>Generated on: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
    
    res.send(receiptHtml);
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  app.patch('/api/orders/:id/delivery-confirmation', (req, res) => {
    const { deliveryConfirmation } = req.body;
    const existing = db.prepare('SELECT deliveryConfirmation FROM orders WHERE id = ?').get(req.params.id);
    const existingConfirmation = existing?.deliveryConfirmation ? JSON.parse(existing.deliveryConfirmation) : {};
    const updatedConfirmation = { ...existingConfirmation, ...deliveryConfirmation };
    db.prepare('UPDATE orders SET deliveryConfirmation = ? WHERE id = ?').run(JSON.stringify(updatedConfirmation), req.params.id);
    res.json({ success: true });
  });

  app.get("/api/messages/:userId", (req, res) => {
    const requestingUserId = req.query.currentUserId;
    const targetUserId = req.params.userId;
    
    if (!requestingUserId) {
      return res.status(401).json({ error: 'Unauthorized: currentUserId required' });
    }
    
    if (requestingUserId !== targetUserId) {
      const requestingUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(requestingUserId);
      if (!requestingUser || (requestingUser.role !== 'admin' && requestingUser.role !== 'master')) {
        return res.status(403).json({ error: 'Forbidden: You can only view your own messages' });
      }
    }
    
    const messages = db.prepare("SELECT * FROM messages WHERE receiverId = ? OR senderId = ? ORDER BY createdAt DESC").all(req.params.userId, req.params.userId);
    
    const decryptedMessages = messages.map(m => {
      const key = Buffer.from([requestingUserId, m.senderId === requestingUserId ? m.receiverId : m.senderId].sort().join('-')).toString('base64').substring(0, 32);
      try {
        const decoded = Buffer.from(m.content, 'base64').toString();
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
          result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return { ...m, read: !!m.read, content: Buffer.from(result, 'base64').toString('utf8'), isEncrypted: false };
      } catch {
        return { ...m, read: !!m.read };
      }
    });
    
    res.json(decryptedMessages);
  });

  app.get("/api/conversations/:userId", (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: userId required' });
    }
    
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE receiverId = ? OR senderId = ?
      ORDER BY createdAt DESC
    `).all(userId, userId);
    
    const decryptMsg = (content, otherUserId) => {
      try {
        const key = Buffer.from([userId, otherUserId].sort().join('-')).toString('base64').substring(0, 32);
        const decoded = Buffer.from(content, 'base64').toString();
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
          result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return Buffer.from(result, 'base64').toString('utf8');
      } catch {
        return content;
      }
    };
    
    const conversations = [];
    const seenIds = new Set();
    
    for (const msg of messages) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!seenIds.has(otherUserId)) {
        seenIds.add(otherUserId);
        const otherUser = db.prepare("SELECT uid, displayName, photoURL FROM users WHERE uid = ?").get(otherUserId);
        const unreadResult = db.prepare("SELECT COUNT(*) as count FROM messages WHERE senderId = ? AND receiverId = ? AND read = 0").get(otherUserId, userId);
        
        const lastMessage = { ...msg };
        lastMessage.content = decryptMsg(msg.content, otherUserId);
        
        conversations.push({
          participantId: otherUserId,
          participantName: otherUser?.displayName || 'Unknown',
          participantPhoto: otherUser?.photoURL || '',
          lastMessage,
          unreadCount: unreadResult?.count || 0
        });
      }
    }
    
    res.json(conversations);
  });

  app.post("/api/messages", async (req, res) => {
    const { id, senderId, senderName, receiverId, content, createdAt, type, read, currentUserId } = req.body;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized: currentUserId required' });
    }
    
    if (currentUserId !== senderId) {
      return res.status(403).json({ error: 'Forbidden: You can only send messages as yourself' });
    }
    
    const senderUser = db.prepare("SELECT status FROM users WHERE uid = ?").get(senderId);
    if (senderUser && senderUser.status === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned' });
    }
    if (senderUser && senderUser.status === 'suspended') {
      return res.status(403).json({ error: 'Your account is suspended' });
    }
    
    const receiverUser = db.prepare("SELECT status FROM users WHERE uid = ?").get(receiverId);
    if (receiverUser && receiverUser.status === 'banned') {
      return res.status(400).json({ error: 'Cannot send message to banned user' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO messages (id, senderId, senderName, receiverId, content, createdAt, type, read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, senderId, senderName, receiverId, content, createdAt, type, read ? 1 : 0);
    
    // Send push notification to receiver
    const tokenEntry = db.prepare("SELECT * FROM fcm_tokens WHERE userId = ?").get(receiverId);
    if (tokenEntry) {
      let messagePreview = content;
      if (type === 'image') {
        messagePreview = 'Sent an image';
      } else if (type === 'file') {
        messagePreview = 'Sent a file';
      } else {
        messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
      }
      
      const notificationTitle = `New message from ${senderName}`;
      const notificationBody = messagePreview;
      
      try {
        await webpush.sendNotification(
          JSON.parse(tokenEntry.token),
          JSON.stringify({
            title: notificationTitle,
            body: notificationBody,
            data: { type: 'message', senderId, messageId: id }
          })
        );
      } catch (error) {
        console.error("Push notification error:", error.message);
        if (error.statusCode === 410) {
          db.prepare("DELETE FROM fcm_tokens WHERE userId = ?").run(receiverId);
        }
      }
    }
    
    res.json({ success: true });
  });

  app.patch("/api/messages/:id/read", (req, res) => {
    const currentUserId = req.body.currentUserId;
    const messageId = req.params.id;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized: currentUserId required' });
    }
    
    const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.receiverId !== currentUserId && message.senderId !== currentUserId) {
      const currentUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(currentUserId);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'master')) {
        return res.status(403).json({ error: 'Forbidden: You can only update your own messages' });
      }
    }
    
    db.prepare("UPDATE messages SET read = 1 WHERE id = ?").run(messageId);
    res.json({ success: true });
  });

  app.delete("/api/messages/:id", (req, res) => {
    const currentUserId = req.query.currentUserId;
    const messageId = req.params.id;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized: currentUserId required' });
    }
    
    const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.senderId !== currentUserId && message.receiverId !== currentUserId) {
      const currentUser = db.prepare("SELECT role FROM users WHERE uid = ?").get(currentUserId);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'master')) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own messages' });
      }
    }
    
    db.prepare("DELETE FROM messages WHERE id = ?").run(messageId);
    res.json({ success: true });
  });

  app.get("/api/messages/conversation/:userId1/:userId2", (req, res) => {
    const { userId1, userId2 } = req.params;
    const requestingUserId = req.query.currentUserId;
    
    if (!requestingUserId) {
      return res.status(401).json({ error: 'Unauthorized: currentUserId required' });
    }
    
    if (requestingUserId !== userId1 && requestingUserId !== userId2) {
      return res.status(403).json({ error: 'Forbidden: You can only view your own conversations' });
    }
    
    const key = Buffer.from([userId1, userId2].sort().join('-')).toString('base64').substring(0, 32);
    
    const encryptMsg = (msg) => {
      try {
        const encoded = Buffer.from(msg).toString('base64');
        let result = '';
        for (let i = 0; i < encoded.length; i++) {
          result += String.fromCharCode(encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return Buffer.from(result).toString('base64');
      } catch {
        return msg;
      }
    };
    
    const decryptMsg = (encrypted) => {
      try {
        const decoded = Buffer.from(encrypted, 'base64').toString();
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
          result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return Buffer.from(result, 'base64').toString('utf8');
      } catch {
        return encrypted;
      }
    };
    
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
      ORDER BY createdAt ASC
    `).all(userId1, userId2, userId2, userId1);
    
    const decryptedMessages = messages.map(m => {
      const decryptedContent = decryptMsg(m.content);
      return { 
        ...m, 
        read: !!m.read,
        content: decryptedContent,
        isEncrypted: false
      };
    });
    
    res.json(decryptedMessages);
  });

  app.post("/api/messages/attachments", (req, res) => {
    const { id, messageId, fileName, fileType, fileUrl, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO message_attachments (id, messageId, fileName, fileType, fileUrl, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, messageId, fileName, fileType, fileUrl, createdAt);
    res.json({ success: true });
  });

  app.get("/api/messages/:messageId/attachments", (req, res) => {
    const attachments = db.prepare("SELECT * FROM message_attachments WHERE messageId = ?").all(req.params.messageId);
    res.json(attachments);
  });

  app.post("/api/messages/receipts", (req, res) => {
    const { id, messageId, userId, readAt, deliveredAt } = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO message_receipts (id, messageId, userId, readAt, deliveredAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, messageId, userId, readAt, deliveredAt);
    res.json({ success: true });
  });

  app.get("/api/messages/:messageId/receipts", (req, res) => {
    const receipts = db.prepare("SELECT * FROM message_receipts WHERE messageId = ?").all(req.params.messageId);
    res.json(receipts);
  });

  app.post("/api/users/status", (req, res) => {
    const { userId, isOnline } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO user_status (userId, isOnline, lastSeen)
      VALUES (?, ?, ?)
    `).run(userId, isOnline ? 1 : 0, new Date().toISOString());
    res.json({ success: true });
  });

  app.get("/api/users/status/:userId", (req, res) => {
    const status = db.prepare("SELECT * FROM user_status WHERE userId = ?").get(req.params.userId);
    res.json(status || { isOnline: false, lastSeen: null });
  });

  app.get("/api/user/:uid", (req, res) => {
    const user = db.prepare("SELECT uid, displayName, photoURL, isOnline, lastSeen FROM users u LEFT JOIN user_status s ON u.uid = s.userId WHERE u.uid = ?").get(req.params.uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });

  app.get("/api/users/online", (req, res) => {
    const onlineUsers = db.prepare("SELECT userId FROM user_status WHERE isOnline = 1").all();
    res.json(onlineUsers.map(u => u.userId));
  });

  app.get("/api/follows/:userId", (req, res) => {
    const follows = db.prepare("SELECT * FROM follows WHERE followerId = ?").all(req.params.userId);
    res.json(follows);
  });

  app.post("/api/follows", (req, res) => {
    const { id, followerId, followingId, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO follows (id, followerId, followingId, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, followerId, followingId, createdAt);
    res.json({ success: true });
  });

  app.delete("/api/follows", (req, res) => {
    const { followerId, followingId } = req.query;
    db.prepare("DELETE FROM follows WHERE followerId = ? AND followingId = ?").run(followerId, followingId);
    res.json({ success: true });
  });

  app.get("/api/follows/all", (req, res) => {
    const follows = db.prepare("SELECT * FROM follows").all();
    res.json(follows);
  });

  app.get("/api/notifications/:userId", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC").all(req.params.userId);
    res.json(notifications.map((n) => ({ ...n, read: !!n.read })));
  });

  app.post("/api/notifications", (req, res) => {
    const { id, userId, title, content, createdAt, read } = req.body;
    const stmt = db.prepare(`
      INSERT INTO notifications (id, userId, title, content, createdAt, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, title, content, createdAt, read ? 1 : 0);
    res.json({ success: true });
  });

  app.patch("/api/notifications/:id/read", (req, res) => {
    db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/reviews/:productId", (req, res) => {
    const reviews = db.prepare("SELECT * FROM reviews WHERE productId = ? ORDER BY createdAt DESC").all(req.params.productId);
    res.json(reviews);
  });

  app.post("/api/reviews", (req, res) => {
    const { id, productId, userId, userName, rating, comment, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO reviews (id, productId, userId, userName, rating, comment, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, productId, userId, userName, rating, comment, createdAt);
    res.json({ success: true });
  });

  app.post("/api/notifications/subscribe", (req, res) => {
    const { token, userId } = req.body;
    if (!token || !userId) {
      return res.status(400).json({ error: "Token and userId required" });
    }
    const existing = db.prepare("SELECT * FROM fcm_tokens WHERE userId = ?").get(userId);
    if (existing) {
      db.prepare("UPDATE fcm_tokens SET token = ?, createdAt = ? WHERE userId = ?").run(token, new Date().toISOString(), userId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO fcm_tokens (id, userId, token, createdAt)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(crypto.randomUUID(), userId, token, new Date().toISOString());
    }
    res.json({ success: true });
  });

  app.post("/api/notifications/send", async (req, res) => {
    const { userId, title, body, data } = req.body;
    const tokenEntry = db.prepare("SELECT * FROM fcm_tokens WHERE userId = ?").get(userId);
    if (!tokenEntry) {
      console.log(`No FCM token found for user ${userId}`);
      return res.json({ success: false, error: "No token" });
    }
    try {
      await webpush.sendNotification(
        JSON.parse(tokenEntry.token),
        JSON.stringify({ title, body, data })
      );
      console.log(`Push sent to ${userId}: ${title}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Push notification error:", error.message);
      if (error.statusCode === 410) {
        db.prepare("DELETE FROM fcm_tokens WHERE userId = ?").run(userId);
      }
      res.json({ success: false, error: error.message });
    }
  });

  // Broadcast notification to all subscribed users
  app.post("/api/notifications/broadcast", async (req, res) => {
    const { title, body, data } = req.body;
    const tokens = db.prepare("SELECT * FROM fcm_tokens").all();
    
    if (tokens.length === 0) {
      return res.json({ success: false, error: "No subscribers" });
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const tokenEntry of tokens) {
      try {
        await webpush.sendNotification(
          JSON.parse(tokenEntry.token),
          JSON.stringify({ title, body, data })
        );
        successCount++;
      } catch (error) {
        failCount++;
        if (error.statusCode === 410) {
          db.prepare("DELETE FROM fcm_tokens WHERE userId = ?").run(tokenEntry.userId);
        }
      }
    }
    
    console.log(`Broadcast: ${successCount} success, ${failCount} failed`);
    res.json({ success: true, successCount, failCount });
  });

  // Send order notification
  app.post("/api/notifications/order", async (req, res) => {
    const { userId, orderId, status, amount, sellerName } = req.body;
    
    let title = '';
    let body = '';
    let notificationData = { type: 'order', orderId, status };
    
    switch (status) {
      case 'success':
        title = 'Order Placed Successfully!';
        body = `Your order #${orderId.slice(-6).toUpperCase()} for UGX ${amount?.toLocaleString()} has been confirmed.`;
        break;
      case 'processing':
        title = 'Order Being Processed';
        body = `Your order #${orderId.slice(-6).toUpperCase()} is being prepared for delivery.`;
        break;
      case 'shipped':
        title = 'Order Shipped!';
        body = `Your order #${orderId.slice(-6).toUpperCase()} is on its way!`;
        break;
      case 'delivered':
        title = 'Order Delivered';
        body = `Your order #${orderId.slice(-6).toUpperCase()} has been delivered. Please confirm receipt.`;
        break;
      case 'cancelled':
        title = 'Order Cancelled';
        body = `Your order #${orderId.slice(-6).toUpperCase()} has been cancelled.`;
        break;
      case 'failed':
        title = 'Payment Failed';
        body = `Payment for order #${orderId.slice(-6).toUpperCase()} failed. Please try again.`;
        break;
      default:
        title = 'Order Update';
        body = `Your order #${orderId.slice(-6).toUpperCase()} status: ${status}`;
    }
    
    const tokenEntry = db.prepare("SELECT * FROM fcm_tokens WHERE userId = ?").get(userId);
    if (!tokenEntry) {
      return res.json({ success: false, error: "No token" });
    }
    
    try {
      await webpush.sendNotification(
        JSON.parse(tokenEntry.token),
        JSON.stringify({ title, body, data: notificationData })
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Order notification error:", error.message);
      if (error.statusCode === 410) {
        db.prepare("DELETE FROM fcm_tokens WHERE userId = ?").run(userId);
      }
      res.json({ success: false, error: error.message });
    }
  });

  // Send notification to seller when new order
  app.post("/api/notifications/new-order", async (req, res) => {
    const { sellerId, orderId, customerName, total, itemCount } = req.body;
    
    const title = 'New Order Received!';
    const body = `${customerName} placed an order (UGX ${total?.toLocaleString()}) - ${itemCount} item(s)`;
    const notificationData = { type: 'new_order', orderId };
    
    const tokenEntry = db.prepare("SELECT * FROM fcm_tokens WHERE userId = ?").get(sellerId);
    if (!tokenEntry) {
      return res.json({ success: false, error: "No token" });
    }
    
    try {
      await webpush.sendNotification(
        JSON.parse(tokenEntry.token),
        JSON.stringify({ title, body, data: notificationData })
      );
      res.json({ success: true });
    } catch (error) {
      console.error("New order notification error:", error.message);
      if (error.statusCode === 410) {
        db.prepare("DELETE FROM fcm_tokens WHERE userId = ?").run(sellerId);
      }
      res.json({ success: false, error: error.message });
    }
  });

  // Error notification
  app.post("/api/notifications/error", async (req, res) => {
    const { userId, errorType, message, details } = req.body;
    
    let title = '';
    let body = '';
    
    switch (errorType) {
      case 'payment':
        title = 'Payment Error';
        body = message || 'There was an issue processing your payment. Please try again.';
        break;
      case 'verification':
        title = 'Verification Issue';
        body = message || 'There was an issue with your business verification.';
        break;
      case 'account':
        title = 'Account Issue';
        body = message || 'There is an issue with your account. Please contact support.';
        break;
      case 'product':
        title = 'Product Issue';
        body = message || 'There was an issue with your product listing.';
        break;
      default:
        title = 'Error';
        body = message || 'An error occurred. Please try again.';
    }
    
    const tokenEntry = db.prepare("SELECT * FROM fcm_tokens WHERE userId = ?").get(userId);
    if (!tokenEntry) {
      return res.json({ success: false, error: "No token" });
    }
    
    try {
      await webpush.sendNotification(
        JSON.parse(tokenEntry.token),
        JSON.stringify({ title, body, data: { type: 'error', errorType, details } })
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error notification failed:", error.message);
      if (error.statusCode === 410) {
        db.prepare("DELETE FROM fcm_tokens WHERE userId = ?").run(userId);
      }
      res.json({ success: false, error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { overlay: false }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use(express.static(path.join(process.cwd(), "public")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.get("/share/user/:uid", (req, res) => {
    const user = db.prepare("SELECT uid, displayName, photoURL, businessName, businessDescription, role FROM users WHERE uid = ?").get(req.params.uid);
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="${user.displayName}${user.businessName ? ' - ' + user.businessName : ''} | Bikuumba">
  <meta property="og:description" content="${user.businessDescription || 'Check out this business on Bikuumba Marketplace'}">
  <meta property="og:image" content="${user.photoURL || 'https://bikuumba-4y78.onrender.com/og-default.png'}">
  <meta property="og:url" content="https://bikuumba-4y78.onrender.com/profile/${user.uid}">
  <meta property="og:type" content="profile">
  <meta name="twitter:card" content="summary_large_image">
  <title>${user.displayName} | Bikuumba</title>
</head>
<body>
  <p>Redirecting to Bikuumba...</p>
  <script>window.location.href = "/profile/${user.uid}";</script>
</body>
</html>`;
    res.send(html);
  });

  app.get("/share/product/:productId", (req, res) => {
    const product = db.prepare(`
      SELECT p.*, u.displayName as sellerName, u.photoURL as sellerPhoto 
      FROM products p 
      JOIN users u ON p.sellerId = u.uid 
      WHERE p.id = ?
    `).get(req.params.productId);
    
    if (!product) {
      return res.status(404).send("Product not found");
    }
    
    const images = JSON.parse(product.images || '[]');
    const imageUrl = images[0] || 'https://bikuumba-4y78.onrender.com/og-default.png';
    const price = product.discount ? Math.round(product.price * (1 - product.discount / 100)) : product.price;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="${product.name} - ${formatPrice(price)} | Bikuumba">
  <meta property="og:description" content="${product.description?.substring(0, 150) || 'Check out this product on Bikuumba Marketplace'}${product.description?.length > 150 ? '...' : ''}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="https://bikuumba-4y78.onrender.com/product/${product.id}">
  <meta property="og:type" content="product">
  <meta property="product:price:amount" content="${price}">
  <meta property="product:price:currency" content="UGX">
  <meta name="twitter:card" content="summary_large_image">
  <title>${product.name} - ${formatPrice(price)} | Bikuumba</title>
</head>
<body>
  <p>Redirecting to Bikuumba...</p>
  <script>window.location.href = "/product/${product.id}";</script>
</body>
</html>`;
    res.send(html);
  });

  function formatPrice(amount) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits:0 }).format(amount);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();