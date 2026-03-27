import { ReactNode } from 'react'
import Header from './Header'
import Navigation from './Navigation'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
