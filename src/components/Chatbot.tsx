import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Bot, User, X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

interface ChatbotProps {
  contextData: any;
  onClearContext: () => void;
  autoSend?: boolean;
}

export default function Chatbot({ contextData, onClearContext, autoSend }: ChatbotProps) {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const hasAutoSent = useRef(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (contextData && autoSend && !hasAutoSent.current && !isLoading) {
      hasAutoSent.current = true;
      const prompt = `Please analyze this incident: ${JSON.stringify(contextData)}`;
      handleSend(undefined, prompt);
    }
  }, [contextData, autoSend, isLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const loadHistory = async () => {
    try {
      const res = await api.getChatHistory();
      setChatHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load chat history:", err.response?.status, err.response?.data);
    }
  };

  const handleSend = async (e?: React.FormEvent | React.KeyboardEvent, overridePrompt?: string) => {
    e?.preventDefault();
    const promptToSend = overridePrompt || message;
    if (!promptToSend.trim() || isLoading) return;

    const userContent = promptToSend;
    const userMsg = { role: 'user', content: userContent, created_at: new Date().toISOString() };
    setChatHistory(prev => [...prev, userMsg]);
    setMessage('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // 1. Save user message to history
      await api.saveChatHistory('user', userContent);

      // 2. Get context if needed
      let contextDataToUse = contextData;
      if (contextData && contextData.id && !contextData.source_ip) {
        // If it's an alert without log details, try to fetch full context
        try {
          const contextRes = await api.getChatContext(contextData.id);
          contextDataToUse = contextRes.data;
        } catch (e) {
          console.error("Failed to fetch full context", e);
        }
      }

      // 3. Call Gemini
      const systemPrompt = `You are CyberSOC, an expert AI security analyst assistant embedded in a Security Operations Center platform. You analyze log anomalies, explain attack patterns, and suggest mitigation strategies. Be concise, precise, and use security terminology correctly. Format responses in clear sections when explaining incidents. Never hallucinate IP addresses or usernames — only reference data provided to you. You can search historical chat data using the searchChatHistory tool to find relevant past conversations or analyses. You can also fetch recent alerts and alert details using the provided tools.`;

      const searchChatHistoryFunctionDeclaration: FunctionDeclaration = {
        name: "searchChatHistory",
        description: "Search past chat history for relevant conversations, alerts, or system events.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "The search query to find in the chat history.",
            },
          },
          required: ["query"],
        },
      };

      const getRecentAlertsFunctionDeclaration: FunctionDeclaration = {
        name: "getRecentAlerts",
        description: "Get a list of recent security alerts.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            limit: {
              type: Type.NUMBER,
              description: "The number of alerts to retrieve (default 10).",
            },
          },
        },
      };

      const getRecentLogsFunctionDeclaration: FunctionDeclaration = {
        name: "getRecentLogs",
        description: "Get a list of recent system logs.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            limit: {
              type: Type.NUMBER,
              description: "The number of logs to retrieve (default 10).",
            },
          },
        },
      };

      const getAlertDetailsFunctionDeclaration: FunctionDeclaration = {
        name: "getAlertDetails",
        description: "Get detailed information and context for a specific alert ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            alertId: {
              type: Type.NUMBER,
              description: "The ID of the alert to retrieve details for.",
            },
          },
          required: ["alertId"],
        },
      };

      let prompt = userContent;
      if (contextDataToUse) {
        prompt = `ALERT CONTEXT:\n${JSON.stringify(contextDataToUse, null, 2)}\n---\nUSER MESSAGE: ${prompt}`;
      }

      const history = chatHistory.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        history: history,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: [searchChatHistoryFunctionDeclaration, getRecentAlertsFunctionDeclaration, getRecentLogsFunctionDeclaration, getAlertDetailsFunctionDeclaration] }],
        }
      });

      let response = await chat.sendMessage({ message: prompt });

      let callCount = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && callCount < 3) {
        const functionResponses = [];

        for (const call of response.functionCalls) {
          let functionResponseData: any = { error: "Function not found" };

          try {
            if (call.name === "searchChatHistory") {
              const query = call.args.query as string;
              const searchRes = await api.searchChatHistory(query);
              functionResponseData = searchRes.data;
            } else if (call.name === "getRecentAlerts") {
              const limit = (call.args.limit as number) || 10;
              const alertsRes = await api.getAlerts({ limit });
              functionResponseData = alertsRes.data;
            } else if (call.name === "getRecentLogs") {
              const limit = (call.args.limit as number) || 10;
              const logsRes = await api.getLogs({ limit });
              functionResponseData = logsRes.data;
            } else if (call.name === "getAlertDetails") {
              const alertId = call.args.alertId as number;
              const contextRes = await api.getChatContext(alertId);
              functionResponseData = contextRes.data;
            }
          } catch (e: any) {
            console.error(`Error executing function ${call.name}:`, e);
            functionResponseData = { error: e.message || "Failed to execute function" };
          }

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: functionResponseData }
            }
          });
        }

        response = await chat.sendMessage({
          message: functionResponses
        } as any);
        
        callCount++;
      }

      let aiContent = response.text;
      if (!aiContent) {
        if (response.functionCalls && response.functionCalls.length > 0) {
          aiContent = "I have gathered the necessary data but need more specific instructions to analyze it further. What would you like to know?";
        } else {
          aiContent = "I have analyzed the data. Let me know if you need specific details.";
        }
      }

      // 4. Save AI message to history
      await api.saveChatHistory('assistant', aiContent);

      const aiMsg = { role: 'assistant', content: aiContent, created_at: new Date().toISOString() };
      setChatHistory(prev => [...prev, aiMsg]);
      
      if (contextData) onClearContext();
    } catch (err) {
      console.error("Chat error:", err);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "Error: Failed to connect to CyberSOC AI. Please ensure your Gemini API key is configured correctly.", 
        created_at: new Date().toISOString() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const starterPrompts = [
    "Summarize today's alerts",
    "Explain the latest critical alert",
    "What IPs should I block?",
    "How do I stop brute force attacks?"
  ];

  return (
    <div className="h-[calc(100vh-120px)] w-full max-w-5xl mx-auto flex flex-col">
      <div className="bg-soc-surface border border-soc-border rounded-2xl shadow-2xl flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-soc-purple/10 border-b border-soc-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-soc-purple rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-soc-text">CyberSOC AI Analyst</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-soc-green rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="text-xs text-soc-muted uppercase font-bold tracking-wider">Online & Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-soc-bg/30">
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-24 h-24 bg-soc-purple/10 rounded-3xl flex items-center justify-center mb-6 neon-border-blue">
                <Sparkles className="w-12 h-12 text-soc-purple" />
              </div>
              <h4 className="text-2xl font-bold text-soc-text mb-3">Welcome to CyberSOC AI</h4>
              <p className="text-soc-muted mb-8 max-w-md">I'm your advanced security analyst assistant. I can analyze alerts, search logs, and provide remediation steps.</p>
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                {starterPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setMessage(prompt); }}
                    className="text-left p-4 text-sm bg-soc-surface border border-soc-border rounded-xl hover:border-soc-purple hover:bg-soc-purple/5 transition-all shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${
                  msg.role === 'user' ? 'bg-soc-blue' : 'bg-soc-surface border border-soc-border'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-soc-purple" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user' ? 'bg-soc-blue text-white rounded-tr-none' : 'bg-soc-surface border border-soc-border text-soc-text rounded-tl-none'
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-soc-surface border border-soc-border flex items-center justify-center shadow-md">
                  <Bot className="w-5 h-5 text-soc-purple" />
                </div>
                <div className="p-4 bg-soc-surface border border-soc-border rounded-2xl rounded-tl-none flex gap-2 items-center shadow-sm">
                  <div className="w-2 h-2 bg-soc-purple rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-soc-purple rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-soc-purple rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-6 border-t border-soc-border bg-soc-surface">
          {contextData && (
            <div className="mb-4 p-3 bg-soc-blue/10 border border-soc-blue/30 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-soc-blue" />
                <span className="text-xs font-bold text-soc-blue uppercase tracking-wider">Analyzing Context: {contextData.id ? `Alert #${contextData.id}` : 'Log Event'}</span>
              </div>
              <button type="button" onClick={onClearContext} className="text-soc-blue hover:text-soc-red transition-colors p-1 rounded-md hover:bg-soc-red/10">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask CyberSOC AI..."
              className="w-full bg-soc-bg border border-soc-border rounded-xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:border-soc-purple focus:ring-1 focus:ring-soc-purple transition-all resize-none h-14 shadow-inner"
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="absolute right-2 top-2 p-2.5 bg-soc-purple text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-md hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
