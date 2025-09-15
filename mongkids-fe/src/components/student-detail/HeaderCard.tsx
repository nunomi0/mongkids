import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import LevelBadge from "../LevelBadge"
import { Student, ClassType } from "../../types/student"
import { getGradeLabel } from "../../utils/grade"

export default function HeaderCard({ student, classTypes, onReload }: { student: Student; classTypes: ClassType[]; onReload: () => void }) {
  const classType = student.class_type_id ? classTypes.find(c => c.id === student.class_type_id) : undefined
  const statusColor = student.status === '재원' ? 'bg-green-100 text-green-800 border-green-300' : student.status === '휴원' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-red-100 text-red-800 border-red-300'
  const scheduleText = student.schedules
    .slice()
    .sort((a,b)=> a.weekday-b.weekday || a.time.localeCompare(b.time))
    .map(s=> `${['월','화','수','목','금','토','일'][s.weekday]}${s.time.slice(0,5)}(${s.group_type})`).join(', ')

  return (
    <Card className="shrink-0">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="text-xl font-bold text-gray-900">{student.name}</div>
            <div className="text-xs text-gray-500 mt-1">{student.birth_date} ({getGradeLabel(student.birth_date)}) · {student.gender}</div>
            <div className="text-xs text-gray-500 mt-1">{classType ? `${classType.category} 주 ${classType.sessions_per_week}회` : '-'} ({scheduleText || '-'})</div>
            <div className="text-xs text-gray-500 mt-1"><span className="font-medium">신발 사이즈:</span> {student.shoe_size || '-'}</div>
            <div className="text-xs text-gray-500 mt-1"><span className="font-medium">전화번호:</span> {student.phone}</div>
            <div className="text-xs text-gray-500 mt-1"><span className="font-medium">등록일:</span> {student.registration_date}</div>
          </div>
          <div className="flex items-center gap-3">
            {student.current_level && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">현재 레벨:</span>
                <LevelBadge level={student.current_level as any} size={18} radius={3} />
              </div>
            )}
            <Badge className={`text-sm px-3 py-1 ${statusColor}`}>{student.status}</Badge>
          </div>
        </div>
    </Card>
  )
}


