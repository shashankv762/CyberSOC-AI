import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { authUtils } from './utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), 'soc.db');
console.log(`Initializing database at: ${dbPath}`);

let db: any;
try {
  db = new Database(dbPath);
  console.log("Database connection established.");
} catch (err) {
  console.error("Failed to connect to database in current directory, trying /tmp/soc.db", err);
  try {
    db = new Database('/tmp/soc.db');
    console.log("Database connection established in /tmp/soc.db");
  } catch (err2) {
    console.error("Failed to connect to database in /tmp as well", err2);
    throw err2;
  }
}

export { db };

export async function initDb() {
  try {
    // Logs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source_ip VARCHAR(45) NOT NULL,
        event_type VARCHAR(50),
        username VARCHAR(100),
        status_code INTEGER,
        payload TEXT,
        is_anomaly BOOLEAN DEFAULT 0
      )
    `);

    // Alerts Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id INTEGER,
        severity VARCHAR(10),
        reason TEXT,
        score FLOAT,
        mitigations TEXT,
        acknowledged BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (log_id) REFERENCES logs(id)
      )
    `);

    // Users Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'analyst',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat History Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Chat history table initialized.");

    // Processes Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS processes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pid INTEGER,
        name VARCHAR(255),
        cpu_percent FLOAT,
        memory_usage FLOAT,
        exe_path TEXT,
        status VARCHAR(50),
        is_suspicious BOOLEAN DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Network Connections Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS network_connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_address VARCHAR(100),
        remote_address VARCHAR(100),
        status VARCHAR(50),
        pid INTEGER,
        is_suspicious BOOLEAN DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT
      )
    `);

    // Blocked IPs Table (IPS)
    db.exec(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        ip VARCHAR(45) PRIMARY KEY,
        reason TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed admin user if not exists
    const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (!adminExists) {
      const hashedPassword = await authUtils.hashPassword('admin123');
      db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('admin', hashedPassword, 'admin');
      console.log("Default admin user created.");
    }

  } catch (err) {
    console.error("Error during table initialization:", err);
    throw err;
  }
}
