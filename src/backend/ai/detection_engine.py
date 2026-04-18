import os
import json
import time
import requests
from typing import Dict, Any, List
from collections import deque

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

try:
    from sklearn.ensemble import IsolationForest
    import numpy as np
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    from langchain_community.llms import Ollama
    HAS_OLLAMA = True
except ImportError:
    HAS_OLLAMA = False

try:
    import yara
    HAS_YARA = True
except ImportError:
    HAS_YARA = False


class SigmaEngine:
    def __init__(self, rules_dir="./sigma_rules"):
        self.rules = []
        self.rules_dir = rules_dir
        self.load_rules()

    def load_rules(self):
        if not HAS_YAML:
            return
        if not os.path.exists(self.rules_dir):
            os.makedirs(self.rules_dir, exist_ok=True)
            # Create a dummy rule for testing
            dummy_rule = {
                "title": "Suspicious Login",
                "detection": {
                    "selection": {"event_type": "login_failed"}
                }
            }
            with open(os.path.join(self.rules_dir, "dummy.yml"), "w") as f:
                yaml.dump(dummy_rule, f)
                
        for filename in os.listdir(self.rules_dir):
            if filename.endswith(".yml") or filename.endswith(".yaml"):
                try:
                    with open(os.path.join(self.rules_dir, filename), "r") as f:
                        rule = yaml.safe_load(f)
                        if rule:
                            self.rules.append(rule)
                except Exception as e:
                    print(f"Error loading Sigma rule {filename}: {e}")

    def match(self, event: Dict[str, Any]) -> List[str]:
        matches = []
        for rule in self.rules:
            try:
                selection = rule.get("detection", {}).get("selection", {})
                is_match = True
                for k, v in selection.items():
                    if event.get(k) != v:
                        is_match = False
                        break
                if is_match and selection:
                    matches.append(rule.get("title", "Unknown Rule"))
            except Exception:
                pass
        return matches

    def add_rule(self, rule_yaml: str):
        if not HAS_YAML:
            return
        try:
            rule = yaml.safe_load(rule_yaml)
            if rule:
                self.rules.append(rule)
                # Save it to disk as well
                title = rule.get("title", f"auto_rule_{int(time.time())}")
                filename = "".join(x for x in title if x.isalnum() or x in "_- ") + ".yml"
                filename = filename.replace(" ", "_").lower()
                with open(os.path.join(self.rules_dir, filename), "w") as f:
                    yaml.dump(rule, f)
                print(f"Added and saved new Sigma rule: {title}", flush=True)
        except Exception as e:
            print(f"Error adding dynamic Sigma rule: {e}", flush=True)


class AnomalyDetector:
    def __init__(self, training_size=500):
        self.training_size = training_size
        self.clean_events = []
        self.model = IsolationForest(contamination=0.05, random_state=42) if HAS_SKLEARN else None
        self.is_trained = False

    def _extract_features(self, event: Dict[str, Any]) -> List[float]:
        # Simple feature extraction for demonstration
        features = [
            float(event.get("port", 0)),
            float(len(str(event.get("payload", "")))),
            float(1 if event.get("event_type") == "login_failed" else 0)
        ]
        return features

    def process(self, event: Dict[str, Any]) -> Dict[str, Any]:
        if not HAS_SKLEARN:
            # Heuristic fallback
            score = 0.0
            is_anomaly = False
            
            # Simple rules for "anomaly"
            if event.get("severity") == "Critical":
                score -= 0.5
            if len(str(event.get("payload", ""))) > 500:
                score -= 0.3
            if event.get("event_type") == "login_failed":
                score -= 0.2
                
            if score < -0.7:
                is_anomaly = True
                
            return {
                "is_anomaly": is_anomaly, 
                "score": score, 
                "status": "heuristic_fallback (sklearn missing)"
            }

        features = self._extract_features(event)

        if not self.is_trained:
            self.clean_events.append(features)
            if len(self.clean_events) >= self.training_size:
                self.model.fit(self.clean_events)
                self.is_trained = True
            return {"is_anomaly": False, "score": 0.0, "status": "training", "progress": len(self.clean_events)/self.training_size}

        # Predict
        prediction = self.model.predict([features])[0] # 1 for normal, -1 for anomaly
        score = self.model.decision_function([features])[0] # Lower is more anomalous
        
        is_anomaly = prediction == -1
        return {
            "is_anomaly": bool(is_anomaly),
            "score": float(score),
            "status": "active"
        }


class MITREMapper:
    def __init__(self):
        self.llm = Ollama(model="phi3") if HAS_OLLAMA else None

    def classify(self, event: Dict[str, Any]) -> str:
        if not self.llm:
            # Fallback heuristic mapping
            evt_type = event.get("event_type", "").lower()
            if "login" in evt_type: return "T1110 - Brute Force"
            if "sql" in evt_type: return "T1190 - Exploit Public-Facing Application"
            return "T1082 - System Information Discovery"
            
        prompt = f"Analyze this security event and map it to a single MITRE ATT&CK technique ID and name. Event: {event}. Return ONLY the technique ID and name (e.g., 'T1110 - Brute Force')."
        try:
            result = self.llm.invoke(prompt).strip()
            return result
        except Exception:
            return "T1082 - System Information Discovery"


