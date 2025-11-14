import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">
          Welcome to Mizpha Rentals
        </h1>
        <p className="text-xl text-center text-muted-foreground">
          Property Management System
        </p>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button size="lg">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline">Register</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
