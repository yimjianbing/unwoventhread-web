import localFont from 'next/font/local'
import { Special_Elite } from 'next/font/google'

export const specialElite = Special_Elite({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-special-elite',
  display: 'swap',
})

export const cooper = localFont({
  variable: '--font-cooper',
  display: 'swap',
  src: [
    { path: '../public/fonts/cooper-bt/CooperLtBT-Regular.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/cooper-bt/CooperLtBT-Italic.woff2', weight: '300', style: 'italic' },
    { path: '../public/fonts/cooper-bt/CooperMdBT-Regular.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/cooper-bt/CooperMdBT-Italic.woff2', weight: '500', style: 'italic' },
    { path: '../public/fonts/cooper-bt/CooperLtBT-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/cooper-bt/CooperLtBT-BoldItalic.woff2', weight: '700', style: 'italic' },
    { path: '../public/fonts/cooper-bt/CooperBlkBT-Regular.woff2', weight: '900', style: 'normal' },
  ],
})
