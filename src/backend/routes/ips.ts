import { Router } from "express";
import { ipsService } from "../services/ips_service.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { logService } from "../services/log_service.js";

const router = Router();

// All IPS routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all blocked IPs
router.get("/blocked", (req, res) => {
  try {
    const blockedIps = ipsService.getBlockedIps();
    res.json(blockedIps);
  } catch (error) {
    console.error("Error fetching blocked IPs:", error);
    res.status(500).json({ error: "Failed to fetch blocked IPs" });
  }
});

// Manually block an IP
router.post("/block", (req, res) => {
  try {
    const { ip, reason, duration } = req.body;
    const user = (req as any).user;
    
    if (!ip) {
      return res.status(400).json({ error: "IP address is required" });
    }

    const blockReason = reason || "Manually blocked by administrator";
    const durationHours = duration ? parseFloat(duration) : null;
    const success = ipsService.blockIp(ip, blockReason, durationHours);
    
    if (success) {
      // Log the action
      logService.processAndSaveLog({
        timestamp: new Date().toISOString(),
        source_ip: ip,
        username: user?.username || "admin",
        event_type: "ips_action",
        status_code: 200,
        payload: { action: "block", reason: blockReason, duration: durationHours }
      }).catch(console.error);

      res.json({ message: `IP ${ip} successfully blocked` });
    } else {
      res.status(500).json({ error: "Failed to block IP" });
    }
  } catch (error) {
    console.error("Error blocking IP:", error);
    res.status(500).json({ error: "Failed to block IP" });
  }
});

// Unblock an IP
router.delete("/unblock/:ip", (req, res) => {
  try {
    const { ip } = req.params;
    const user = (req as any).user;
    const success = ipsService.unblockIp(ip);
    
    if (success) {
      // Log the action
      logService.processAndSaveLog({
        timestamp: new Date().toISOString(),
        source_ip: ip,
        username: user?.username || "admin",
        event_type: "ips_action",
        status_code: 200,
        payload: { action: "unblock" }
      }).catch(console.error);

      res.json({ message: `IP ${ip} successfully unblocked` });
    } else {
      res.status(500).json({ error: "Failed to unblock IP" });
    }
  } catch (error) {
    console.error("Error unblocking IP:", error);
    res.status(500).json({ error: "Failed to unblock IP" });
  }
});

export default router;
