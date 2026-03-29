import { ReactNode } from 'react'
import Header from './Header'
import Navigation from './Navigation'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    // h-screen + flex-col so the main area gets exactly the remaining height
    <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      <Header />
      <Navigation />
      {/* flex-1 + min-h-0 lets children (Dashboard) fill the remaining space */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
