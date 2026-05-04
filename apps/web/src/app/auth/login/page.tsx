'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, register } from '@/lib/api/auth'

export default function LoginPage() {
  const router   = useRouter()
  const [mode, setMode]     = useState<'login' | 'register'>('login')
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, pass)
      } else {
        await register(name, email, pass)
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 380, background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 14, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <img src="/wasabi-v-icon.svg" alt="Wasabi" style={{ width: 44, height: 44 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#7FB069' }}>Wasabi</div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>{mode === 'login' ? 'Faça login na sua conta' : 'Crie sua conta'}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Nome</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome completo" required
                style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '8px 12px', color: 'var(--tx)', fontSize: 13, outline: 'none' }}
              />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required
              style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '8px 12px', color: 'var(--tx)', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: 'var(--t2)', display: 'block', marginBottom: 4 }}>Senha</label>
            <input
              type="password" value={pass} onChange={e => setPass(e.target.value)}
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'} required
              style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '8px 12px', color: 'var(--tx)', fontSize: 13, outline: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: '#2a0808', border: '1px solid var(--rd)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--rd)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', background: 'var(--gr)', color: '#000', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 600, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--t2)' }}>
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: 'var(--gr)', fontWeight: 500, cursor: 'pointer', fontSize: 12 }}
          >
            {mode === 'login' ? 'Criar conta' : 'Fazer login'}
          </button>
        </div>

        <div style={{ marginTop: 20, padding: '10px 12px', background: 'var(--s2)', borderRadius: 8, fontSize: 11, color: 'var(--t2)' }}>
          <strong style={{ color: 'var(--t2)' }}>Demo:</strong> demo@personalhub.dev / senha123
        </div>
      </div>
    </div>
  )
}
