"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, Send, Bot, Loader2, ChevronDown, Sparkles, RotateCcw, Copy, Check, Zap } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "njiti";

interface Message {
  id: string;
  role: Role;
  content: string;
  time: Date;
  source?: "ai" | "fallback" | "error" | "local";
}

// ── Quick actions — contextual by page path ───────────────────────────────────

const PAGE_QUICK_ACTIONS: Record<string, { label: string; message: string }[]> = {
  "/dashboard/admin": [
    { label: "What needs my attention?", message: "Based on the live data, what should I focus on right now?" },
    { label: "How is revenue this month?", message: "How is revenue looking this month and what does it mean?" },
    { label: "Any urgent issues?", message: "Are there any urgent issues I should know about right now?" },
  ],
  "/dashboard/admin/tenants": [
    { label: "Add a new tenant", message: "Walk me through adding a new tenant step by step." },
    { label: "Transfer a tenant", message: "How do I move a tenant to a different unit?" },
    { label: "Vacate a tenant", message: "How do I process a tenant move-out?" },
  ],
  "/dashboard/admin/payments": [
    { label: "Approve pending payments", message: "How do I verify and approve pending manual payments?" },
    { label: "Record a payment", message: "How do I manually record a payment for a tenant?" },
    { label: "Why is a bill still unpaid?", message: "A tenant paid but their bill still shows unpaid. How do I fix this?" },
  ],
  "/dashboard/admin/deposits": [
    { label: "Process a refund", message: "How do I process a security deposit refund?" },
    { label: "Record damage assessment", message: "How do I record property damage before refunding a deposit?" },
    { label: "Why is deposit still PENDING?", message: "A tenant paid their deposit but it still shows as PENDING. Why?" },
  ],
  "/dashboard/admin/bulk": [
    { label: "Generate this month's bills", message: "How do I generate bills for all tenants this month?" },
    { label: "Send payment reminders", message: "How do I send reminders to tenants with unpaid bills?" },
    { label: "Export arrears report", message: "How do I download a CSV of all outstanding arrears?" },
  ],
  "/dashboard/admin/utilities": [
    { label: "Enter water readings", message: "How do I enter monthly water readings for my tenants?" },
    { label: "Set garbage fee", message: "How do I set the garbage collection fee for my property?" },
  ],
};

const DEFAULT_QUICK_ACTIONS = [
  { label: "What can Njiti do?", message: "What can you help me with?" },
  { label: "How do I add a tenant?", message: "Walk me through adding a new tenant." },
  { label: "Set up payments", message: "How do I set up payment methods for my property?" },
  { label: "Explain the billing cycle", message: "Explain how monthly billing works in this system." },
];

// ── Text formatter — bold, links, numbered/bullet lists ──────────────────────

function FormatText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <span>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.+?)\*\*/g);
        const formatted = parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{part}</strong> : part
        );
        return (
          <span key={i}>
            {formatted}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}

// ── Navigation link extractor ─────────────────────────────────────────────────

function extractLinks(text: string): { href: string; label: string }[] {
  const matches = [...text.matchAll(/\[LINK:\s*([^\|]+)\s*\|\s*([^\]]+)\]/g)];
  return matches.map((m) => ({ label: m[1].trim(), href: m[2].trim() }));
}

