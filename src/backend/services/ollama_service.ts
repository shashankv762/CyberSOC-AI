import { db } from "../database.js";

export const ollamaService = {
  getAlertContext: (alertId: number) => {
    return db.prepare(`
      SELECT a.*, l.source_ip, l.event_type, l.username, l.status_code, l.payload
      FROM alerts a
      LEFT JOIN logs l ON a.log_id = l.id
      WHERE a.id = ?
    `).get(alertId);
  },

  saveToHistory: (role: string, content: string) => {
    db.prepare("INSERT INTO chat_history (role, content) VALUES (?, ?)").run(role, content);
  },

  getHistory: (limit = 20) => {
    return db.prepare("SELECT * FROM chat_history ORDER BY created_at DESC LIMIT ?").all(limit).reverse();
  }
};
