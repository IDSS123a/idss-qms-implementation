const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 2000) for (const [entry, value] of buckets) if (value.resetAt <= now) buckets.delete(entry)
    return { allowed: true, remaining: limit - 1 }
  }
  current.count += 1
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count) }
}
