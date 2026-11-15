// The line icons from the design. Sizes come from the theme through the classes in base.css.

import type { ReactNode } from 'react'

interface IconProps {
  /** Read out by screen readers. Without it the icon is decoration. */
  label?: string
  size?: 's' | 'm' | 'l' | 'xl'
  className?: string
}

function Icon({ label, size = 'm', className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={['tl-ikon', className].filter(Boolean).join(' ')}
      data-size={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {children}
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </Icon>
  )
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </Icon>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </Icon>
  )
}

export function OpenLockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 0 1 7.6-1.7" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  )
}

export function BackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </Icon>
  )
}

/** The mark of the game: a locked card and a pending one on a line. Decoration only. */
export function LogoMark() {
  return (
    <svg className="tl-logo" viewBox="0 0 44 48" fill="none" aria-hidden="true">
      <line className="tl-logo__linje" x1="9" y1="4" x2="9" y2="44" strokeWidth="3" strokeLinecap="round" />
      <circle className="tl-logo__last" cx="9" cy="13" r="6" />
      <circle className="tl-logo__spill" cx="9" cy="35" r="5" strokeWidth="2" />
      <rect
        className="tl-logo__spillkort"
        x="20"
        y="20"
        width="21"
        height="27"
        rx="4"
        transform="rotate(-8 30 34)"
        strokeWidth="2.5"
        strokeDasharray="5 3"
      />
      <rect className="tl-logo__lastkort" x="21" y="2" width="20" height="14" rx="4" strokeWidth="2.5" />
    </svg>
  )
}
