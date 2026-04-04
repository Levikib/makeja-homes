import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-400 mb-6 leading-none">
          404
        </div>
        <h1 className="text-white text-2xl font-bold mb-3">Page Not Found</h1>
        <p className="text-gray-400 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/dashboard/admin"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="bg-transparent border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-6 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
