import { cn } from "@/lib/utils"
import type { TrialStatus } from "@/types/student"

const STATUS_STYLES: Record<TrialStatus, string> = {
  예정: "bg-blue-100 text-blue-700",
  노쇼: "bg-red-100 text-red-700",
  미등록: "bg-yellow-100 text-yellow-700",
  등록: "bg-green-100 text-green-700",
}

type Props = {
  status: TrialStatus
  className?: string
}

export default function TrialStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  )
}