class YaraScanner:
    def __init__(self, rules_dir="./yara_rules"):
        self.rules_dir = rules_dir
        self.rules = None
        self.load_rules()

    def load_rules(self):
        if not HAS_YARA:
            return
        if not os.path.exists(self.rules_dir):
            os.makedirs(self.rules_dir, exist_ok=True)
            # Create dummy rule
            dummy_rule = 'rule DummyRule { strings: $a = "malicious_string" condition: $a }'
            with open(os.path.join(self.rules_dir, "dummy.yar"), "w") as f:
                f.write(dummy_rule)
                
        filepaths = {}
        for filename in os.listdir(self.rules_dir):
            if filename.endswith(".yar") or filename.endswith(".yara"):
                filepaths[filename] = os.path.join(self.rules_dir, filename)
                
        if filepaths:
            try:
                self.rules = yara.compile(filepaths=filepaths)
            except Exception as e:
                print(f"Yara compilation error: {e}")

    def scan_file(self, file_path: str) -> List[str]:
        if not HAS_YARA or not self.rules:
            return []
        if not os.path.exists(file_path):
            return []
        try:
            matches = self.rules.match(file_path)
            return [m.rule for m in matches]
        except Exception:
            return []


import requests

class ThreatIntelClient:
    def __init__(self):
        # We can configure keys via environment variables or fallback to public APIs
        self.abuseipdb_key = os.environ.get("ABUSEIPDB_API_KEY", "")
        self.otx_key = os.environ.get("OTX_API_KEY", "")
        self.cache = {}

    def check_ip(self, ip_address: str) -> Dict[str, Any]:
        if not ip_address or ip_address in ["127.0.0.1", "localhost", "0.0.0.0"]:
            return {"malicious": False, "score": 0, "source": "internal"}
            
        if ip_address in self.cache:
            return self.cache[ip_address]

        result = {"malicious": False, "score": 0, "source": "none"}
        
        try:
            # If we don't have an API key, we simulate a public list lookup for demonstration
            # In a real scenario, this would query AlienVault OTX or equivalent free feeds
            
            if self.abuseipdb_key:
                url = "https://api.abuseipdb.com/api/v2/check"
                headers = {'Accept': 'application/json', 'Key': self.abuseipdb_key}
                response = requests.get(url, headers=headers, params={'ipAddress': ip_address, 'maxAgeInDays': '90'}, timeout=2)
                if response.status_code == 200:
                    data = response.json()['data']
                    score = data.get('abuseConfidenceScore', 0)
                    result = {
                        "malicious": score > 50,
                        "score": score,
                        "source": "AbuseIPDB",
                        "tags": [data.get('domain')] if data.get('domain') else []
                    }
                    self.cache[ip_address] = result
                    return result
                    
            if self.otx_key:
                url = f"https://otx.alienvault.com/api/v1/indicators/IPv4/{ip_address}/general"
                headers = {'X-OTX-API-KEY': self.otx_key}
                response = requests.get(url, headers=headers, timeout=2)
                if response.status_code == 200:
                    data = response.json()
                    pulses = data.get('pulse_info', {}).get('count', 0)
                    result = {
                        "malicious": pulses > 2,
                        "score": min(100, pulses * 10),
                        "source": "AlienVault OTX",
                        "tags": []
                    }
                    self.cache[ip_address] = result
                    return result
            
            # Fallback mock for demo when keys aren't set but we want to simulate TI behavior
            # Simulate some IPs as malicious based on hardcoded patterns to prove it works dynamically
            if ip_address.startswith("185.") or ip_address.startswith("45."):
                result = {"malicious": True, "score": 85, "source": "Mock Mock Public TI Feed", "tags": ["Scanner", "Malicious Host"]}
            else:
                result = {"malicious": False, "score": 10, "source": "Mock Public TI Feed", "tags": ["Clean"]}
                
            self.cache[ip_address] = result
        except requests.RequestException:
            pass
            
        return result

class KillChainCorrelator:
    def __init__(self, window_minutes=5):
        self.window_seconds = window_minutes * 60
        self.events = deque()

    def add_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        now = time.time()
        event['timestamp'] = event.get('timestamp', now)
        self.events.append(event)
        
        # Remove old events
        while self.events and now - self.events[0]['timestamp'] > self.window_seconds:
            self.events.popleft()
            
        return self.detect_kill_chain()

    def detect_kill_chain(self) -> Dict[str, Any]:
        # Simple heuristic for Recon -> Exploit -> Exfil
        has_recon = False
        has_exploit = False
        has_exfil = False
        
        for e in self.events:
            evt_type = e.get("event_type", "").lower()
            if "scan" in evt_type or "discovery" in evt_type:
                has_recon = True
            elif "exploit" in evt_type or "injection" in evt_type or "login_failed" in evt_type:
                has_exploit = True
            elif "download" in evt_type or "transfer" in evt_type or "exfil" in evt_type:
                has_exfil = True
                
        if has_recon and has_exploit and has_exfil:
            return {
                "chain_detected": True,
                "stage": "Exfiltration",
                "confidence": "High",
                "message": "Kill-chain sequence detected: Recon -> Exploit -> Exfil within 5 min window."
            }
        elif has_recon and has_exploit:
            return {
                "chain_detected": True,
                "stage": "Exploitation",
                "confidence": "Medium",
                "message": "Partial kill-chain detected: Recon -> Exploit."
            }
            
        return {"chain_detected": False}
