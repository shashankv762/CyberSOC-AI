import { exec } from 'child_process';
import { promisify } from 'util';
import { systemService } from './system_service.js';

const execAsync = promisify(exec);

export const realSystemMonitor = {
  start: () => {
    console.log("Starting real system monitor...");
    
    // Poll processes every 5 seconds
    setInterval(async () => {
      try {
        // Use ps to get real processes with their state
        const { stdout } = await execAsync('ps -eo pid,%cpu,%mem,state,comm --no-headers | head -n 50');
        const lines = stdout.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parseInt(parts[0], 10);
            const cpu = parseFloat(parts[1]);
            const mem = parseFloat(parts[2]);
            const stateChar = parts[3].charAt(0);
            const name = parts.slice(4).join(' ');
            
            let status = 'Unknown';
            if (stateChar === 'R') status = 'Running';
            else if (stateChar === 'S') status = 'Sleeping';
            else if (stateChar === 'I') status = 'Idle';
            else if (stateChar === 'Z') status = 'Zombie';
            else if (stateChar === 'T') status = 'Stopped';
            else if (stateChar === 'D') status = 'Disk Sleep';
            else status = stateChar;
            
            // Basic heuristic for suspicious processes
            const isSuspicious = name.includes('nc') || name.includes('nmap') || name.includes('miner');
            
            await systemService.processData({
              type: 'process',
              details: {
                pid,
                name,
                cpu_percent: cpu,
                memory_usage: mem,
                exe_path: name,
                status: status
              },
              risk_score: isSuspicious ? 0.8 : 0.1,
              flagged: isSuspicious
            });
          }
        }
      } catch (error) {
        console.error("Error fetching real processes:", error);
      }
    }, 5000);

    // Poll network connections every 5 seconds
    setInterval(async () => {
      try {
        // Use ss to get real network connections
        const { stdout } = await execAsync('ss -tunap | grep ESTAB | head -n 50 || true');
        const lines = stdout.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 6) {
            const localAddress = parts[4];
            const remoteAddress = parts[5];
            const processInfo = parts[6] || '';
            
            let pid = 0;
            const pidMatch = processInfo.match(/pid=(\d+)/);
            if (pidMatch) {
              pid = parseInt(pidMatch[1], 10);
            }
            
            // Basic heuristic for suspicious network
            const isSuspicious = remoteAddress.includes(':4444') || remoteAddress.includes(':3389');
            
            await systemService.processData({
              type: 'network',
              details: {
                local_address: localAddress,
                remote_address: remoteAddress,
                status: 'ESTABLISHED',
                pid
              },
              risk_score: isSuspicious ? 0.8 : 0.1,
              flagged: isSuspicious
            });
          }
        }
      } catch (error) {
        console.error("Error fetching real network connections:", error);
      }
    }, 5000);
  }
};
