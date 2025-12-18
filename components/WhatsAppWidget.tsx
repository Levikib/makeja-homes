"use client";

import { MessageCircle } from "lucide-react";

export default function WhatsAppWidget() {
  const whatsappNumber = "254796809106";
  const message = "Hi! I'm interested in Makeja Homes property management system.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    
     <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 w-16 h-16 bg-green-500 rounded-full shadow-lg hover:shadow-xl hover:shadow-green-500/50 transition-all flex items-center justify-center group"
      title="Chat on WhatsApp"
    >
      <MessageCircle className="w-8 h-8 text-white group-hover:scale-110 transition" />
    </a>
  );
}