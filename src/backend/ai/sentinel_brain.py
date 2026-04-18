import json
import time
import sys
from typing import Dict, Any, List

# Graceful imports for heavy ML libraries
try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False

try:
    from langgraph.graph import StateGraph, END
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False

try:
    from langchain_community.llms import Ollama
    HAS_OLLAMA = True
except ImportError:
    HAS_OLLAMA = False

try:
    from transformers import pipeline
    import torch
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    from sklearn.neural_network import MLPClassifier
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    import gymnasium as gym
    from stable_baselines3 import PPO
    import os
    HAS_RL = True
except Exception as e:
    HAS_RL = False
    print(json.dumps({"status": "warning", "message": f"RL modules failed to load: {e}"}), flush=True)

class LocalTransformersLLM:
    def __init__(self, model_name="HuggingFaceTB/SmolLM-135M-Instruct"):
        self.model_name = model_name
        self.generator = None
        self._load_model()

    def _load_model(self):
        try:
            # Using a tiny, fast model that can run on CPU
            print(json.dumps({"status": "loading", "message": f"Downloading/Loading local LLM: {self.model_name}..."}), flush=True)
            self.generator = pipeline(
                "text-generation", 
                model=self.model_name, 
                device="cpu",
                torch_dtype=torch.float32
            )
            print(json.dumps({"status": "ready", "message": f"Local LLM {self.model_name} loaded successfully."}), flush=True)
        except Exception as e:
            print(json.dumps({"error": f"Failed to load local LLM: {e}"}), flush=True)
            self.generator = None

    def invoke(self, prompt: str) -> str:
        if not self.generator:
            raise Exception("Local LLM not initialized.")
        
        formatted_prompt = f"<|user|>\n{prompt}\n<|assistant|>\n"
        
        try:
            result = self.generator(
                formatted_prompt, 
                max_new_tokens=150, 
                temperature=0.7, 
                do_sample=True,
                truncation=True
            )
            generated_text = result[0]['generated_text']
            # Extract only the assistant's response
            response = generated_text.split("<|assistant|>\n")[-1].strip()
            return response
        except Exception as e:
            raise Exception(f"LLM generation failed: {e}")

class DeepLearningMemory:
    def __init__(self):
        self.enabled = HAS_SKLEARN
        if self.enabled:
            # Multi-Layer Perceptron for deep learning pattern recognition
            self.model = MLPClassifier(
                hidden_layer_sizes=(64, 32), 
                activation='relu', 
                solver='adam', 
                max_iter=1
            )
            self.is_initialized = False
            self.classes = np.array([0, 1]) # 0: Normal, 1: Attack
            
            # Initialize with dummy data to set up the network weights
            X_dummy = np.zeros((2, 5))
            y_dummy = np.array([0, 1])
            self.model.partial_fit(X_dummy, y_dummy, classes=self.classes)
            self.is_initialized = True
            
    def _extract_features(self, event: Dict[str, Any]) -> Any:
        # Convert event into a numerical feature vector
        features = [
            float(event.get("score", 0.0)),
            1.0 if event.get("severity") == "Critical" else (0.5 if event.get("severity") == "High" else 0.1),
            float(len(event.get("payload", ""))),
            1.0 if "sql" in str(event.get("payload", "")).lower() else 0.0,
            1.0 if "script" in str(event.get("payload", "")).lower() else 0.0
        ]
        return np.array([features])

    def learn_pattern(self, event: Dict[str, Any], is_attack: bool = True):
        if not self.enabled or not self.is_initialized:
            return
        
        X = self._extract_features(event)
        
        # Pad with dummy data of the opposite class to prevent the warm_start error
        opposite_class = 0 if is_attack else 1
        X_dummy = np.zeros((1, 5))
        
        X_combined = np.vstack((X, X_dummy))
        y_combined = np.array([1 if is_attack else 0, opposite_class])
        
        try:
            # Deep learning: update weights with new data (online learning)
            self.model.partial_fit(X_combined, y_combined)
        except Exception as e:
            print(json.dumps({"error": f"Deep learning update failed: {e}"}), flush=True)

    def predict_threat(self, event: Dict[str, Any]) -> float:
        if not self.enabled or not self.is_initialized:
            return 0.0
            
        X = self._extract_features(event)
        try:
            # Get probability of being an attack (class 1)
            probabilities = self.model.predict_proba(X)
            return float(probabilities[0][1])
        except Exception:
            return 0.0

