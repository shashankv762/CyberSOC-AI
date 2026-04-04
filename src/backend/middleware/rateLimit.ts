import rateLimit from 'express-rate-limit';
import { ipsService } from '../services/ips_service.js';
import { alertService } from '../services/alert_service.js';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5000, // Increased limit to 5000 requests per minute
  skip: (req) => {
    // Skip rate limiting for internal log generator and health checks
    return req.ip === '::ffff:127.0.0.1' || req.ip === '::1' || req.ip === '127.0.0.1';
  },
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json({
      error: 'Too many requests, please try again later.',
    });
  },
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for login to prevent brute force attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window` (here, per 15 minutes)
  skip: (req) => {
    return req.ip === '::ffff:127.0.0.1' || req.ip === '::1' || req.ip === '127.0.0.1';
  },
  handler: (req, res) => {
    let clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }

    console.warn(`[BRUTE FORCE DETECTED] IP: ${clientIp} exceeded login limits.`);
    
    // Automatically block the IP in the IPS
    const blockReason = `Automated IPS Block: Brute force login attack detected (exceeded 5 attempts in 15 minutes).`;
    const blocked = ipsService.blockIp(clientIp, blockReason);
    
    if (blocked) {
      // Generate a critical alert
      alertService.createAlert({
        log_id: null,
        severity: "Critical",
        reason: `[BRUTE FORCE BLOCKED] IP ${clientIp} has been automatically blocked due to repeated failed login attempts.`,
        score: 1.0,
        mitigations: `Administrator review required. To unblock, navigate to the IPS settings.`
      });
    }

    res.status(429).json({
      error: 'Too many login attempts. Your IP has been blocked by the Intrusion Prevention System.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

