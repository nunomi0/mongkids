import TrialsClient from "./trials-client"
import { fetchTrials } from "@/lib/queries"

export default async function TrialsPage() {
  const trials = await fetchTrials()

  return (
    <div className="p-6">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold">체험 관리</h1>
        <p className="text-sm text-muted-foreground">체험 수업 신청자들을 관리합니다.</p>
      </div>
      <TrialsClient trials={trials} />
    </div>
  )
}
