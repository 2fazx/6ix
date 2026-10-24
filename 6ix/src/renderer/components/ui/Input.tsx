import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => (
    <input
      ref={ref}
      className={`h-9 w-full rounded border border-border bg-bg-raised px-3 text-sm text-fg placeholder:text-fg-dim focus:border-border-strong focus:outline-none ${className}`}
      {...rest}
    />
  )
)
Input.displayName = 'Input'