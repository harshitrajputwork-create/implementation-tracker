import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Implementation Tracker — Taqtics',
  description: 'Track client implementation progress across the 30-day onboarding plan',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
