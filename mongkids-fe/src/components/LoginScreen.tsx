import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { supabase } from "../lib/supabase"

interface LoginScreenProps {
  onLogin: (success: boolean) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  // 고정 관리자 이메일 (노출돼도 무방)
  const ADMIN_EMAIL =
    import.meta.env.VITE_ADMIN_LOGIN_EMAIL || "admin@mongkids.local"

  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password.trim()) {
      setError("비밀번호를 입력해주세요.")
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: password.trim(),
      })
      if (error) throw error

      onLogin(true) // 세션은 supabase-js가 내부 저장
    } catch (err: any) {
      console.error("Auth error:", err)
      // Supabase가 주는 메시지 그대로 또는 커스텀 문구
      setError("비밀번호가 올바르지 않습니다.")
      setPassword("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            몽키즈클라이밍 고양화정점
          </CardTitle>
          <p className="text-gray-600 mt-2">관리자 로그인</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}