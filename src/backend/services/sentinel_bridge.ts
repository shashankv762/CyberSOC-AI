import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SentinelBridge extends EventEmitter {
  private pythonProcess: ChildProcess | null = null;
  public isReady = false;
  private history: any[] = [];

  start() {
    console.log("Initializing SENTINEL AI Brain...");
    
    const scriptPath = path.join(__dirname, '../ai/sentinel_brain.py');
    
    const spawnPython = (command: string) => {
      this.pythonProcess = spawn(command, [scriptPath]);

      this.pythonProcess.on('error', (err: any) => {
        if (err.code === 'ENOENT') {
          if (command === 'python3') {
            console.log("python3 not found, trying python...");
            spawnPython('python');
          } else {
            console.error("Neither python3 nor python found. SENTINEL AI Brain will not start.");
          }
        } else {
          console.error(`Failed to start SENTINEL AI Brain: ${err.message}`);
        }
      });

      let buffer = '';
      this.pythonProcess.stdout?.on('data', (data) => {
        buffer += data.toString();
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          
          if (!line) continue;
          
          try {
            const msg = JSON.parse(line);
            if (msg.status === 'ready') {
              this.isReady = true;
              console.log(`[SENTINEL] ${msg.message}`);
            } else if (msg.type === 'sentinel_result') {
              this.history.unshift({
                timestamp: new Date().toISOString(),
                ...msg.data
              });
              // Keep only last 50
              if (this.history.length > 50) this.history.pop();
              
              // Process Autonomous Actions from the Brain
              const action = msg.data.action;
              const executions = msg.data.execution_details || [];
              if (action && action !== "MANUAL_REVIEW" && action !== "IGNORE" && action !== "LLM_DECISION") {
                const sourceIp = msg.data.event?.source_ip;
                if (sourceIp) {
                  import('./ips_service.js').then(({ ipsService }) => {
                    const reasoning = msg.data.reasoning || "Autonomous Sentinel RL Response";
                    
                    if (action === "BLOCK_IP") {
                      ipsService.blockIp(sourceIp, `[RL Brain] ${reasoning}`, 1); // 1 hr block
                      console.log(`[SENTINEL AUTO-RESPONSE] Blocked IP: ${sourceIp}`);
                    } else if (action === "ISOLATE_ENDPOINT") {
                      ipsService.blockIp(sourceIp, `[RL Brain] Endpoint Isolation: ${reasoning}`, 24); // 24 hr block
                      console.log(`[SENTINEL AUTO-RESPONSE] Isolated Endpoint IP: ${sourceIp}`);
                    }
                  }).catch(e => console.error("Failed to dynamically import ipsService:", e));
                }
              }

              this.emit('result', msg.data);
            } else if (msg.error) {
              console.error(`[SENTINEL ERROR] ${msg.error}`);
            } else if (msg.status === 'warning') {
              console.warn(`[SENTINEL WARNING] ${msg.message}`);
            } else {
              console.log(`[SENTINEL RAW] ${line}`);
            }
          } catch (e) {
            console.log(`[SENTINEL OUTPUT] ${line}`);
          }
        }
      });

      this.pythonProcess.stderr?.on('data', (data) => {
        console.error(`[SENTINEL STDERR] ${data.toString()}`);
      });

      this.pythonProcess.on('close', (code) => {
        if (code !== null) {
          console.log(`SENTINEL AI Brain exited with code ${code}`);
          this.isReady = false;
          // Restart after 5 seconds
          setTimeout(() => this.start(), 5000);
        }
      });
    };

    try {
      console.log("Checking Sentinel Python dependencies...");
      import('child_process').then(({ exec }) => {
         const installCmd = 'python3 -m pip install --no-cache-dir scikit-learn PyYAML transformers stable-baselines3 gymnasium torch --extra-index-url https://download.pytorch.org/whl/cpu --break-system-packages || (wget -qO- https://bootstrap.pypa.io/get-pip.py | python3 - --break-system-packages && python3 -m pip install --no-cache-dir scikit-learn PyYAML transformers stable-baselines3 gymnasium torch --extra-index-url https://download.pytorch.org/whl/cpu --break-system-packages)';
         exec(installCmd, (error, stdout, stderr) => {
           if (error) {
             console.warn(`[SENTINEL DEPS] Installation warning: ${error.message}`);
           } else {
             console.log("Sentinel Python dependencies check complete.");
           }
           // Start python process after dependencies are checked/installed
           spawnPython('python3');
         });
      }).catch(() => {
        // Fallback if import fails
        spawnPython('python3');
      });
    } catch (e) {
      console.log("Failed to initiate Sentinel Python dependencies check.");
      spawnPython('python3');
    }
  }

  processEvent(event: any) {
    if (!this.isReady || !this.pythonProcess) {
      console.warn("SENTINEL is not ready to process events.");
      return;
    }
    this.pythonProcess.stdin?.write(JSON.stringify(event) + '\n');
  }

  getHistory() {
    return this.history;
  }
}

export const sentinelBridge = new SentinelBridge();
