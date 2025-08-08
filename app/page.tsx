import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, Zap, Shield, Rocket } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <Brain className="w-20 h-20 text-primary" />
          </div>
          
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            Brain Nucleus
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            A modern fullstack starter template for building scalable business applications with Next.js, TypeScript, and Supabase.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Zap className="w-12 h-12 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Rapid Development</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Built for speed with Server Components and Server Actions
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Shield className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure by Default</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Row Level Security and middleware protection out of the box
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Rocket className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Production Ready</h3>
              <p className="text-gray-600 dark:text-gray-400">
                TypeScript, validation, and deployment configurations included
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}