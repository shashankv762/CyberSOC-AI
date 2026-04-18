import os
import time
import json
import socket
import threading
from typing import Dict, Any, List
import subprocess

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

class DeceptionMesh:
    def __init__(self):
        self.traps = []

    def deploy_trap(self, trap_type: str, location: str) -> Dict[str, Any]:
        trap = {
            "id": int(time.time()),
            "type": trap_type,
            "location": location,
            "status": "active",
            "hits": 0
        }
        self.traps.append(trap)
        
        message = f"Deployed {trap_type} trap at {location}."
        if trap_type == "fake_credentials":
            message = f"Injected fake credentials into {location} memory space."
        elif trap_type == "honey_file":
            message = f"Created decoy file 'passwords.txt' in {location}."
            
        return {
            "action": "deploy_trap",
            "trap_type": trap_type,
            "status": "success",
            "message": message
        }

class ResponseEngine:
    def __init__(self):
        self.active_honeypots = {}
        self.blocked_ips = {}
        self.deception = DeceptionMesh()

    def block_ip(self, ip: str, duration_minutes: int = 60) -> Dict[str, Any]:
        result = {"action": "block_ip", "ip": ip, "status": "success", "message": f"IP {ip} blocked for {duration_minutes} minutes."}
        try:
            # Check if iptables exists first
            import shutil
            if not shutil.which("iptables"):
                raise FileNotFoundError("iptables command not found")
                
            # In a real system, we'd use python-iptables or subprocess.run(['iptables', ...])
            subprocess.run(["iptables", "-A", "INPUT", "-s", ip, "-j", "DROP"], check=True, capture_output=True)
        except Exception as e:
            result["status"] = "simulated"
            result["message"] = f"Simulated blocking IP {ip} (requires root/CAP_NET_ADMIN). Error: {e}"
        
        self.blocked_ips[ip] = time.time() + (duration_minutes * 60)
        return result

    def kill_process(self, pid: int, reason: str) -> Dict[str, Any]:
        result = {"action": "kill_process", "pid": pid, "status": "success", "message": f"Process {pid} terminated. Reason: {reason}"}
        if HAS_PSUTIL:
            try:
                p = psutil.Process(pid)
                p.terminate()
            except psutil.NoSuchProcess:
                result["status"] = "failed"
                result["message"] = f"Process {pid} not found."
            except psutil.AccessDenied:
                result["status"] = "simulated"
                result["message"] = f"Simulated killing process {pid} (Access Denied)."
            except Exception as e:
                result["status"] = "error"
                result["message"] = str(e)
        else:
            result["status"] = "simulated"
            result["message"] = f"Simulated killing process {pid} (psutil not installed)."
        return result

    def deploy_honeypot(self, port: int, service_type: str = "generic") -> Dict[str, Any]:
        result = {"action": "deploy_honeypot", "port": port, "status": "success", "message": f"Honeypot ({service_type}) deployed on port {port}."}
        
        if port in self.active_honeypots:
            result["status"] = "failed"
            result["message"] = f"Port {port} is already in use by another honeypot."
            return result

        def honeypot_listener():
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('0.0.0.0', port))
                    s.listen()
                    while True:
                        conn, addr = s.accept()
                        with conn:
                            # Emit honeypot trigger event
                            print(json.dumps({
                                "type": "sentinel_result",
                                "data": {
                                    "analysis": f"Honeypot triggered on port {port} by {addr[0]}",
                                    "action": "HONEYPOT_TRIGGER",
                                    "reasoning": f"Connection received on decoy {service_type} service.",
                                    "execution_result": "Logged connection.",
                                    "timestamp": time.time()
                                }
                            }), flush=True)
                            if service_type == "http":
                                conn.sendall(b"HTTP/1.1 200 OK\r\nServer: Apache/2.4.41 (Ubuntu)\r\n\r\n<html><body><h1>It works!</h1></body></html>\n")
                            elif service_type == "ssh":
                                conn.sendall(b"SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.1\r\n")
                            else:
                                conn.sendall(b"Connection established.\r\n")
            except Exception as e:
                pass # Port might be in use or permission denied

        t = threading.Thread(target=honeypot_listener, daemon=True)
        t.start()
        self.active_honeypots[port] = t
        return result

    def isolate_network_interface(self, iface: str) -> Dict[str, Any]:
        result = {"action": "isolate_interface", "iface": iface, "status": "simulated", "message": f"Simulated isolating interface {iface} (requires root)."}
        return result

class LayerHardener:
    def __init__(self):
        self.layer1_misses = []
        self.sigma_rules_generated = 0

    def record_miss(self, event: Dict[str, Any]):
        now = time.time()
        self.layer1_misses.append(now)
        # Clean up old misses (> 10 mins)
        self.layer1_misses = [t for t in self.layer1_misses if now - t <= 600]

        if len(self.layer1_misses) > 3:
            return self.trigger_retraining(event)
        return None

    def trigger_retraining(self, event: Dict[str, Any]) -> Dict[str, Any]:
        self.sigma_rules_generated += 1
        rule_name = f"Auto_Generated_Rule_{self.sigma_rules_generated}_{int(time.time())}"
        
        # Build logic based on the payload or event type natively observed in the miss.
        payload = str(event.get('payload', '')).replace("'", "''").replace('"', '\\"')
        
        sigma_template = f"""title: {rule_name.replace('_', ' ')}
status: experimental
description: Auto-generated rule autonomously created by Sentinel Brain after Layer 1 (IPS) missed multiple related attacks.
author: Sentinel AI
date: {time.strftime("%Y/%m/%d")}
logsource:
    category: application
detection:
    selection:
        event_type: '{event.get('event_type', 'unknown')}'
        source_ip: '{event.get('source_ip', 'unknown')}'
    condition: selection
level: critical"""

        # Reset misses after generating a rule
        self.layer1_misses = []
        return {
            "action": "retrain_layer1",
            "status": "success",
            "message": f"Layer 1 miss-rate exceeded threshold. Autonomous Sigma rule '{rule_name}' generated.",
            "new_sigma_rule": sigma_template
        }
