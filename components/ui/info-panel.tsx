"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const InfoPanel = DialogPrimitive.Root
const InfoPanelTrigger = DialogPrimitive.Trigger
const InfoPanelClose = DialogPrimitive.Close
const InfoPanelPortal = DialogPrimitive.Portal

const panelVariants = cva(
  "fixed z-[10001] bg-white shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out focus:outline-none",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 w-full sm:w-[360px] md:w-[400px] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        bottom:
          "inset-x-0 bottom-0 w-full data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface InfoPanelContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof panelVariants> {}

const InfoPanelContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  InfoPanelContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <InfoPanelPortal>
    <DialogPrimitive.Content
      ref={ref}
      {...props}
      aria-modal="false"
      trapFocus
      className={cn(panelVariants({ side }), "rounded-lg p-4 overflow-y-auto", className)}
    >
      {children}
      <InfoPanelClose className="absolute right-4 top-4 rounded-full p-1 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </InfoPanelClose>
    </DialogPrimitive.Content>
  </InfoPanelPortal>
))
InfoPanelContent.displayName = "InfoPanelContent"

export { InfoPanel, InfoPanelTrigger, InfoPanelClose, InfoPanelContent }
