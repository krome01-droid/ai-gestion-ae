'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function ProcessingPoller({ createdAt }: { createdAt: string }) {
  const router = useRouter()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(createdAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [createdAt])

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(id)
  }, [router])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <p className="text-xs text-slate-400 mt-1">
      {elapsed > 0 && `En cours depuis ${minutes > 0 ? `${minutes}min ` : ''}${seconds}s`}
    </p>
  )
}
