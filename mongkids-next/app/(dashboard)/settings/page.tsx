import SettingsClient from "./settings-client"

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold">데이터 관리</h1>
        <p className="text-sm text-muted-foreground">엑셀 파일을 업로드하거나 다운로드합니다.</p>
      </div>
      <SettingsClient />
    </div>
  )
}
