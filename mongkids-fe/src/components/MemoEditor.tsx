import React, { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { supabase } from "../lib/supabase"

interface MemoEditorProps {
  hasNote?: boolean
  note?: string
  onSave?: (next: string | null) => Promise<void> | void
  studentId?: number
  classId?: number
  studentOnlyId?: number
  label?: string
  meta?: string
  className?: string
  hideBubble?: boolean
}

export default function MemoEditor({ hasNote, note, onSave, studentId, classId, studentOnlyId, label, meta, className, hideBubble }: MemoEditorProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(note || "")
  const [attId, setAttId] = useState<number | null>(null)
  const [loadedNote, setLoadedNote] = useState<string | null>(note ?? null)
  const derivedHasNote = typeof hasNote === 'boolean' ? hasNote : !!(loadedNote || note)
  const isStudentMemo = !!studentOnlyId
  const [isPinnedOpen, setIsPinnedOpen] = useState<boolean>(false)

  const close = () => { setOpen(false) }
  const loadIfNeeded = async () => {
    if (studentOnlyId) {
      if (loadedNote !== null) return
      const { data, error } = await supabase
        .from('students')
        .select('memo, memo_isopen')
        .eq('id', studentOnlyId)
        .maybeSingle()
      if (!error && data) {
        const n = (data as any).memo ?? null
        setLoadedNote(n)
        if (!note) setDraft(n || "")
        setIsPinnedOpen(!!(data as any).memo_isopen)
      }
      return
    }

    if ((attId && loadedNote !== null) || !studentId || !classId) return
    const { data, error } = await supabase
      .from('attendance')
      .select('id, note, note_isopen')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .maybeSingle()
    if (!error && data) {
      setAttId((data as any).id as number)
      const n = (data as any).note ?? null
      setLoadedNote(n)
      if (!note) setDraft(n || "")
      setIsPinnedOpen(!!(data as any).note_isopen)
    }
  }
  const openEditor = async () => { await loadIfNeeded(); setDraft((loadedNote ?? note) || ""); setOpen(true) }

  useEffect(() => {
    if (studentOnlyId) {
      loadIfNeeded()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentOnlyId])

  const bubbleText = useMemo(() => {
    const t = (loadedNote || '')
    if (t.length <= 10) return t
    return t.slice(0, 10) + '…'
  }, [loadedNote])

  return (
    <>
      <span className={"relative inline-flex items-center" + (className ? ` ${className}` : '')}>
        <button
          className={
            "text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-200"
          }
          style={{
            color: isStudentMemo
              ? (derivedHasNote ? '#6d28d9' : '#9ca3af')
              : (derivedHasNote ? '#ff0000' : '#9ca3af')
          }}
          title={isStudentMemo ? '학생 메모' : '출석 메모'}
          onMouseEnter={loadIfNeeded}
          onClick={(e) => { e.stopPropagation(); openEditor() }}
          aria-label={isStudentMemo ? '학생 메모 편집' : '출석 메모 편집'}
        >
          ✎
        </button>
        {!hideBubble && isPinnedOpen && !!loadedNote && (
          <div
            className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full z-40 max-w-[260px] rounded-md border bg-white/95 backdrop-blur-sm px-2 py-1 text-xs shadow-lg whitespace-nowrap overflow-hidden"
          >
            <span className="mr-1 font-medium text-gray-700">{isStudentMemo ? '학생' : '출석'}</span>
            <span className="text-gray-700">{bubbleText}</span>
          </div>
        )}
      </span>

      <Dialog open={open} onOpenChange={(o)=>{ if(!o){ close() } }}>
        <DialogContent type="s">
          <DialogHeader>
            { (label || meta) && (
              <DialogTitle>
                {meta ? meta : ''}{meta && label ? ' - ' : ''}{label ? label : ''}
              </DialogTitle>
            )}
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              className="w-full border rounded p-2 text-sm min-h-[120px]"
              value={draft}
              onChange={(e)=>setDraft(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  const next = draft.trim()===''? null : draft
                  if (studentOnlyId) {
                    await supabase.from('students').update({ memo: next }).eq('id', studentOnlyId)
                    setLoadedNote(next)
                  } else if (studentId && classId) {
                    if (!attId) await loadIfNeeded()
                    if (attId) {
                      await supabase.from('attendance').update({ note: next }).eq('id', attId)
                      setLoadedNote(next)
                    }
                  } else if (onSave) {
                    await onSave(next)
                  }
                  close()
                }
              }}
              placeholder="메모를 입력하세요"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={isPinnedOpen}
                  onChange={async (e) => {
                    const val = e.target.checked
                    setIsPinnedOpen(val)
                    if (studentOnlyId) {
                      await supabase.from('students').update({ memo_isopen: val }).eq('id', studentOnlyId)
                    } else {
                      if (!attId) await loadIfNeeded()
                      if (attId) await supabase.from('attendance').update({ note_isopen: val }).eq('id', attId)
                    }
                  }}
                />
                메모 항상 띄우기(말풍선)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>취소</Button>
              <Button onClick={async()=>{
                const next = draft.trim()===''? null : draft
                if (studentOnlyId) {
                  await supabase.from('students').update({ memo: next }).eq('id', studentOnlyId)
                  setLoadedNote(next)
                } else if (studentId && classId) {
                  if (!attId) await loadIfNeeded()
                  if (attId) {
                    await supabase.from('attendance').update({ note: next }).eq('id', attId)
                    setLoadedNote(next)
                  }
                } else if (onSave) {
                  await onSave(next)
                }
                close()
              }}>저장</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


