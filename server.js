import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import Database from "better-sqlite3";
import cors from "cors";
import webpush from "web-push";

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
    bulkDiscountPercent INTEGER DEFAULT 0
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
    createdAt TEXT
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
    passportPhoto TEXT,
    businessDocuments TEXT,
    status TEXT DEFAULT 'pending',
    submittedAt TEXT,
    reviewedAt TEXT,
    reviewedBy TEXT
  );
`);

const masterAdminExists = db.prepare("SELECT * FROM users WHERE email = ?").get('bikuumba26@gmail.com');
if (!masterAdminExists) {
  const stmt = db.prepare(`
    INSERT INTO users (uid, email, displayName, photoURL, role, createdAt, password)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run('master-admin', 'bikuumba26@gmail.com', 'Master Admin', '', 'master', new Date().toISOString(), 'bikuumba');
}

const adminExists = db.prepare("SELECT * FROM users WHERE email = ?").get('bikuumba@gmail.com');
if (!adminExists) {
  const stmt = db.prepare(`
    INSERT INTO users (uid, email, displayName, photoURL, role, createdAt, password)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run('admin-user', 'bikuumba@gmail.com', 'Bikuumba Admin', '', 'admin', new Date().toISOString(), 'bikuumba');
}

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

  app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  });

  app.post("/api/auth/signup", (req, res) => {
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
    const uid = Math.random().toString(36).substring(2, 15);
    const newUser = {
      uid,
      email,
      displayName,
      photoURL: "",
      role: email === 'bikuumba26@gmail.com' ? 'master' : (email === 'bitbyte790@gmail.com' ? 'admin' : 'customer'),
      createdAt: new Date().toISOString(),
      password
    };
    const stmt = db.prepare(`
      INSERT INTO users (uid, email, displayName, photoURL, role, createdAt, password, location, phoneAirtel, phoneMTN, coverPhoto, socialHandles)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(newUser.uid, newUser.email, newUser.displayName, newUser.photoURL, newUser.role, newUser.createdAt, newUser.password, null, null, null, null, null);
    res.json(newUser);
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    res.json(user);
  });

  app.get("/api/users/:uid", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(req.params.uid);
    res.json(user || null);
  });

  app.post("/api/users", (req, res) => {
    const { uid, email, displayName, photoURL, role, businessName, businessDescription, password, createdAt, location, phoneAirtel, phoneMTN, coverPhoto, socialHandles } = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (uid, email, displayName, photoURL, role, businessName, businessDescription, password, createdAt, location, phoneAirtel, phoneMTN, coverPhoto, socialHandles)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(uid, email, displayName, photoURL, role, businessName, businessDescription, password || null, createdAt, location || null, phoneAirtel || null, phoneMTN || null, coverPhoto || null, socialHandles ? JSON.stringify(socialHandles) : null);
    res.json({ success: true });
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.post("/api/business/verify", (req, res) => {
    const { id, userId, registeredEmail, registeredPhone, passportPhoto, businessDocuments } = req.body;
    const existing = db.prepare("SELECT * FROM business_verification WHERE userId = ?").get(userId);
    if (existing) {
      db.prepare(`
        UPDATE business_verification SET registeredEmail = ?, registeredPhone = ?, passportPhoto = ?, businessDocuments = ?, status = 'pending', submittedAt = ?
        WHERE userId = ?
      `).run(registeredEmail, registeredPhone, passportPhoto, businessDocuments, new Date().toISOString(), userId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO business_verification (id, userId, registeredEmail, registeredPhone, passportPhoto, businessDocuments, status, submittedAt)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `);
      stmt.run(id, userId, registeredEmail, registeredPhone, passportPhoto, businessDocuments, new Date().toISOString());
    }
    res.json({ success: true });
  });

  app.get("/api/business/verify/:userId", (req, res) => {
    const verification = db.prepare("SELECT * FROM business_verification WHERE userId = ?").get(req.params.userId);
    res.json(verification || null);
  });

  app.get("/api/business/verify-requests", (req, res) => {
    const requests = db.prepare("SELECT * FROM business_verification WHERE status = 'pending' ORDER BY submittedAt DESC").all();
    res.json(requests);
  });

  app.post("/api/business/approve", (req, res) => {
    const { userId, approved, reviewedBy } = req.body;
    db.prepare(`
      UPDATE business_verification SET status = ?, reviewedAt = ?, reviewedBy = ?
      WHERE userId = ?
    `).run(approved ? 'approved' : 'denied', new Date().toISOString(), reviewedBy, userId);
    
    if (approved) {
      db.prepare("UPDATE users SET role = 'seller' WHERE uid = ?").run(userId);
    }
    
    res.json({ success: true });
  });

  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products ORDER BY createdAt DESC").all();
    res.json(products.map((p) => ({ ...p, images: JSON.parse(p.images) })));
  });

  app.get('/api/categories', (req, res) => {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE isApproved = 1 AND category IS NOT NULL AND category != ?').all('');
    res.json(categories.map((c) => c.category).filter(Boolean));
  });

  app.get('/api/best-sellers', (req, res) => {
    const products = db.prepare(`
      SELECT p.*, u.businessName as sellerName, u.photoURL as sellerPhoto,
        (SELECT COUNT(*) FROM reviews r WHERE r.productId = p.id) as reviewCount
      FROM products p
      JOIN users u ON p.sellerId = u.uid
      WHERE p.isApproved = 1
      ORDER BY (COALESCE(p.reviewCount, 0) * 2 + COALESCE(p.likeCount, 0) + COALESCE(p.visitCount, 0)) DESC
      LIMIT 20
    `).all();
    res.json(products.map((p) => ({ ...p, images: JSON.parse(p.images) })));
  });

  app.post("/api/products", (req, res) => {
    const { id, name, description, price, category, images, stock, isAuthentic, authenticationDetails, ratingAvg, reviewCount, sellerId, sellerName, createdAt, visitCount, likeCount } = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO products (id, name, description, price, category, images, stock, isAuthentic, authenticationDetails, ratingAvg, reviewCount, sellerId, sellerName, createdAt, visitCount, likeCount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, description, price, category, JSON.stringify(images), stock, isAuthentic ? 1 : 0, authenticationDetails, ratingAvg, reviewCount, sellerId, sellerName, createdAt, visitCount, likeCount);
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/orders", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all();
    res.json(orders.map((o) => ({ 
      ...o, 
      items: JSON.parse(o.items),
      sellerIds: JSON.parse(o.sellerIds)
    })));
  });

  app.post("/api/orders", (req, res) => {
    const { id, customerId, items, total, status, paymentId, trackingNumber, sellerIds, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO orders (id, customerId, items, total, status, paymentId, trackingNumber, sellerIds, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, customerId, JSON.stringify(items), total, status || 'pending', paymentId, trackingNumber, JSON.stringify(sellerIds), createdAt);
    res.json({ success: true });
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/messages/:userId", (req, res) => {
    const messages = db.prepare("SELECT * FROM messages WHERE receiverId = ? OR senderId = ? ORDER BY createdAt DESC").all(req.params.userId, req.params.userId);
    res.json(messages.map((m) => ({ ...m, read: !!m.read })));
  });

  app.post("/api/messages", (req, res) => {
    const { id, senderId, senderName, receiverId, content, createdAt, type, read } = req.body;
    const stmt = db.prepare(`
      INSERT INTO messages (id, senderId, senderName, receiverId, content, createdAt, type, read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, senderId, senderName, receiverId, content, createdAt, type, read ? 1 : 0);
    res.json({ success: true });
  });

  app.patch("/api/messages/:id/read", (req, res) => {
    db.prepare("UPDATE messages SET read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/messages/:id", (req, res) => {
    db.prepare("DELETE FROM messages WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/messages/conversation/:userId1/:userId2", (req, res) => {
    const { userId1, userId2 } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
      ORDER BY createdAt ASC
    `).all(userId1, userId2, userId2, userId1);
    res.json(messages.map((m) => ({ ...m, read: !!m.read })));
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();