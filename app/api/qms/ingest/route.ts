import { embedMany } from 'ai'
import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { chunkQmsText, extractQmsText } from '@/lib/qms-extraction'

export const runtime = 'nodejs'
const MODEL = 'google/text-multilingual-embedding-002'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  const workspace = await db.execute(sql`select id from qms_workspace order by created_at asc limit 1`)
  const workspaceId = workspace.rows[0]?.id as string | undefined
  const role = 'user'
  if (!workspaceId || !can(role, 'upload')) return NextResponse.json({ error: 'Nemate dozvolu za indeksiranje.' }, { status: 403 })
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fajl je obavezan.' }, { status: 422 })
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Fajl je prevelik (maksimalno 15 MB).' }, { status: 413 })
  try {
    const text = await extractQmsText(file)
    const chunks = chunkQmsText(text)
    if (!chunks.length) return NextResponse.json({ error: 'Nije pronađen tekst za indeksiranje.' }, { status: 422 })
    const { embeddings } = await embedMany({ model: MODEL, values: chunks })
    for (let index = 0; index < chunks.length; index += 1) await db.execute(sql`insert into qms_document_chunk (workspace_id, source_name, chunk_index, content, embedding) values (${workspaceId}::uuid, ${file.name}, ${String(index)}, ${chunks[index]}, ${JSON.stringify(embeddings[index])}::jsonb)`)
    return NextResponse.json({ file: file.name, characters: text.length, chunks: chunks.length, model: MODEL }, { status: 201 })
  } catch (error) {
    console.error('[v0] QMS ingestion failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Indeksiranje nije uspjelo.' }, { status: 422 })
  }
}
