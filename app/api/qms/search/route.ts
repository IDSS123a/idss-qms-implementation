import { embed } from 'ai'
import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

const MODEL = 'google/text-multilingual-embedding-002'

function similarity(a: number[], b: number[]) {
  let dot = 0; let normA = 0; let normB = 0
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2 }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { query?: unknown }
  const query = typeof body.query === 'string' ? body.query.trim().slice(0, 500) : ''
  if (query.length < 2) return NextResponse.json({ error: 'Upit je prekratak.' }, { status: 422 })
  const workspace = await db.execute(sql`select id from qms_workspace order by created_at asc limit 1`)
  const workspaceId = workspace.rows[0]?.id as string | undefined
  if (!workspaceId) return NextResponse.json({ results: [] })
  const { embedding } = await embed({ model: MODEL, value: query })
  const rows = await db.execute(sql`select id, document_id, source_name, chunk_index, content, embedding from qms_document_chunk where workspace_id = ${workspaceId}::uuid and embedding is not null order by created_at desc limit 1000`)
  const results = rows.rows.map((row) => ({ ...row as Record<string, unknown>, score: similarity(embedding, (row.embedding ?? []) as number[]) })).filter((row) => row.score > 0.25).sort((a, b) => b.score - a.score).slice(0, 10)
  return NextResponse.json({ results })
}
