import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font',
  subsets: ['latin'],
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-code',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Wasabi - Gestão Inteligente',
  description: 'Sua plataforma completa de gestão pessoal e profissional',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/wasabi-v-icon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  )
}
