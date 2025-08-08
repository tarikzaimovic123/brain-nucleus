import './globals.css'
import { BladeStackProvider } from '@/lib/contexts/blade-stack-context'

export const metadata = {
  title: 'Brain Nucleus',
  description: 'Brain Nucleus Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <BladeStackProvider>
          {children}
        </BladeStackProvider>
      </body>
    </html>
  )
}