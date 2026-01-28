import { cn } from "@/lib/utils"
import type { StudentStatus } from "@/types/student"

const STATUS_STYLES: Record<StudentStatus, string> = {
  재원: "bg-green-100 text-green-700",
  휴원: "bg-yellow-100 text-yellow-700",
  퇴원: "bg-gray-100 text-gray-500",
  체험: "bg-blue-100 text-blue-700",
}

type Props = {
  status: StudentStatus
  className?: string
}

export default function StatusBadge({ status, className }: Props) {
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
