"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-white font-bold text-xl">Makeja Homes</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-300 hover:text-purple-400 transition">
              Features
            </Link>
            <Link href="#how-it-works" className="text-gray-300 hover:text-purple-400 transition">
              How It Works
            </Link>
            <Link href="/contact" className="text-gray-300 hover:text-purple-400 transition">
              Contact
            </Link>
            <Link 
              href="/auth/login" 
              className="text-gray-300 hover:text-purple-400 transition"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-black/95 border-t border-purple-500/20">
          <div className="px-4 pt-2 pb-4 space-y-3">
            <Link
              href="#features"
              className="block text-gray-300 hover:text-purple-400 py-2"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="block text-gray-300 hover:text-purple-400 py-2"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="/contact"
              className="block text-gray-300 hover:text-purple-400 py-2"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            <Link
              href="/auth/login"
              className="block text-gray-300 hover:text-purple-400 py-2"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg text-center"
              onClick={() => setIsOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}