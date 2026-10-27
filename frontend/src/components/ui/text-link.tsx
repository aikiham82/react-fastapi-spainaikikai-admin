import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type TextLinkVariant = 'block' | 'inline'

const base = 'text-foreground underline underline-offset-4 hover:text-primary'

const variantClasses: Record<TextLinkVariant, string> = {
  block: `inline-flex min-h-11 w-fit items-center text-[15px] ${base}`,
  inline: base,
}

interface TextLinkProps extends ComponentProps<typeof Link> {
  variant?: TextLinkVariant
}

export function TextLink({ variant = 'block', className, ...props }: TextLinkProps) {
  return <Link className={cn(variantClasses[variant], className)} {...props} />
}

interface TextButtonProps extends ComponentProps<'button'> {
  variant?: TextLinkVariant
}

export function TextButton({ variant = 'block', className, type = 'button', ...props }: TextButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        variantClasses[variant],
        variant === 'inline' && 'pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center',
        'disabled:text-muted-foreground disabled:no-underline',
        className
      )}
      {...props}
    />
  )
}