function stripLinks(text: string): string {
  return text.replace(/\[LINK:[^\]]+\]/g, "").trim();
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-600 hover:text-gray-400 rounded"
      title="Copy"
    >
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  );
}

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0, 150, 300].map((delay) => (
        <div
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-orange-400/70 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NjitiAgent() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "njiti",
      content: "Habari! I'm **Njiti** — your intelligent guide inside Makeja Homes.\n\nI know this system inside out: tenants, payments, deposits, billing, M-Pesa, Paystack, reports — everything. I also have live data about your portfolio right now.\n\nAsk me anything. No question is too simple or too complex.",
      time: new Date(),
      source: "local",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(isOpen);

  const quickActions = PAGE_QUICK_ACTIONS[pathname] ?? DEFAULT_QUICK_ACTIONS;

  // Auto-scroll
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  // Unread counter
  useEffect(() => {
    if (!isOpen) {
      const njiti = messages.filter((m) => m.role === "njiti");
      if (njiti.length > 1) setUnreadCount((n) => n + 1);
    } else {
      setUnreadCount(0);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || thinking) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text.trim(),
      time: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role === "njiti" ? "assistant" : "user", content: m.content }));

      const res = await fetch("/api/njiti", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          context: pathname,
        }),
      });

      const data = await res.json();
      const reply = data.reply ?? "Sijui — couldn't get a response. Try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: `n_${Date.now()}`,
          role: "njiti",
          content: reply,
          time: new Date(),
          source: data.source ?? "ai",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `n_err_${Date.now()}`,
          role: "njiti",
          content: "Ninaomba msamaha — network issue. Please try again.",
          time: new Date(),
          source: "error",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }, [messages, thinking, pathname]);

  const clearConversation = () => {
    setMessages([
      {
        id: "welcome",
        role: "njiti",
        content: "Conversation cleared. Fresh start — what would you like to know?",
        time: new Date(),
        source: "local",
      },
    ]);
  };

  const isFirstResponse = messages.filter((m) => m.role === "user").length === 0;

  return (
    <>
      {/* ── Floating button ── */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open Njiti"
        >
          <div className="relative w-14 h-14 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-2xl shadow-2xl shadow-orange-900/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150">
            <Bot className="w-7 h-7 text-white" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-[#0f0f0f] animate-pulse" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -left-2 min-w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1 border-2 border-[#0f0f0f]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 border border-gray-700/80 rounded-xl text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-xl pointer-events-none">
            <div className="flex items-center gap-1.5">
              <Zap size={10} className="text-orange-400" />
              Njiti — Ask me anything
            </div>
          </div>
        </button>
      )}

      {/* ── Chat window ── */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-[#111111] border border-gray-800/80 rounded-2xl shadow-2xl shadow-black/80 transition-all duration-200 ease-in-out ${
            isMinimized ? "w-[320px] h-14" : "w-[380px] h-[580px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 h-14 rounded-t-2xl flex-shrink-0 bg-gradient-to-r from-orange-600/10 via-red-600/5 to-transparent border-b border-gray-800/80">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-900/40">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#111111]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-tight">Njiti</span>
                <Sparkles className="w-3 h-3 text-orange-400" />
                <span className="text-[9px] text-orange-400/70 font-medium uppercase tracking-widest">AI</span>
              </div>
              {!isMinimized && (
                <p className="text-[10px] text-gray-500">
                  {thinking ? (
                    <span className="text-orange-400/80 animate-pulse">Thinking...</span>
                  ) : (
                    "Powered by Claude · Always online"
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isMinimized && messages.length > 2 && (
                <button
                  onClick={clearConversation}
                  title="Clear conversation"
                  className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800/50"
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                onClick={() => setIsMinimized((v) => !v)}
                className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800/50"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMinimized ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800/50"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scroll-smooth">
                {messages.map((msg) => {
                  if (msg.role === "user") {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-orange-600 to-orange-700 text-white text-sm leading-relaxed shadow-lg shadow-orange-900/30">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  const body = stripLinks(msg.content);
                  const links = extractLinks(msg.content);

                  return (
                    <div key={msg.id} className="flex gap-2.5 items-start group">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-orange-900/30">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-gray-200 leading-relaxed">
                          <FormatText text={body} />
                        </div>

                        {links.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {links.map((link) => (
                              <a
                                key={link.href}
                                href={link.href}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/25 rounded-lg text-xs text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all"
                              >
                                {link.label} →
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[9px] text-gray-700">
                            {msg.time.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.source === "ai" && <Sparkles size={8} className="text-orange-500/50" />}
                          <CopyButton text={body} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {thinking && (
                  <div className="flex gap-2.5 items-start">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl rounded-tl-sm px-3.5 py-3">
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions — shown only before first user message */}
              {isFirstResponse && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {quickActions.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => sendMessage(qa.message)}
                      className="px-2.5 py-1 bg-gray-800/60 border border-gray-700/50 rounded-xl text-xs text-gray-400 hover:text-gray-200 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all duration-150"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3 flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/50 focus-within:border-orange-500/40 focus-within:bg-gray-800/80 rounded-xl px-3 py-2.5 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                      }
                    }}
                    placeholder="Ask Njiti anything..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                    disabled={thinking}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || thinking}
                    className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-md shadow-orange-900/30"
                  >
                    <Send size={13} />
                  </button>
                </div>
                <p className="text-[9px] text-gray-700 mt-1.5 text-center">
                  Njiti · Makeja Homes · Powered by Claude
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
