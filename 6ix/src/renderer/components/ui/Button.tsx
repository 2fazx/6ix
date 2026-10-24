import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ease-6ix rounded disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none'

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-slate-200 via-white to-slate-200 text-black shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:from-white hover:to-white border border-white/50',
  secondary: 'bg-bg-raised text-fg border border-border hover:border-border-strong hover:bg-bg-hover',
  ghost: 'text-fg-muted hover:text-fg hover:bg-bg-hover',
  danger: 'bg-transparent text-red-400 border border-red-500/30 hover:bg-red-500/10'
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm tracking-wide'
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'secondary', size = 'md', className = '', ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  )
)
Button.displayName = 'Button'