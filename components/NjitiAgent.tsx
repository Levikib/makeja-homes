"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Loader2, ChevronDown, Sparkles } from "lucide-react";

type Message = {
  id: string;
  text: string;
  sender: "user" | "njiti";
  time: Date;
};

type QuickAction = {
  label: string;
  message: string;
};

// Quick actions — vary by context. These always appear on open.
const QUICK_ACTIONS: QuickAction[] = [
  { label: "How do I add a tenant?", message: "How do I add a new tenant?" },
  { label: "Record a payment", message: "How do I record a manual payment?" },
  { label: "Switch tenant unit", message: "How does unit transfer work?" },
  { label: "Generate bills", message: "How do I generate monthly bills?" },
];

// Intent-based response engine — maps intents to answers with action hints
type Intent = {
  patterns: string[];
  response: string;
  actions?: { label: string; href: string }[];
};

const INTENTS: Intent[] = [
  // --- Navigation ---
  {
    patterns: ["add tenant", "new tenant", "create tenant", "register tenant", "onboard tenant"],
    response: "To add a new tenant:\n1. Go to **Properties** → select a property\n2. Click on a vacant unit\n3. Click **Assign Tenant** and fill in the details\n4. A PENDING lease is created automatically — use **Send Contract** to email it for signing.",
    actions: [{ label: "Go to Tenants", href: "/dashboard/admin/tenants" }],
  },
  {
    patterns: ["add property", "new property", "create property"],
    response: "To add a property:\n1. Go to **Properties** → click **New Property**\n2. Fill in the name, address, and type\n3. Then add units inside the property page.",
    actions: [{ label: "New Property", href: "/dashboard/admin/properties/new" }],
  },
  {
    patterns: ["add unit", "new unit", "create unit"],
    response: "Units are created inside a property. Go to **Properties**, open a property, then click **Add Unit**. You can set the unit type, rent amount, and deposit.",
    actions: [{ label: "Properties", href: "/dashboard/admin/properties" }],
  },
  {
    patterns: ["record payment", "manual payment", "add payment", "log payment", "mark paid"],
    response: "To record a payment manually:\n1. Go to **Finance → Payments**\n2. Click **Record Payment**\n3. Select the tenant, enter amount, payment method and date\n4. The payment is recorded as COMPLETED instantly.",
    actions: [{ label: "Payments", href: "/dashboard/admin/payments" }],
  },
  {
    patterns: ["switch unit", "move tenant", "transfer unit", "change unit"],
    response: "To transfer a tenant to another unit:\n1. Go to **Tenants** and open the tenant\n2. Click **Switch Unit**\n3. A 3-step wizard guides you: pick the new unit, configure rent/deposit/date, then confirm\n4. The tenant receives a new lease by email automatically.",
    actions: [{ label: "Tenants", href: "/dashboard/admin/tenants" }],
  },
  {
    patterns: ["generate bill", "monthly bill", "create bill", "billing"],
    response: "To generate monthly bills:\n1. Go to **Finance → Utilities**\n2. Click **Generate Bills** for the month\n3. Bills include rent + water + garbage + recurring charges automatically.",
    actions: [{ label: "Utilities", href: "/dashboard/admin/utilities" }],
  },
  {
    patterns: ["send contract", "sign lease", "lease agreement", "send lease"],
    response: "To send a lease for signing:\n1. Go to **Tenants** → open the tenant\n2. On the Lease section, click **Send Contract**\n3. The tenant receives an email with a unique signing link\n4. Once signed, the lease becomes ACTIVE and the unit becomes OCCUPIED.",
    actions: [{ label: "Leases", href: "/dashboard/admin/leases" }],
  },
  {
    patterns: ["vacate", "move out", "tenant leaving", "notice", "vacate notice"],
    response: "To process a vacate:\n1. Go to **Properties → Vacate Notices** or open the tenant\n2. Click **Initiate Vacate**\n3. Set the notice date and reason\n4. Then schedule a damage assessment and process deposit refund.",
    actions: [{ label: "Vacate Notices", href: "/dashboard/admin/vacate" }],
  },
  {
    patterns: ["maintenance", "repair", "work order", "raise request"],
    response: "Maintenance requests flow:\n• **Tenants** raise requests from their dashboard\n• **Caretakers** are assigned requests\n• Workflow: PENDING → ASSIGNED → IN_PROGRESS → COMPLETED\n• Admins can view and manage all requests under **Operations → Maintenance**.",
    actions: [{ label: "Maintenance", href: "/dashboard/maintenance" }],
  },
  {
    patterns: ["inventory", "stock", "supplies", "materials"],
    response: "Inventory is managed under **Operations → Inventory**. You can:\n• Add items with SKU, category, and min stock level\n• Adjust quantities (add/use/damage)\n• Create Purchase Orders when stock is low.",
    actions: [{ label: "Inventory", href: "/dashboard/inventory" }],
  },
  {
    patterns: ["expense", "expenditure", "cost", "record expense"],
    response: "To record an expense:\n1. Go to **Finance → Expenses**\n2. Click **New Expense**\n3. Select category, property, amount and date\n4. Expenses feed into the Reports for profit/loss analysis.",
    actions: [{ label: "Expenses", href: "/dashboard/admin/expenses" }],
  },
  {
    patterns: ["report", "analytics", "revenue", "summary"],
    response: "Reports are under **Reports → Reports**. You'll find:\n• Revenue summary\n• Occupancy rate\n• Payment collection rates\n• Expense breakdowns\nFor AI-powered analysis, check **Reports → Insights**.",
    actions: [
      { label: "Reports", href: "/dashboard/admin/reports" },
      { label: "Insights", href: "/dashboard/admin/insights" },
    ],
  },
  {
    patterns: ["audit", "log", "activity", "history", "who did"],
    response: "The **Audit Log** (under **Reports → Audit Log**) records all key actions: payments recorded/approved, tenant creation, unit transfers, lease events. You can filter by action type.",
    actions: [{ label: "Audit Log", href: "/dashboard/admin/audit" }],
  },
  {
    patterns: ["water", "water reading", "water bill", "utility"],
    response: "Water billing:\n1. Go to **Finance → Utilities**\n2. Enter the monthly water reading per unit\n3. The system calculates consumption and generates a bill automatically based on the rate set in property settings.",
    actions: [{ label: "Utilities", href: "/dashboard/admin/utilities" }],
  },
  {
    patterns: ["recurring", "auto charge", "automatic", "standing charge"],
    response: "Recurring charges (parking, internet, service fees) are set up under **Finance → Recurring Charges**. They're applied automatically when generating monthly bills.",
    actions: [{ label: "Recurring Charges", href: "/dashboard/admin/recurring-charges" }],
  },
  {
    patterns: ["deposit", "security deposit", "refund deposit"],
    response: "Security deposits are tracked per tenant. During move-out:\n1. Schedule a damage assessment\n2. Record any deductions\n3. Process the refund under the tenant's vacate workflow\nThe system tracks the full deposit lifecycle.",
  },
  {
    patterns: ["user", "add user", "create user", "staff", "caretaker", "manager"],
    response: "To add a staff member:\n1. Go to **People → Users → New User**\n2. Assign role: MANAGER, CARETAKER, STOREKEEPER, or TECHNICAL\n3. They receive a welcome email with login credentials.",
    actions: [{ label: "Users", href: "/dashboard/admin/users" }],
  },
  {
    patterns: ["settings", "configure", "setup", "company settings"],
    response: "System settings are under **People → Settings**. You can configure:\n• Company name and logo\n• Default payment methods (M-Pesa, bank transfer, etc.)\n• Email notification preferences",
    actions: [{ label: "Settings", href: "/dashboard/admin/settings" }],
  },
  {
    patterns: ["mpesa", "m-pesa", "mobile money", "payment method"],
    response: "M-Pesa (Daraja API) is integrated for STK Push payments. Tenants can pay from their dashboard with one tap. Payments are automatically reconciled via callback. Enable M-Pesa in **Settings → Property Payment Settings**.",
  },
  {
    patterns: ["dashboard", "home", "overview", "stats"],
    response: "Your dashboard shows live stats: total revenue, occupancy rate, pending payments, active leases, and recent activity. It updates in real-time. For deeper analytics go to **Reports → Insights**.",
    actions: [{ label: "Dashboard", href: "/dashboard/admin" }],
  },
  {
    patterns: ["tax", "kra", "vat", "compliance", "withholding"],
    response: "Tax module is under **Reports → Tax & Compliance**. It calculates:\n• VAT on service charges\n• Withholding tax on payments\n• KRA-ready summaries for filing",
    actions: [{ label: "Tax & Compliance", href: "/dashboard/admin/tax" }],
  },
  {
    patterns: ["bulk", "multiple", "batch", "mass"],
    response: "Bulk operations (under **Tenants → Bulk Operations**) let you:\n• Generate bills for all tenants at once\n• Send reminders in bulk\n• Apply bulk rent adjustments",
    actions: [{ label: "Bulk Operations", href: "/dashboard/admin/bulk" }],
  },
  // --- General help ---
  {
    patterns: ["help", "what can you do", "assist", "guide"],
    response: "I'm **Njiti Agent** — your guide inside Makeja Homes. I can help you:\n• Navigate to any section\n• Explain how features work\n• Guide you through workflows step by step\n\nJust ask naturally — e.g. *\"how do I send a lease?\"* or *\"where are reports?\"*",
  },
  {
    patterns: ["hello", "hi", "hey", "good morning", "good afternoon", "jambo"],
    response: "Habari! 👋 I'm **Njiti**, your Makeja Homes assistant. Ask me anything about using the system — navigation, workflows, billing, tenants, maintenance — I've got you.",
  },
  {
    patterns: ["thank", "thanks", "asante"],
    response: "Karibu sana! 🙌 If you need anything else, just ask.",
  },
];

