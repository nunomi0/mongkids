'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { parseAttendanceExcel } from '@/lib/excel/attendance-parser'
import { generateAttendanceExcel } from '@/lib/excel/attendance-generator'
import { upsertAttendanceFromExcel, fetchAttendanceForExport } from '@/lib/queries'
import { saveAs } from 'file-saver'

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i)
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

export default function AttendanceUploadSection() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadYear, setUploadYear] = useState(String(currentYear))
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    classesCreated: number
    attendancesCreated: number
    errors: string[]
  } | null>(null)

  // 다운로드 옵션
  const [dlYear, setDlYear] = useState(String(currentYear))
  const [dlStartMonth, setDlStartMonth] = useState('7')
  const [dlEndMonth, setDlEndMonth] = useState('12')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setUploadResult(null)

    try {
      const buffer = await file.arrayBuffer()
      const parseResult = await parseAttendanceExcel(buffer, parseInt(uploadYear))

      // 파싱 결과를 콘솔에 출력 (DB 전송 전 데이터 확인용)
      console.log('=== 출석표 파싱 결과 ===')
      console.log(`수업 수: ${parseResult.classes.length}`)
      for (const cls of parseResult.classes.slice(0, 20)) {
        console.log('수업:', cls)
      }
      console.log(`출석 수: ${parseResult.attendances.length}`)
      for (const att of parseResult.attendances.slice(0, 30)) {
        console.log('출석:', att)
      }
      if (parseResult.errors.length > 0) {
        console.log('=== 파싱 에러 ===')
        parseResult.errors.forEach(e => console.warn(e))
      }

      setUploadResult({
        classesCreated: parseResult.classes.length,
        attendancesCreated: parseResult.attendances.length,
        errors: parseResult.errors,
      })
    } catch (err) {
      setUploadResult({ classesCreated: 0, attendancesCreated: 0, errors: [`업로드 실패: ${err}`] })
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const year = parseInt(dlYear)
      const start = parseInt(dlStartMonth)
      const end = parseInt(dlEndMonth)

      const attendances = await fetchAttendanceForExport(year, start, end)
      const excelData = await generateAttendanceExcel(attendances, year, start, end)
      const blob = new Blob([excelData.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `출석표_${year}년_${start}월-${end}월.xlsx`)
    } catch (err) {
      console.error('다운로드 오류:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">출석표</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 업로드 섹션 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              파일 선택
            </Button>
            {file && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">연도</Label>
              <Select value={uploadYear} onValueChange={setUploadYear}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1.5" />
              )}
              업로드
            </Button>
          </div>

          {/* 업로드 결과 */}
          {uploadResult && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              {(uploadResult.classesCreated > 0 || uploadResult.attendancesCreated > 0) && (
                <p className="text-green-700">
                  수업 {uploadResult.classesCreated}건, 출석 {uploadResult.attendancesCreated}건 처리
                </p>
              )}
              {uploadResult.errors.length > 0 && (
                <div className="text-red-600 space-y-0.5">
                  {uploadResult.errors.slice(0, 10).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                  {uploadResult.errors.length > 10 && (
                    <p>... 외 {uploadResult.errors.length - 10}건</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 다운로드 섹션 */}
        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-medium">다운로드</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={dlYear} onValueChange={setDlYear}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dlStartMonth} onValueChange={setDlStartMonth}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">~</span>
            <Select value={dlEndMonth} onValueChange={setDlEndMonth}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              다운로드
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