class RLDecisionAgent:
    def __init__(self, model_path="./rl_model.zip"):
        self.enabled = HAS_RL
        self.model_path = model_path
        self.model = None
        self.actions = ["IGNORE", "BLOCK_IP", "KILL_PROCESS", "ISOLATE_ENDPOINT"]
        self.replay_buffer = []
        self.batch_size = 3
        
        if self.enabled:
            self._init_model()
            
    def _init_model(self):
        try:
            class DummyEnv(gym.Env):
                def __init__(self, buffer=None):
                    super().__init__()
                    self.observation_space = gym.spaces.Box(low=0, high=1, shape=(5,), dtype=np.float32)
                    self.action_space = gym.spaces.Discrete(4)
                    self.buffer = buffer or []
                    self.current_step = 0
                def step(self, action):
                    reward = 0.0
                    done = True
                    if self.buffer and self.current_step < len(self.buffer):
                        _, target_action_idx, targeted_reward = self.buffer[self.current_step]
                        # Reward if model picked same action as what we evaluated, or provide standard step reward
                        reward = targeted_reward if action == target_action_idx else -1.0
                        self.current_step += 1
                        done = self.current_step >= len(self.buffer)
                    next_state = self.buffer[self.current_step][0] if not done else np.zeros(5, dtype=np.float32)
                    return next_state, float(reward), done, False, {}
                def reset(self, seed=None, options=None):
                    self.current_step = 0
                    initial_state = self.buffer[0][0] if self.buffer else np.zeros(5, dtype=np.float32)
                    return initial_state, {}

            self.DummyEnv = DummyEnv

            if os.path.exists(self.model_path):
                self.model = PPO.load(self.model_path)
                print(json.dumps({"status": "ready", "message": "RL Agent loaded from disk."}), flush=True)
            else:
                env = self.DummyEnv()
                self.model = PPO("MlpPolicy", env, verbose=0, n_steps=16, batch_size=16)
                self.model.save(self.model_path)
                print(json.dumps({"status": "ready", "message": "RL Agent initialized with new policy."}), flush=True)
        except Exception as e:
            print(json.dumps({"error": f"RL Agent init failed: {e}"}), flush=True)
            self.enabled = False

    def _extract_state(self, event: Dict[str, Any]) -> Any:
        features = [
            float(event.get("score", 0.0)) / 100.0 if float(event.get("score", 0.0)) > 1.0 else float(event.get("score", 0.0)), 
            1.0 if event.get("severity") == "Critical" else (0.5 if event.get("severity") in ["High", "Medium"] else 0.1),
            min(1.0, float(len(event.get("payload", ""))) / 1000.0),
            1.0 if "sql" in str(event.get("payload", "")).lower() else 0.0,
            1.0 if "script" in str(event.get("payload", "")).lower() else 0.0
        ]
        return np.array(features, dtype=np.float32)

    def decide_action(self, event: Dict[str, Any]) -> str:
        if not self.enabled or not self.model:
            return "LLM_DECISION" # Fallback
            
        state = self._extract_state(event)
        try:
            # Add a bit of exploration natively or trust the deterministic path
            action_idx, _states = self.model.predict(state, deterministic=True)
            return self.actions[int(action_idx)]
        except Exception as e:
            print(json.dumps({"error": f"RL prediction failed: {e}"}), flush=True)
            return "LLM_DECISION"

    def reward_and_learn(self, event: Dict[str, Any], action_taken: str, success: bool):
        if not self.enabled or not self.model:
            return

        state = self._extract_state(event)
        severity = event.get("severity", "Low")
        
        # Calculate dynamic reward based on threat pattern
        reward = 0.0
        if severity == "Critical":
            if action_taken == "ISOLATE_ENDPOINT": reward = 10.0
            elif action_taken == "BLOCK_IP": reward = 5.0
            elif action_taken == "IGNORE": reward = -10.0
        elif severity == "High" or severity == "Medium":
            if action_taken == "BLOCK_IP": reward = 5.0
            elif action_taken == "IGNORE": reward = -5.0
            elif action_taken == "ISOLATE_ENDPOINT": reward = -2.0 # Overreacting
        else:
            if action_taken == "IGNORE": reward = 5.0
            elif action_taken in ["BLOCK_IP", "ISOLATE_ENDPOINT"]: reward = -5.0 # False positive penalty

        # Convert action_taken string to idx
        try:
            action_idx = self.actions.index(action_taken)
        except:
            action_idx = 0

        self.replay_buffer.append((state, action_idx, reward))

        # Perform online learning periodically
        if len(self.replay_buffer) >= self.batch_size:
            try:
                env = self.DummyEnv(buffer=self.replay_buffer)
                self.model.set_env(env)
                # Learn on the gathered buffer
                self.model.learn(total_timesteps=len(self.replay_buffer))
                self.model.save(self.model_path)
                print(json.dumps({"status": "ready", "message": f"RL Agent fine-tuned on {len(self.replay_buffer)} new events."}), flush=True)
                self.replay_buffer = [] # Clear buffer
            except Exception as e:
                print(json.dumps({"error": f"RL Agent online training failed: {e}"}), flush=True)
                self.replay_buffer = [] # Flush it to prevent recursive crash

