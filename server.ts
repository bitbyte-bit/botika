import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("bikuumba.db");

// Initialize Database
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
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    price REAL,
    category TEXT,
    images TEXT, -- JSON array
    stock INTEGER,
    isAuthentic INTEGER,
    authenticationDetails TEXT,
    ratingAvg REAL,
    reviewCount INTEGER,
    sellerId TEXT,
    sellerName TEXT,
    createdAt TEXT,
    visitCount INTEGER,
    likeCount INTEGER
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    items TEXT, -- JSON array
    total REAL,
    status TEXT,
    paymentId TEXT,
    trackingNumber TEXT,
    sellerIds TEXT, -- JSON array
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
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  
  // Users
  app.get("/api/users/:uid", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(req.params.uid);
    res.json(user || null);
  });

  app.post("/api/users", (req, res) => {
    const { uid, email, displayName, photoURL, role, businessName, businessDescription, password, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (uid, email, displayName, photoURL, role, businessName, businessDescription, password, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(uid, email, displayName, photoURL, role, businessName, businessDescription, password || null, createdAt);
    res.json({ success: true });
  });

  // Auth
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, displayName } = req.body;
    const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const uid = Math.random().toString(36).substring(2, 15);
    const newUser = {
      uid,
      email,
      displayName,
      photoURL: "",
      role: email === 'bitbyte790@gmail.com' || email === 'bikuumba26@gmail.com' ? 'admin' : 'customer',
      createdAt: new Date().toISOString(),
      password
    };
    const stmt = db.prepare(`
      INSERT INTO users (uid, email, displayName, photoURL, role, createdAt, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(newUser.uid, newUser.email, newUser.displayName, newUser.photoURL, newUser.role, newUser.createdAt, newUser.password);
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

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  // Products
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products ORDER BY createdAt DESC").all();
    res.json(products.map((p: any) => ({ ...p, images: JSON.parse(p.images as string) })));
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

  // Orders
  app.get("/api/orders", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all();
    res.json(orders.map((o: any) => ({ 
      ...o, 
      items: JSON.parse(o.items as string),
      sellerIds: JSON.parse(o.sellerIds as string)
    })));
  });

  app.post("/api/orders", (req, res) => {
    const { id, customerId, items, total, status, paymentId, trackingNumber, sellerIds, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO orders (id, customerId, items, total, status, paymentId, trackingNumber, sellerIds, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, customerId, JSON.stringify(items), total, status, paymentId, trackingNumber, JSON.stringify(sellerIds), createdAt);
    res.json({ success: true });
  });

  // Messages
  app.get("/api/messages/:userId", (req, res) => {
    const messages = db.prepare("SELECT * FROM messages WHERE receiverId = ? OR senderId = ? ORDER BY createdAt DESC").all(req.params.userId, req.params.userId);
    res.json(messages.map((m: any) => ({ ...m, read: !!m.read })));
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

  // Follows
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

  // Notifications
  app.get("/api/notifications/:userId", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC").all(req.params.userId);
    res.json(notifications.map((n: any) => ({ ...n, read: !!n.read })));
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

  // Reviews
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

  // Vite middleware for development
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
