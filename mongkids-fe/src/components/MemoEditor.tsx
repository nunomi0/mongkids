import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { supabase } from "../lib/supabase"

interface MemoEditorProps {
  // 기존 방식
  hasNote?: boolean
  note?: string
  onSave?: (next: string | null) => Promise<void> | void
  // 간소화 방식
  studentId?: number
  classId?: number
  // 공통
  label?: string
  meta?: string
  className?: string
}

export default function MemoEditor({ hasNote, note, onSave, studentId, classId, label, meta, className }: MemoEditorProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(note || "")
  const [attId, setAttId] = useState<number | null>(null)
  const [loadedNote, setLoadedNote] = useState<string | null>(note ?? null)
  const derivedHasNote = typeof hasNote === 'boolean' ? hasNote : !!(loadedNote || note)

  const close = () => { setOpen(false) }
  const loadIfNeeded = async () => {
    if ((attId && loadedNote !== null) || !studentId || !classId) return
    const { data, error } = await supabase
      .from('attendance')
      .select('id, note')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .maybeSingle()
    if (!error && data) {
      setAttId((data as any).id as number)
      const n = (data as any).note ?? null
      setLoadedNote(n)
      if (!note) setDraft(n || "")
    }
  }
  const openEditor = async () => { await loadIfNeeded(); setDraft((loadedNote ?? note) || ""); setOpen(true) }

  return (
    <>
      <button
        className={
          "text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-300 " +
          (className ? ` ${className}` : '')
        }
        style={{ color: derivedHasNote ? '#ff0000' : '#9ca3af' }}
        title={derivedHasNote ? ((loadedNote ?? note) || '') : '메모 없음'}
        onMouseEnter={loadIfNeeded}
        onClick={(e) => { e.stopPropagation(); openEditor() }}
        aria-label="메모 편집"
      >
        ✎
      </button>
      <Dialog open={open} onOpenChange={(o)=>{ if(!o){ close() } }}>
        <DialogContent className="sm:max-w-sm">
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
                  if (studentId && classId) {
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>취소</Button>
              <Button onClick={async()=>{
                const next = draft.trim()===''? null : draft
                if (studentId && classId) {
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