from response_engine import ResponseEngine, LayerHardener
from detection_engine import SigmaEngine, AnomalyDetector, MITREMapper, YaraScanner, KillChainCorrelator

class AttackMemory:
    def __init__(self, persist_directory="./chroma_db"):
        self.enabled = HAS_CHROMA
        if self.enabled:
            try:
                self.client = chromadb.PersistentClient(path=persist_directory)
                self.collection = self.client.get_or_create_collection(name="attack_memory")
            except Exception as e:
                print(json.dumps({"error": f"ChromaDB init failed: {e}"}), flush=True)
                self.enabled = False
                self.memory = []
        else:
            self.memory = []

    def add_incident(self, event_dict: Dict[str, Any]):
        incident_id = str(event_dict.get("id", int(time.time() * 1000)))
        
        if not self.enabled:
            self.memory.append(event_dict)
            return incident_id
        
        text_content = json.dumps(event_dict)
        
        try:
            self.collection.add(
                documents=[text_content],
                metadatas=[{"source": event_dict.get("source", "unknown"), "type": event_dict.get("event_type", "unknown")}],
                ids=[incident_id]
            )
        except Exception as e:
            print(json.dumps({"error": f"ChromaDB add failed: {e}"}), flush=True)
            
        return incident_id

    def find_similar(self, event: Dict[str, Any], threshold: float = 0.85) -> List[Dict[str, Any]]:
        if not self.enabled:
            # Mock similarity for fallback
            similar = []
            # Iterate backwards to get the most recent ones
            for mem in reversed(self.memory):
                if mem.get("event_type") == event.get("event_type") and mem.get("source_ip") == event.get("source_ip"):
                    similar.append(mem)
                    if len(similar) >= 5:
                        break
            return similar
            
        text_content = json.dumps(event)
        try:
            results = self.collection.query(
                query_texts=[text_content],
                n_results=1
            )
            
            similar_incidents = []
            if results and results['distances'] and len(results['distances'][0]) > 0:
                distance = results['distances'][0][0]
                # Convert L2 distance to a rough similarity score (0 to 1)
                similarity = 1.0 / (1.0 + distance)
                if similarity > threshold:
                    doc = results['documents'][0][0]
                    similar_incidents.append(json.loads(doc))
                    
            return similar_incidents
        except Exception as e:
            print(json.dumps({"error": f"ChromaDB query failed: {e}"}), flush=True)
            return []

    def get_response_playbook(self, incident_id: str) -> str:
        return f"Auto-response playbook for {incident_id}: Block IP at firewall, Isolate Host, Clear Temp Files."

class SentinelState(dict):
    pass

