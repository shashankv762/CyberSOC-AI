import { db } from "../database.js";

// In-memory cache for fast lookups
const blockedIpsCache = new Set<string>();

export const ipsService = {
  init: () => {
    try {
      // First, clean up expired IPs
      ipsService.cleanupExpiredBlocks();
      
      const rows = db.prepare("SELECT ip FROM blocked_ips WHERE expires_at IS NULL OR expires_at > datetime('now')").all() as { ip: string }[];
      rows.forEach(row => blockedIpsCache.add(row.ip));
      console.log(`[IPS] Loaded ${blockedIpsCache.size} blocked IPs from database.`);
    } catch (err) {
      console.error("[IPS] Failed to load blocked IPs on startup:", err);
    }
  },

  blockIp: (ip: string, reason: string, durationHours?: number | null) => {
    try {
      if (durationHours) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO blocked_ips (ip, reason, expires_at)
          VALUES (?, ?, datetime('now', ?))
        `);
        stmt.run(ip, reason, `+${Math.floor(durationHours * 60)} minutes`);
      } else {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO blocked_ips (ip, reason, expires_at)
          VALUES (?, ?, NULL)
        `);
        stmt.run(ip, reason);
      }
      
      blockedIpsCache.add(ip);
      console.log(`[IPS] Blocked IP: ${ip} - Reason: ${reason}${durationHours ? ` - Duration: ${durationHours}h` : ' - Permanent'}`);
      return true;
    } catch (err) {
      console.error(`[IPS] Failed to block IP ${ip}:`, err);
      return false;
    }
  },

  unblockIp: (ip: string) => {
    try {
      const stmt = db.prepare("DELETE FROM blocked_ips WHERE ip = ?");
      stmt.run(ip);
      blockedIpsCache.delete(ip);
      console.log(`[IPS] Unblocked IP: ${ip}`);
      return true;
    } catch (err) {
      console.error(`[IPS] Failed to unblock IP ${ip}:`, err);
      return false;
    }
  },

  isIpBlocked: (ip: string): boolean => {
    return blockedIpsCache.has(ip);
  },

  getBlockedIps: () => {
    try {
      return db.prepare("SELECT * FROM blocked_ips ORDER BY timestamp DESC").all();
    } catch (err) {
      console.error("[IPS] Failed to get blocked IPs:", err);
      return [];
    }
  },
  
  cleanupExpiredBlocks: () => {
    try {
      const expiredIps = db.prepare("SELECT ip FROM blocked_ips WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')").all() as { ip: string }[];
      if (expiredIps.length > 0) {
        const stmt = db.prepare("DELETE FROM blocked_ips WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')");
        stmt.run();
        
        expiredIps.forEach(row => {
          blockedIpsCache.delete(row.ip);
          console.log(`[IPS] Auto-unblocked expired IP: ${row.ip}`);
        });
      }
    } catch (err) {
      console.error("[IPS] Failed to cleanup expired IPs:", err);
    }
  }
};
