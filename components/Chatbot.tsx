"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type Message = {
  text: string;
  sender: "user" | "bot";
};

const FAQ_RESPONSES: { [key: string]: string } = {
  // Greetings
  hello: "Hi there! 👋 Welcome to Makeja Homes. How can I help you today?",
  hi: "Hello! 👋 I'm here to help. What would you like to know about Makeja Homes?",
  
  // Features
  features: "Makeja Homes offers:\n\n✅ Multi-property management\n✅ Tenant lifecycle management\n✅ M-Pesa payment integration\n✅ Automated lease agreements\n✅ Maintenance tracking\n✅ Financial reporting\n\nWhich feature interests you?",
  
  // Pricing
  pricing: "Our pricing plans:\n\n💎 Basic: KSH 4,999/mo (50 units, 3 properties)\n🚀 Pro: KSH 9,999/mo (200 units, unlimited properties)\n⭐ Enterprise: KSH 24,999/mo (unlimited everything)\n\n14-day free trial available!",
  price: "Our pricing plans:\n\n💎 Basic: KSH 4,999/mo (50 units, 3 properties)\n🚀 Pro: KSH 9,999/mo (200 units, unlimited properties)\n⭐ Enterprise: KSH 24,999/mo (unlimited everything)\n\n14-day free trial available!",
  cost: "Our pricing plans:\n\n💎 Basic: KSH 4,999/mo (50 units, 3 properties)\n🚀 Pro: KSH 9,999/mo (200 units, unlimited properties)\n⭐ Enterprise: KSH 24,999/mo (unlimited everything)\n\n14-day free trial available!",
  
  // Payments
  mpesa: "Yes! We integrate directly with M-Pesa for seamless rent payments. Tenants can pay via M-Pesa and payments are automatically tracked in your dashboard. 💰",
  payment: "We support M-Pesa payments! Tenants can pay rent directly via M-Pesa, and all payments are automatically reconciled in your dashboard. 💳",
  
  // Getting Started
  start: "Getting started is easy!\n\n1️⃣ Create your account\n2️⃣ Add your properties\n3️⃣ Add tenants and units\n4️⃣ Start managing!\n\n14-day free trial, no credit card required. Want to sign up?",
  signup: "Ready to get started? Click the 'Get Started' button at the top right, or visit our registration page. You'll have your account set up in minutes! 🚀",
  register: "Ready to get started? Click the 'Get Started' button at the top right, or visit our registration page. You'll have your account set up in minutes! 🚀",
  
  // Support
  support: "Need help? You can:\n\n📧 Email: makejahomes@gmail.com\n📱 WhatsApp: +254796809106\n💬 Or continue chatting with me here!\n\nWhat can I help you with?",
  help: "I'm here to help! You can ask me about:\n\n• Features\n• Pricing\n• Getting started\n• Payments\n• Technical support\n\nOr contact us directly via WhatsApp or email!",
  contact: "Get in touch with us:\n\n📧 Email: makejahomes@gmail.com\n📱 WhatsApp: +254796809106\n\nOr use the contact form on this page!",
  
  // Technical
  demo: "We have demo videos coming soon! In the meantime, our 14-day free trial lets you explore all features hands-on. Want to sign up?",
  trial: "Yes! We offer a 14-day free trial with full access to all features. No credit card required. Try it risk-free! 🎉",
  
  // Default
  default: "I'm not sure about that, but I'm here to help! You can:\n\n• Ask about our features\n• Check pricing\n• Learn how to get started\n• Contact support\n\nOr reach us directly:\n📱 WhatsApp: +254796809106\n📧 makejahomes@gmail.com",
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hi! I'm the Makeja Homes assistant. Ask me anything about property management, pricing, or features! 🏠",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for keyword matches
    for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }
    
    return FAQ_RESPONSES.default;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);

    // Get bot response
    setTimeout(() => {
      const botResponse: Message = {
        text: getBotResponse(input),
        sender: "bot",
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 500);

    setInput("");
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:shadow-xl hover:shadow-purple-500/50 transition-all flex items-center justify-center group"
        >
          <MessageCircle className="w-8 h-8 text-white group-hover:scale-110 transition" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></span>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-black border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Makeja Assistant</h3>
                <p className="text-purple-100 text-xs">Online • Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-purple-950/20 border border-purple-500/20 text-gray-200"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-purple-500/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 bg-purple-950/20 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={handleSend}
                className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Powered by Makeja Homes AI
            </p>
          </div>
        </div>
      )}
    </>
  );
}