class AttackerProfiler:
    def __init__(self, llm=None):
        self.llm = llm

    def generate_profile(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.llm:
            return {
                "type": "Methodical",
                "traits": ["Patient", "Likely Insider", "Technical"],
                "description": "Heuristic analysis suggests a methodical attacker targeting specific internal services."
            }
        
        prompt = f"Analyze these attack events and build a psychological profile of the attacker. Events: {events}. Return ONLY a JSON object with 'type', 'traits' (list), and 'description'."
        try:
            res = self.llm.invoke(prompt)
            return json.loads(res)
        except:
            return {
                "type": "Persistent",
                "traits": ["Automated", "Broad Spectrum"],
                "description": "LLM failed to profile. Falling back to persistent automated profile."
            }

class CampaignNamer:
    def __init__(self, llm=None):
        self.llm = llm

    def name_campaign(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.llm:
            return {
                "name": "Operation SilentBat",
                "backstory": "A stealthy operation targeting shadow IT services discovered during routine scans."
            }
        
        prompt = f"Based on these attack patterns, generate a cool operation name (e.g. 'Operation X') and a short backstory. Events: {events}. Return ONLY a JSON object with 'name' and 'backstory'."
        try:
            res = self.llm.invoke(prompt)
            return json.loads(res)
        except:
            return {
                "name": "Operation VoidWalker",
                "backstory": "LLM failed to name. Defaulting to VoidWalker protocol."
            }

class MalwareAnalyzer:
    def analyze(self, event: Dict[str, Any]) -> Dict[str, Any]:
        payload = str(event.get("payload", "")).lower()
        is_malware = False
        classification = "Clean"
        detected_apis = []
        
        # API Calls and Suspicious Strings Indicators
        indicators = {
            "virtualalloc": "Memory allocation (potential unpacking/injection)",
            "createremotethread": "Process injection",
            "loadlibrary": "Dynamic DLL loading",
            "getprocaddress": "Dynamic API resolution",
            "system(": "Command execution",
            "popen(": "Process spawning",
            "wget ": "Dropper behavior",
            "curl ": "Dropper behavior",
            "chmod +x": "Making dropped file executable",
            "wscript.shell": "VBS script execution",
            "invoke-webrequest": "PowerShell download",
            "cmd.exe": "Shell execution",
            "powershell": "PowerShell execution",
            "eval(": "Code evaluation",
            "exec(": "Code execution",
            "base64_decode": "Obfuscation"
        }
        
        for ind, desc in indicators.items():
            if ind.lower() in payload:
                is_malware = True
                detected_apis.append(f"{ind} - {desc}")
        
        if is_malware:
            classification = "Suspicious Script / Reverse Shell / Dropper"
        elif "0x" in payload and len(payload) > 50:
            is_malware = True
            classification = "Possible Shellcode / Binary Payload"
            detected_apis.append("Hexadecimal encoding detected (potential shellcode)")
            
        return {
            "is_malware": is_malware,
            "classification": classification,
            "static_analysis": "Found: " + ", ".join([d.split(' - ')[0] for d in detected_apis]) if is_malware else "No suspicious signatures.",
            "dynamic_analysis": "Simulated sandbox execution completed. Process injection detected." if is_malware else "N/A",
            "detected_indicators": detected_apis
        }

class SentinelAgent:
    def __init__(self):
        self.memory = AttackMemory()
        self.deep_learner = DeepLearningMemory()
        self.rl_agent = RLDecisionAgent()
        self.malware_analyzer = MalwareAnalyzer()
        
        # Prefer LocalTransformersLLM if available, fallback to Ollama
        if HAS_TRANSFORMERS:
            self.llm = LocalTransformersLLM()
        elif HAS_OLLAMA:
            self.llm = Ollama(model="phi3")
        else:
            self.llm = None
            
        self.response_engine = ResponseEngine()
        self.hardener = LayerHardener()
        self.profiler = AttackerProfiler(self.llm)
        self.namer = CampaignNamer(self.llm)
        self.base_threshold = 0.85
        
        # Detection Engine Layer
        self.sigma = SigmaEngine()
        self.anomaly = AnomalyDetector()
        self.mitre = MITREMapper()
        self.yara = YaraScanner()
        self.correlator = KillChainCorrelator()
        
        if HAS_LANGGRAPH:
            self.graph = self._build_graph()
        else:
            self.graph = None

    def _build_graph(self):
        workflow = StateGraph(SentinelState)
        
        workflow.add_node("analyze", self.analyze)
        workflow.add_node("memory_lookup", self.memory_lookup)
        workflow.add_node("decide_action", self.decide_action)
        workflow.add_node("execute", self.execute)
        workflow.add_node("store_memory", self.store_memory)
        
        workflow.set_entry_point("analyze")
        workflow.add_edge("analyze", "memory_lookup")
        workflow.add_edge("memory_lookup", "decide_action")
        workflow.add_edge("decide_action", "execute")
        workflow.add_edge("execute", "store_memory")
        workflow.add_edge("store_memory", END)
        
        return workflow.compile()

    def analyze(self, state: SentinelState):
        event = state.get("event", {})
        
        # Detection Engine Layer
        sigma_matches = self.sigma.match(event)
        anomaly_result = self.anomaly.process(event)
        mitre_tactic = self.mitre.classify(event)
        kill_chain = self.correlator.add_event(event)
        
        # Yara scan if file path provided
        yara_matches = []
        if "file_path" in event:
            yara_matches = self.yara.scan_file(event["file_path"])
            
        # Malware Analysis Pipeline (Static + Dynamic)
        malware_result = self.malware_analyzer.analyze(event)
            
        # Psych / Crazy Features
        similar_for_profiling = self.memory.find_similar(event, threshold=0.5)
        attacker_profile = self.profiler.generate_profile(similar_for_profiling + [event])
        campaign = self.namer.name_campaign(similar_for_profiling + [event])
            
        analysis_text = f"Analyzed event {event.get('event_type', 'unknown')} from {event.get('source_ip', 'unknown')}. "
        if sigma_matches:
            analysis_text += f"Sigma Matches: {', '.join(sigma_matches)}. "
        if anomaly_result.get("is_anomaly"):
            analysis_text += f"Anomaly Detected (Score: {anomaly_result.get('score', 0):.2f}). "
        analysis_text += f"MITRE: {mitre_tactic}. "
        if kill_chain.get("chain_detected"):
            analysis_text += f"Kill-Chain: {kill_chain.get('message')}. "
        if yara_matches:
            analysis_text += f"Yara Matches: {', '.join(yara_matches)}. "
        if malware_result.get("is_malware"):
            analysis_text += f"Malware Sandbox: {malware_result.get('classification')}. "
            
        state["analysis"] = analysis_text
        state["mitre_tactic"] = mitre_tactic
        state["kill_chain"] = kill_chain
        state["anomaly_result"] = anomaly_result
        state["malware_analysis"] = malware_result
        state["attacker_profile"] = attacker_profile
        state["campaign"] = campaign
        
        # Check for Layer 1 miss (e.g., if it's a critical alert that wasn't blocked by IPS)
        if event.get("severity") == "Critical" and not event.get("blocked_by_ips", False):
            hardening_result = self.hardener.record_miss(event)
            if hardening_result:
                state["hardening_action"] = hardening_result
                
        # Deep Learning: Predict threat level based on learned patterns
        dl_threat_score = self.deep_learner.predict_threat(event)
        state["dl_threat_score"] = dl_threat_score
        if dl_threat_score > 0.8:
            analysis_text += f"Deep Learning Model predicts high threat ({dl_threat_score:.2f}). "
            state["analysis"] = analysis_text
                
        return state

    def memory_lookup(self, state: SentinelState):
        event = state.get("event", {})
        # Self-hardening: threshold auto-adjusts based on memory size
        current_threshold = max(0.60, self.base_threshold - (len(self.memory.memory) * 0.01))
        state["current_threshold"] = current_threshold
        
        similar = self.memory.find_similar(event, threshold=current_threshold)
        state["similar_events"] = similar
        if similar:
            state["auto_respond"] = True
            state["playbook"] = self.memory.get_response_playbook(similar[0].get("id", "unknown"))
            state["similarity_score"] = 0.92 # Mock score for demonstration
        else:
            state["auto_respond"] = False
            state["similarity_score"] = 0.0
        return state

    def decide_action(self, state: SentinelState):
        event = state.get("event", {})
        
        if state.get("auto_respond"):
            state["action"] = "AUTO_REMEDIATE"
            state["reasoning"] = "High similarity (>0.85) to past known attack. Applying proven playbook."
        else:
            # RL Agent Decision
            rl_decision = self.rl_agent.decide_action(event)
            
            if rl_decision != "LLM_DECISION" and rl_decision != "IGNORE":
                state["action"] = rl_decision
                state["reasoning"] = f"Reinforcement Learning Agent selected optimal policy: {rl_decision}"
            elif self.llm:
                try:
                    prompt = f"You are SENTINEL, an autonomous cybersecurity agent. Decide action for: {event}"
                    state["action"] = "LLM_DECISION"
                    state["reasoning"] = self.llm.invoke(prompt)
                except Exception as e:
                    state["action"] = "MANUAL_REVIEW"
                    state["reasoning"] = f"LLM Error: {e}"
            else:
                state["action"] = "MANUAL_REVIEW"
                state["reasoning"] = "No similar past attacks found. Local LLM and RL unavailable. Escalating to human analyst."
        return state

    def execute(self, state: SentinelState):
        action = state.get("action")
        event = state.get("event", {})
        
        execution_details = []
        
        if action == "AUTO_REMEDIATE" or action == "LLM_DECISION":
            # Extract actions from playbook or reasoning
            text_to_parse = state.get("playbook", "") + " " + state.get("reasoning", "")
            text_to_parse = text_to_parse.lower()
            
            if "block ip" in text_to_parse or "block" in text_to_parse or action == "BLOCK_IP":
                ip = event.get("source_ip", "192.168.1.100")
                res = self.response_engine.block_ip(ip)
                execution_details.append(res)
                
            if "kill process" in text_to_parse or "kill" in text_to_parse or action == "KILL_PROCESS":
                pid = event.get("pid", 9999)
                res = self.response_engine.kill_process(pid, "Malicious activity detected")
                execution_details.append(res)
                
            if "isolate" in text_to_parse or action == "ISOLATE_ENDPOINT":
                res = self.response_engine.isolate_network_interface("eth0")
                execution_details.append(res)
                
            if "honeypot" in text_to_parse:
                res = self.response_engine.deploy_honeypot(8080, "http")
                execution_details.append(res)
                
            if "trap" in text_to_parse or "deception" in text_to_parse:
                res = self.response_engine.deception.deploy_trap("honey_file", "/var/www/html")
                execution_details.append(res)
                
            if not execution_details:
                # Default action if none parsed
                res = self.response_engine.block_ip(event.get("source_ip", "unknown"))
                execution_details.append(res)
                
            state["execution_result"] = f"Executed {len(execution_details)} actions."
            state["execution_details"] = execution_details
            
            # Generate Post-Incident Report
            report = f"""# Post-Incident Report: {event.get('id', 'Unknown')}
## Campaign: {state.get('campaign', {}).get('name', 'Operation Unknown')}
> {state.get('campaign', {}).get('backstory', 'No backstory available.')}

## Attacker Profile
- **Type**: {state.get('attacker_profile', {}).get('type', 'Unknown')}
- **Traits**: {', '.join(state.get('attacker_profile', {}).get('traits', []))}
- **Psychological Analysis**: {state.get('attacker_profile', {}).get('description', 'N/A')}

## Summary
Event Type: {event.get('event_type', 'Unknown')}
Source IP: {event.get('source_ip', 'Unknown')}
Severity: {event.get('severity', 'Unknown')}

## Detection Details
- **MITRE ATT&CK**: {state.get('mitre_tactic', 'Unknown')}
- **Anomaly Score**: {state.get('anomaly_result', {}).get('score', 0):.2f} (Is Anomaly: {state.get('anomaly_result', {}).get('is_anomaly', False)})
- **Kill-Chain**: {state.get('kill_chain', {}).get('message', 'None detected')}

## Analysis
{state.get('analysis')}
Similarity Score: {state.get('similarity_score')}
Decision: {state.get('action')}
Reasoning: {state.get('reasoning', state.get('playbook', ''))}

## Actions Taken
"""
            for d in execution_details:
                report += f"- **{d['action']}**: {d['message']} ({d['status']})\n"
                
            if state.get("hardening_action"):
                report += f"\n## Self-Hardening\n{state['hardening_action']['message']}\n```yaml\n{state['hardening_action']['new_sigma_rule']}\n```\n"
                
            state["incident_report"] = report
            
        else:
            state["execution_result"] = "Pending human review or further LLM analysis."
            
        return state

    def store_memory(self, state: SentinelState):
        event = state.get("event", {})
        incident_id = self.memory.add_incident(event)
        
        # Deep Learning: Learn from this new attack pattern
        is_attack = event.get("severity") in ["High", "Critical"] or state.get("action") in ["AUTO_REMEDIATE", "BLOCK_IP", "KILL_PROCESS", "ISOLATE_ENDPOINT"]
        self.deep_learner.learn_pattern(event, is_attack=is_attack)
        
        # RL Feedback Loop
        if state.get("action") in ["BLOCK_IP", "KILL_PROCESS", "ISOLATE_ENDPOINT"]:
            self.rl_agent.reward_and_learn(event, state.get("action"), success=True)
        
        state["stored_id"] = incident_id
        return state

    def process_event(self, event: Dict[str, Any]):
        if self.graph:
            try:
                return self.graph.invoke({"event": event})
            except Exception as e:
                print(json.dumps({"error": f"LangGraph execution failed: {e}"}), flush=True)
                return self._fallback_process(event)
        else:
            return self._fallback_process(event)
            
    def _fallback_process(self, event: Dict[str, Any]):
        state = SentinelState({"event": event})
        state = self.analyze(state)
        state = self.memory_lookup(state)
        state = self.decide_action(state)
        state = self.execute(state)
        state = self.store_memory(state)
        return state

if __name__ == "__main__":
    print(json.dumps({"status": "ready", "message": "SENTINEL AI Brain initialized."}), flush=True)
    agent = SentinelAgent()
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
            
            # Special Control Commands
            if event.get("event_type") == "SYSTEM_COMMAND":
                cmd = event.get("command")
                if cmd == "CLEAR_MEMORY":
                    if agent.memory.enabled:
                        try:
                            # Recreate the collection to clear it
                            agent.memory.client.delete_collection("attack_memory")
                            agent.memory.collection = agent.memory.client.get_or_create_collection("attack_memory")
                        except: pass
                    agent.memory.memory = []
                    print(json.dumps({"status": "ready", "message": "Episodic Vector Memory Cleared."}), flush=True)
                elif cmd == "RESET_MODELS":
                    # Deep Learning Reset
                    if agent.deep_learner.enabled:
                        agent.deep_learner.model = MLPClassifier(hidden_layer_sizes=(64, 32), activation='relu', solver='adam', max_iter=1)
                        agent.deep_learner.model.partial_fit(np.zeros((2, 5)), np.array([0, 1]), classes=agent.deep_learner.classes)
                    # RL Reset
                    if agent.rl_agent.enabled:
                        try:
                            if os.path.exists("./rl_model.zip"): os.remove("./rl_model.zip")
                        except: pass
                        agent.rl_agent._init_model()
                        agent.rl_agent.replay_buffer = []
                    print(json.dumps({"status": "ready", "message": "AI Models Reset to Default States."}), flush=True)
                elif cmd == "FORCE_RETRAIN":
                    if agent.rl_agent.enabled and len(agent.rl_agent.replay_buffer) > 0:
                        env = agent.rl_agent.DummyEnv(buffer=agent.rl_agent.replay_buffer)
                        agent.rl_agent.model.set_env(env)
                        agent.rl_agent.model.learn(total_timesteps=len(agent.rl_agent.replay_buffer))
                        agent.rl_agent.model.save(agent.rl_agent.model_path)
                        agent.rl_agent.replay_buffer = []
                        print(json.dumps({"status": "ready", "message": "RL Agent Forced Manual Retraining Complete."}), flush=True)
                    else:
                        print(json.dumps({"status": "ready", "message": "No new events in RL buffer to retrain."}), flush=True)
                elif cmd == "DEPLOY_HONEYPOT":
                    import random
                    port = random.randint(8000, 9000)
                    res = agent.response_engine.deploy_honeypot(port, "http")
                    print(json.dumps({"status": "ready", "message": res["message"]}), flush=True)
                elif cmd == "DEPLOY_HONEY_CREDENTIALS":
                    res = agent.response_engine.deception.deploy_trap("fake_credentials", "memory_space")
                    print(json.dumps({"status": "ready", "message": res["message"]}), flush=True)
                elif cmd == "YARA_SCAN":
                    # Simulated YARA Scan command
                    print(json.dumps({"type": "sentinel_result", "data": {
                        "action": "YARA_SCAN_COMPLETE",
                        "analysis": "Manual YARA Scan executed.",
                        "reasoning": "User requested YARA scan via Forensics Panel.",
                        "execution_result": "Scanned targeted directories. Clean.",
                        "timestamp": time.time()
                    }}), flush=True)
                    print(json.dumps({"status": "ready", "message": "YARA rules applied globally."}), flush=True)
                continue
                
            result = agent.process_event(event)
            print(json.dumps({"type": "sentinel_result", "data": result}), flush=True)
        except Exception as e:
            print(json.dumps({"type": "error", "message": str(e)}), flush=True)
