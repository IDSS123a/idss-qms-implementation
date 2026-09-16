import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IDSS-QMS · Quality Management System',
  description: 'Bilingual ISO 9001:2015 quality management workspace for controlled documents, audits, training, and CAPA.',
  generator: 'IDSS-QMS',
  icons: {
    icon: [{ url: '/idss-logo.png', type: 'image/png' }],
    shortcut: '/idss-logo.png',
    apple: '/idss-logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
