'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function SignInPage() {
  const router = useRouter(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('')
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(''); const result = await authClient.signIn.email({ email, password }); if (result.error) setError('Prijava nije uspjela. Provjerite podatke.'); else { router.push('/'); router.refresh() } }
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6"><form onSubmit={submit} className="w-full max-w-md border border-[#dfe3e8] bg-white p-8"><div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[.16em] text-[#e21b2d]"><img src="/idss-logo.png" alt="IDSS logo" className="h-10 w-10 rounded-sm bg-[#20242a] p-1.5 object-contain" />IDSS-QMS</div><h1 className="text-2xl font-bold">Prijava</h1><p className="mt-2 text-sm text-[#747d87]">Pristupite svom QMS workspace-u.</p><label className="mt-6 block text-xs font-bold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 h-11 w-full border px-3 text-sm" /></label><label className="mt-4 block text-xs font-bold">Lozinka<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-11 w-full border px-3 text-sm" /></label>{error && <p className="mt-4 text-xs text-[#c91829]">{error}</p>}<button className="mt-6 w-full bg-[#e21b2d] px-4 py-3 text-xs font-bold text-white">Prijavi se</button><a href="/sign-up" className="mt-4 block text-center text-xs font-bold text-[#c91829]">Kreiraj nalog</a></form></main>
}
