import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wasabi - Gestão Inteligente',
  description: 'Sua plataforma completa de gestão pessoal e profissional',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/wasabi-v-icon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  )
}
