import { db } from "../database.js";
import { sentinelBridge } from "./sentinel_bridge.js";
import { sseService } from "./sse_service.js";

export const settingsService = {
  getSettings: () => {
    const rows = db.prepare("SELECT key, value FROM settings").all() as {key: string, value: string}[];
    const settings: Record<string, any> = {
      auto_ack_enabled: false,
      auto_ack_severity: 'Low',
      auto_ack_delay_minutes: 60,
      anomaly_threshold: 0.35,
      critical_threshold: 0.85
    };
    
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (e) {
        settings[row.key] = row.value;
      }
    }
    return settings;
  },

  updateSettings: (newSettings: Record<string, any>) => {
    const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    const transaction = db.transaction((settings: Record<string, any>) => {
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, JSON.stringify(value));
      }
    });
    transaction(newSettings);
    return settingsService.getSettings();
  }
};

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
    
    // Feed to Sentinel AI Brain
    try {
      sentinelBridge.processEvent({
        id: info.lastInsertRowid,
        event_type: 'alert',
        severity: alert.severity,
        reason: alert.reason,
        score: alert.score,
        log_id: alert.log_id
      });
    } catch (e) {
      console.error("Failed to send alert to Sentinel:", e);
    }
    
    // Broadcast via SSE
    try {
      sseService.broadcast('new_alert', {
        id: info.lastInsertRowid,
        severity: alert.severity,
        reason: alert.reason,
        log_id: alert.log_id
      });
    } catch (e) {
      console.error("Failed to broadcast SSE:", e);
    }

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
  },

  autoAcknowledgeAlerts: () => {
    const settings = settingsService.getSettings();
    if (!settings.auto_ack_enabled) return 0;

    const delayMinutes = settings.auto_ack_delay_minutes || 60;
    const severity = settings.auto_ack_severity || 'Low';

    const info = db.prepare(`
      UPDATE alerts 
      SET acknowledged = 1 
      WHERE acknowledged = 0 
        AND severity = ? 
        AND created_at <= datetime('now', ?)
    `).run(severity, `-${delayMinutes} minutes`);

    if (info.changes > 0) {
      console.log(`Auto-acknowledged ${info.changes} alerts with severity ${severity} older than ${delayMinutes} minutes.`);
    }
    return info.changes;
  }
};
