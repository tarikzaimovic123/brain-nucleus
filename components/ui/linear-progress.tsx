"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface LinearProgressProps {
  className?: string
  indeterminate?: boolean
  value?: number
}

export function LinearProgress({ 
  className, 
  indeterminate = true, 
  value = 0 
}: LinearProgressProps) {
  return (
    <div 
      className={cn(
        "relative h-1 w-full overflow-hidden bg-gray-200",
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : value}
    >
      {indeterminate ? (
        <>
          {/* Primary indicator */}
          <div className="absolute h-full bg-primary animate-linear-progress-primary" />
          {/* Secondary indicator */}
          <div className="absolute h-full bg-primary/75 animate-linear-progress-secondary" />
        </>
      ) : (
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      )}
    </div>
  )
}

// Add these keyframes to your global CSS or Tailwind config
export const linearProgressKeyframes = `
@keyframes linear-progress-primary {
  0% {
    left: -35%;
    right: 100%;
  }
  60% {
    left: 100%;
    right: -90%;
  }
  100% {
    left: 100%;
    right: -90%;
  }
}

@keyframes linear-progress-secondary {
  0% {
    left: -200%;
    right: 100%;
  }
  60% {
    left: 107%;
    right: -8%;
  }
  100% {
    left: 107%;
    right: -8%;
  }
}
`