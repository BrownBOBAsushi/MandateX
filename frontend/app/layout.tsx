import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MandateX',
  description: 'Agent payment permission for x402',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
