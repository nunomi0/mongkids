import React, { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "./utils"

type CustomDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  children: React.ReactNode
}

export function CustomDialog({ open, onOpenChange, children }: CustomDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false) }
    const prevOverflow = document.body.style.overflow
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {children}
      </div>
    </div>,
    document.body
  )
}

type ContentProps = React.ComponentProps<"div"> & {
  onClose?: () => void
}

export function CustomDialogContent({ className, children, onClose, ...rest }: ContentProps) {
  const ref = useRef<HTMLDivElement>(null)

  // 간단 포커스 트랩
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")
    first?.focus()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "bg-background border shadow-lg rounded-lg w-[90vw] max-w-xl overflow-hidden",
        className
      )}
      onClick={(e)=>e.stopPropagation()}
      {...rest}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute right-3 top-3 inline-flex items-center justify-center rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      {/* 내부 스크롤 영역 */}
      <div className="max-h-[70vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export function CustomDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2 p-4 pb-2", className)} {...props} />
  )
}

export function CustomDialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-lg font-semibold", className)} {...props} />
  )}


