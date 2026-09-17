import { NextResponse } from 'next/server'
import { requestIdResponseHeaders } from '@/lib/qms-auth'

export function qmsError(message: string, status: number, requestId: string) {
  return NextResponse.json({ error: message, requestId }, { status, headers: requestIdResponseHeaders(requestId) })
}

export function qmsSuccess<T>(data: T, requestId: string, status = 200) {
  return NextResponse.json({ ...data as object, requestId }, { status, headers: requestIdResponseHeaders(requestId) })
}
