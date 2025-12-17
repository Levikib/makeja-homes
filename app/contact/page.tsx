import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <LandingNav />

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Get In Touch
            </h1>
            <p className="text-xl text-gray-400">
              Have questions? We'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a href="mailto:hello@makejahomes.co.ke" className="text-gray-400 hover:text-purple-400">
                        hello@makejahomes.co.ke
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <a href="tel:+254700000000" className="text-gray-400 hover:text-purple-400">
                        +254 796 809 106
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Location</h3>
                      <p className="text-gray-400">
                        Nairobi, Kenya
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-black">
                <h3 className="font-semibold mb-2">Business Hours</h3>
                <p className="text-gray-400 text-sm">
                  Monday - Friday: 9:00 AM - 6:00 PM<br />
                  Saturday: 10:00 AM - 4:00 PM<br />
                  Sunday: Closed
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="p-8 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-black">
              <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
              
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 rounded-lg bg-black border border-purple-500/30 focus:border-purple-500 focus:outline-none transition"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 rounded-lg bg-black border border-purple-500/30 focus:border-purple-500 focus:outline-none transition"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className="w-full px-4 py-3 rounded-lg bg-black border border-purple-500/30 focus:border-purple-500 focus:outline-none transition"
                    placeholder="+254 700 000 000"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg bg-black border border-purple-500/30 focus:border-purple-500 focus:outline-none transition resize-none"
                    placeholder="Tell us about your property management needs..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition flex items-center justify-center space-x-2"
                >
                  <span>Send Message</span>
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}