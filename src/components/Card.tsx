import type { ReactNode, MouseEventHandler } from 'react'

interface Props {
  children: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLDivElement>
}

export default function Card({ children, className = '', onClick }: Props) {
  return (
    <div className={`bg-slate-800 rounded-2xl p-4 ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
