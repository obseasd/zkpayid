import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ZK-PayID — Private Credit Scoring on HashKey Chain",
  description: "Prove creditworthiness with zero-knowledge proofs. No identity revealed. Privacy-preserving PayFi on HashKey Chain.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