function getResponse(input: string): { text: string; actions?: { label: string; href: string }[] } {
  const lower = input.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.patterns.some((p) => lower.includes(p))) {
      return { text: intent.response, actions: intent.actions };
    }
  }
  return {
    text: "I'm not sure about that specifically, but I can help you with:\n\n• **Adding tenants, units, properties**\n• **Recording payments**\n• **Sending lease contracts**\n• **Maintenance workflows**\n• **Reports & analytics**\n\nTry rephrasing, or type **help** to see what I can do.",
  };
}

function formatMessage(text: string): React.ReactNode {
  // Bold **text** and newlines
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function NjitiAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Habari! I'm **Njiti**, your Makeja Homes guide. Ask me how to do anything in the system — I'm here to make sure you never get stuck. 🏠",
      sender: "njiti",
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text, sender: "user", time: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      const { text: responseText, actions } = getResponse(text);
      const njiti: Message = {
        id: (Date.now() + 1).toString(),
        text: actions
          ? responseText + "\n\n__actions__" + JSON.stringify(actions)
          : responseText,
        sender: "njiti",
        time: new Date(),
      };
      setMessages((m) => [...m, njiti]);
      setThinking(false);
    }, 600 + Math.random() * 400);
  };

  const parseMessage = (text: string) => {
    const [body, actionsStr] = text.split("\n\n__actions__");
    let actions: { label: string; href: string }[] | null = null;
    try { if (actionsStr) actions = JSON.parse(actionsStr); } catch {}
    return { body, actions };
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open Njiti Agent"
        >
          <div className="relative w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl shadow-orange-900/40 flex items-center justify-center hover:scale-105 transition-transform">
            <Bot className="w-7 h-7 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Njiti Agent
          </div>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 w-[360px] bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl shadow-black/60 flex flex-col transition-all duration-200 ${isMinimized ? "h-14" : "h-[520px]"}`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 h-14 bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-gray-800 rounded-t-2xl flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">Njiti Agent</span>
                <Sparkles className="w-3 h-3 text-orange-400" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-gray-400">Always online</span>
              </div>
            </div>
            <button
              onClick={() => setIsMinimized((v) => !v)}
              className="text-gray-500 hover:text-gray-300 transition p-1"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-300 transition p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  if (msg.sender === "user") {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[80%] px-3 py-2 rounded-xl bg-orange-600/80 text-white text-sm">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }
                  const { body, actions } = parseMessage(msg.text);
                  return (
                    <div key={msg.id} className="flex gap-2.5 items-start">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 text-sm text-gray-200 leading-relaxed">
                          {formatMessage(body)}
                        </div>
                        {actions && actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {actions.map((a) => (
                              <a
                                key={a.href}
                                href={a.href}
                                className="px-2.5 py-1 bg-orange-500/15 border border-orange-500/30 rounded-lg text-xs text-orange-400 hover:bg-orange-500/25 transition-colors"
                              >
                                {a.label} →
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {thinking && (
                  <div className="flex gap-2.5 items-start">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2">
                      <div className="flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions */}
              {messages.length === 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => send(qa.message)}
                      className="px-2.5 py-1 bg-gray-800/60 border border-gray-700/50 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3 flex-shrink-0">
                <div className="flex gap-2 bg-gray-800/50 border border-gray-700/60 rounded-xl px-3 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send(input)}
                    placeholder="Ask Njiti anything..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim() || thinking}
                    className="text-orange-500 hover:text-orange-400 disabled:opacity-30 transition-colors"
                  >
                    {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-700 mt-1.5 text-center">Njiti Agent · Makeja Homes</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
