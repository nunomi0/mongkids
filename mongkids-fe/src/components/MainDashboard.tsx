import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

export default function MainDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1>메인 대시보드</h1>
        <p className="text-muted-foreground">학원 관리 시스템에 오신 것을 환영합니다.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>대시보드 준비 중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              추후 통계 및 요약 정보가 표시될 예정입니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}