import { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: 'var(--bg-hover)', ...style }}
    />
  )
}

export function SkeletonText({ width = 'w-full', className = '' }: { width?: string; className?: string }) {
  return <Skeleton className={`h-4 ${width} ${className}`} />
}

export function SkeletonKpiCard() {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-t border-[var(--border-color)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-color)]">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 50}ms` }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDMOBlock() {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    </div>
  )
}
