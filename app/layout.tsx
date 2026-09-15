import type { Metadata } from 'next'
import './tokens.css'
import { cooper, specialElite } from './fonts'
import { Grain } from '@/components/Grain'
import { Frame } from '@/components/Frame'

export const metadata: Metadata = {
  title: 'unwoventhread — loyalty card',
  description: 'curating conscious community',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cooper.variable} ${specialElite.variable}`}>
      <body>
        <Grain />
        <Frame />
        {children}
      </body>
    </html>
  )
}
