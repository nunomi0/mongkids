import type { Metadata } from "next"
import "./global.css"

export const metadata: Metadata = {
  title: "몽키즈클라이밍",
  description: "몽키즈클라이밍",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}