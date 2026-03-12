'use client'

import MemberUploadSection from './member-upload-section'
import AttendanceUploadSection from './attendance-upload-section'
import ScheduleGenerateSection from './schedule-generate-section'

export default function SettingsClient() {
  return (
    <div className="space-y-6 max-w-2xl">
      <ScheduleGenerateSection />
      <MemberUploadSection />
      <AttendanceUploadSection />
    </div>
  )
}
