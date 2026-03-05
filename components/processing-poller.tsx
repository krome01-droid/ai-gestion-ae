'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ProcessingPoller() {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(id)
  }, [router])
  return null
}
