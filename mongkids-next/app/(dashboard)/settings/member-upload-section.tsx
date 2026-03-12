'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { parseMemberExcel } from '@/lib/excel/member-parser'
import { generateMemberExcel } from '@/lib/excel/member-generator'
import { upsertStudentsFromExcel, fetchAllStudentsForExport } from '@/lib/queries'
import { saveAs } from 'file-saver'

export default function MemberUploadSection() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [result, setResult] = useState<{
    created: number
    updated: number
    paymentsCreated: number
    errors: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)

    try {
      const buffer = await file.arrayBuffer()
      const parseResult = await parseMemberExcel(buffer)

      if (parseResult.errors.length > 0) {
        console.warn('파싱 경고:', parseResult.errors)
      }

      const dbResult = await upsertStudentsFromExcel(parseResult.students, parseResult.payments)

      setResult({
        created: dbResult.created,
        updated: dbResult.updated,
        paymentsCreated: dbResult.paymentsCreated,
        errors: [...parseResult.errors, ...dbResult.errors],
      })
    } catch (err) {
      setResult({ created: 0, updated: 0, paymentsCreated: 0, errors: [`업로드 실패: ${err}`] })
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const students = await fetchAllStudentsForExport()
      const excelData = await generateMemberExcel(students)
      const blob = new Blob([excelData.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `등록회원명단_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      console.error('다운로드 오류:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">등록회원명단</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 파일 선택 */}
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

        {/* 업로드/다운로드 버튼 */}
        <div className="flex items-center gap-2">
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

        {/* 결과 표시 */}
        {result && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            {(result.created > 0 || result.updated > 0 || result.paymentsCreated > 0) && (
              <p className="text-green-700">
                신규 {result.created}명, 갱신 {result.updated}명, 결제 {result.paymentsCreated}건 처리
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="text-red-600 space-y-0.5">
                {result.errors.slice(0, 10).map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
                {result.errors.length > 10 && (
                  <p>... 외 {result.errors.length - 10}건</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
