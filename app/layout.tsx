import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ZK-PayID — Private Credit Scoring on HashKey Chain",
  description: "Prove creditworthiness with zero-knowledge proofs. No identity revealed. Privacy-preserving PayFi on HashKey Chain.",
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
