import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function ProfileSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>기본 정보</CardTitle>
      </CardHeader>

      <CardContent className="space-y-1 text-sm">
        <div className="font-semibold text-base">박지영</div>

        <div className="text-muted-foreground">
          1992-09-07 (성인) · 여
        </div>
        <div className="text-muted-foreground">
          여성 주 2회 (수19:00(일반2), 금19:00(일반1))
        </div>
        <div>신발 사이즈: -</div>
        <div>전화번호: 010-1234-5697</div>
        <div>등록일: 2024-02-28</div>
        <div>메모: -</div>
      </CardContent>
    </Card>
  )
}