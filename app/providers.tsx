'use client'

import { ReactNode } from 'react'
import { BladeStackProvider } from '@/lib/contexts/blade-stack-context'
import { PermissionProvider } from '@/lib/contexts/permission-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PermissionProvider>
      <BladeStackProvider>
        {children}
      </BladeStackProvider>
    </PermissionProvider>
  )
}