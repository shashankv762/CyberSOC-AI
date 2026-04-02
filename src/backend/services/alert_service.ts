import { db } from "../database.js";

export const alertService = {
  createAlert: (alert: any) => {
    const stmt = db.prepare(`
      INSERT INTO alerts (log_id, severity, reason, score, mitigations, acknowledged)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    const info = stmt.run(
      alert.log_id,
      alert.severity,
      alert.reason,
      alert.score,
      JSON.stringify(alert.mitigations)
    );
    return info.lastInsertRowid;
  },

  getAlerts: (severity?: string, acknowledged?: boolean, limit = 20, offset = 0) => {
    console.log(`Fetching alerts: severity=${severity}, acknowledged=${acknowledged}, limit=${limit}, offset=${offset}`);
    let query = `
      SELECT a.*, l.source_ip, l.event_type, l.username, l.status_code, l.payload
      FROM alerts a
      LEFT JOIN logs l ON a.log_id = l.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (severity) {
      conditions.push("a.severity = ?");
      params.push(severity);
    }
    if (acknowledged !== undefined) {
      conditions.push("a.acknowledged = ?");
      params.push(acknowledged ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    try {
      const results = db.prepare(query).all(...params);
      console.log(`Found ${results.length} alerts.`);
      return results;
    } catch (err) {
      console.error("Database error in getAlerts:", err);
      throw err;
    }
  },

  getAlertById: (id: number) => {
    return db.prepare(`
      SELECT a.*, l.source_ip, l.event_type, l.username, l.status_code, l.payload
      FROM alerts a
      LEFT JOIN logs l ON a.log_id = l.id
      WHERE a.id = ?
    `).get(id);
  },

  acknowledgeAlert: (id: number, acknowledged: boolean) => {
    db.prepare("UPDATE alerts SET acknowledged = ? WHERE id = ?").run(acknowledged ? 1 : 0, id);
    return alertService.getAlertById(id);
  }
};
