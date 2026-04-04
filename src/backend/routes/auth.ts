import { Router } from "express";
import { db } from "../database.js";
import { authUtils } from "../utils/auth.js";
import { logService } from "../services/log_service.js";
import { loginLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;

    const sourceIp = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers['user-agent'] || "unknown";

    if (!user || !(await authUtils.comparePassword(password, user.password))) {
      // Log failed attempt
      await logService.processAndSaveLog({
        timestamp: new Date().toISOString(),
        source_ip: sourceIp,
        username: username || "unknown",
        event_type: "login_failure",
        status_code: 401,
        payload: { user_agent: userAgent }
      });

      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Log successful attempt
    await logService.processAndSaveLog({
      timestamp: new Date().toISOString(),
      source_ip: sourceIp,
      username: username,
      event_type: "login_success",
      status_code: 200,
      payload: { user_agent: userAgent, role: user.role }
    });

    const token = authUtils.generateToken(user);
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
