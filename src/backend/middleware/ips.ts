import { Request, Response, NextFunction } from 'express';
import { ipsService } from '../services/ips_service.js';

export const ipsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract IP. In a real production environment behind proxies, you might need req.headers['x-forwarded-for']
  let clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Clean up IPv6 mapped IPv4 addresses (e.g., ::ffff:192.168.1.1)
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7);
  }

  if (clientIp !== 'unknown' && ipsService.isIpBlocked(clientIp)) {
    console.warn(`[IPS] Blocked request from ${clientIp} to ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Your IP address has been blocked by the Intrusion Prevention System.' 
    });
  }

  next();
};
