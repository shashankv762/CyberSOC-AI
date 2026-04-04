import { db } from "../database.js";

export const ipsService = {
  blockIp: (ip: string, reason: string) => {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO blocked_ips (ip, reason)
        VALUES (?, ?)
      `);
      stmt.run(ip, reason);
      console.log(`[IPS] Blocked IP: ${ip} - Reason: ${reason}`);
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
      console.log(`[IPS] Unblocked IP: ${ip}`);
      return true;
    } catch (err) {
      console.error(`[IPS] Failed to unblock IP ${ip}:`, err);
      return false;
    }
  },

  isIpBlocked: (ip: string): boolean => {
    try {
      const result = db.prepare("SELECT 1 FROM blocked_ips WHERE ip = ?").get(ip);
      return !!result;
    } catch (err) {
      console.error(`[IPS] Failed to check IP ${ip}:`, err);
      return false;
    }
  },

  getBlockedIps: () => {
    try {
      return db.prepare("SELECT * FROM blocked_ips ORDER BY timestamp DESC").all();
    } catch (err) {
      console.error("[IPS] Failed to get blocked IPs:", err);
      return [];
    }
  }
};
