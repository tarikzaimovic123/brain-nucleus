"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface BladeWrapperProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  width?: "sm" | "md" | "lg" | "xl" | "full"
}

export function BladeWrapper({ isOpen, onClose, children, width = "lg" }: BladeWrapperProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const widthClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-full"
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Blade Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full bg-background shadow-2xl z-50 transition-transform duration-300 ease-out overflow-hidden",
          widthClasses[width],
          "w-full",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.1)"
        }}
      >
        {children}
      </div>
    </>
  )
}