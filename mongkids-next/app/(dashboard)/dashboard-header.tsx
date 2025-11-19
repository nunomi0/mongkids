"use client"

import { usePathname } from "next/navigation"

const PAGE_INFO: Record<string, { title: string; desc: string }> = {
  "/": {
    title: "메인 대시보드",
    desc: "학생 현황, 분포를 확인할 수 있습니다.",
  },
  "/classes": {
    title: "수업 관리",
    desc: "진행 중인 수업과 전체 시간표를 관리합니다.",
  },
  "/students": {
    title: "학생 관리",
    desc: "학생 정보를 관리합니다.",
  },
  "/trials": {
    title: "체험 관리",
    desc: "체험 수업 신청자들을 관리합니다.",
  },
}

export default function DashboardHeader() {
  const pathname = usePathname()
  const base = "/" + pathname.split("/")[1]
  const info = PAGE_INFO[base] ?? PAGE_INFO["/"]

  return (
    <header className="px-6 py-4">
      <h1 className="text-xl font-semibold">{info.title}</h1>
      <p className="text-sm text-muted-foreground">{info.desc}</p>
    </header>
  )
}