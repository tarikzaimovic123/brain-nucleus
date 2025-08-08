"use client"
import { cn } from "@/lib/utils"

export function IndeterminateProgress({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-0.5 w-full overflow-hidden bg-gray-200", className)}>
      <div className="absolute inset-0 bg-primary animate-indeterminate" />
    </div>
  )
}
