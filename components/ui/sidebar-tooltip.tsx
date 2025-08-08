"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const SidebarTooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <TooltipPrimitive.Provider delayDuration={200} skipDelayDuration={150}>
    {children}
  </TooltipPrimitive.Provider>
)

const SidebarTooltip = TooltipPrimitive.Root

const SidebarTooltipTrigger = TooltipPrimitive.Trigger

const SidebarTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, side = "right", align = "center", sideOffset = 8, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    side={side}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-lg",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  >
    {props.children}
    <TooltipPrimitive.Arrow width={6} height={6} className="fill-popover" />
  </TooltipPrimitive.Content>
))
SidebarTooltipContent.displayName = TooltipPrimitive.Content.displayName

export {
  SidebarTooltipProvider,
  SidebarTooltip,
  SidebarTooltipTrigger,
  SidebarTooltipContent,
}
