import { Zap } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Zap className="h-16 w-16 text-purple-500 animate-pulse mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Loading...</p>
      </div>
    </div>
  );
}
