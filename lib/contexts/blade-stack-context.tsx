"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"

interface BladeEntry {
  id: string
  Component: React.ComponentType<any>
  props?: Record<string, any>
  ready: boolean
  label?: string
  width?: "sm" | "md" | "lg" | "xl" | "full"
}

interface BladeStackContextType {
  openBlade: (
    Component: React.ComponentType<any>,
    props?: Record<string, any>,
    options?: {
      label?: string
      width?: "sm" | "md" | "lg" | "xl" | "full"
    }
  ) => void
  closeTopBlade: () => void
  closeBlade: (id: string) => void
  closeAllBlades: () => void
  blades: BladeEntry[]
  activeBladeZIndex: number
}

const BladeStackContext = createContext<BladeStackContextType | undefined>(undefined)

export function BladeStackProvider({ children }: { children: React.ReactNode }) {
  const [blades, setBlades] = useState<BladeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const loadingTimer = useRef<NodeJS.Timeout | null>(null)

  const openBlade = useCallback(
    (
      Component: React.ComponentType<any>,
      props?: Record<string, any>,
      options?: {
        label?: string
        width?: "sm" | "md" | "lg" | "xl" | "full"
      }
    ) => {
      const id = `blade-${Date.now()}-${Math.random()}`
      setBlades((prev) => {
        // Limit to 5 blades max for performance
        if (prev.length >= 5) {
          console.warn("Maximum number of blades (5) reached")
          return prev
        }
        return [
          ...prev,
          {
            id,
            Component,
            props,
            ready: true,
            label: options?.label,
            width: options?.width || "lg"
          }
        ]
      })
    },
    []
  )

  const closeTopBlade = useCallback(() => {
    setBlades((prev) => prev.slice(0, -1))
  }, [])

  const closeBlade = useCallback((id: string) => {
    setBlades((prev) => {
      const index = prev.findIndex(b => b.id === id)
      if (index === -1) return prev
      // Close this blade and all blades on top of it
      return prev.slice(0, index)
    })
  }, [])

  const closeAllBlades = useCallback(() => {
    setBlades([])
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && blades.length > 0) {
        e.preventDefault()
        closeTopBlade()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("keydown", handleKey)
      if (loadingTimer.current) {
        clearTimeout(loadingTimer.current)
      }
    }
  }, [closeTopBlade, blades.length])

  const activeBladeZIndex = 1000 + blades.length * 10

  return (
    <BladeStackContext.Provider
      value={{
        openBlade,
        closeTopBlade,
        closeBlade,
        closeAllBlades,
        blades,
        activeBladeZIndex,
      }}
    >
      {children}
      <AnimatePresence>
        {blades.map((blade, index) => {
          const offsetIndex = blades.length - 1 - index
          const offset = -80 * Math.min(offsetIndex, 3) // Stack offset for visual effect
          const zIndex = 1000 + index * 10
          const isTop = index === blades.length - 1
          const overlayOpacity = Math.min(0.2 + index * 0.1, 0.6)
          const Comp = blade.Component

          // Calculate responsive width based on screen size
          const getResponsiveWidth = () => {
            if (typeof window === 'undefined') return '100%'
            
            const screenWidth = window.innerWidth
            const widthMap = {
              sm: { mobile: 100, tablet: 85, desktop: 70, large: 60, xlarge: 50 },
              md: { mobile: 100, tablet: 85, desktop: 75, large: 65, xlarge: 55 },
              lg: { mobile: 100, tablet: 85, desktop: 80, large: 70, xlarge: 60 },
              xl: { mobile: 100, tablet: 90, desktop: 85, large: 75, xlarge: 65 },
              full: { mobile: 100, tablet: 100, desktop: 100, large: 100, xlarge: 100 }
            }
            
            const size = blade.width || 'lg'
            const widths = widthMap[size]
            
            if (screenWidth >= 1536) return `${widths.xlarge}vw`  // 2xl
            if (screenWidth >= 1280) return `${widths.large}vw`   // xl
            if (screenWidth >= 1024) return `${widths.desktop}vw` // lg
            if (screenWidth >= 768) return `${widths.tablet}vw`   // md
            return `${widths.mobile}vw`
          }
          
          const bladeWidth = getResponsiveWidth()

          return (
            <React.Fragment key={blade.id}>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50"
                style={{ 
                  zIndex: zIndex - 1, 
                  pointerEvents: isTop ? "auto" : "none" 
                }}
                onClick={isTop ? closeTopBlade : undefined}
              />
              {/* Blade */}
              <motion.div
                initial={{ x: "100%", y: 0 }}
                animate={{ x: offset, y: 0 }}
                exit={{ x: "100%", y: 0 }}
                transition={{ 
                  type: "spring",
                  damping: 30,
                  stiffness: 300
                }}
                className="fixed right-0 h-screen bg-background shadow-2xl overflow-hidden"
                style={{ 
                  zIndex,
                  top: 0,
                  paddingTop: 0,
                  marginTop: 0,
                  width: bladeWidth
                }}
              >
                <div className="h-full w-full [&>*]:!mt-0">
                  <Comp 
                    {...blade.props} 
                    onClose={() => closeBlade(blade.id)}
                  />
                </div>
              </motion.div>
            </React.Fragment>
          )
        })}
      </AnimatePresence>
    </BladeStackContext.Provider>
  )
}

export function useBladeStack() {
  const ctx = useContext(BladeStackContext)
  if (!ctx) throw new Error("useBladeStack must be used within BladeStackProvider")
  return ctx
}