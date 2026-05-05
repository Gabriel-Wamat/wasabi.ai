'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, register } from '@/lib/api/auth'

const demoEmail = 'demo@personalhub.dev'
const demoPassword = 'senha123'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const enterApp = () => router.push('/dashboard')

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
      enterApp()
    } catch (err: any) {
      setError(err.message ?? 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await login(demoEmail, demoPassword)
      enterApp()
    } catch (err: any) {
      setError(err.message ?? 'Não foi possível entrar com a conta demo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <img src="/wasabi-v-icon.svg" alt="Wasabi" className="auth-logo" />
          <div>
            <strong>Wasabi</strong>
            <span>Gestão inteligente</span>
          </div>
        </div>

        <div className="auth-heading">
          <h1>{mode === 'register' ? 'Crie sua conta' : 'Entre na sua conta'}</h1>
          <p>
            {mode === 'register'
              ? 'Comece com login e senha próprios ou use a conta demo para testar.'
              : 'Use sua conta criada ou entre com o acesso demo preservado.'}
          </p>
        </div>

        <div className="auth-tabs" aria-label="Modo de acesso">
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Cadastro
          </button>
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <label>
              <span>Nome</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                autoComplete="name"
              />
            </label>
          )}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </label>

          <label>
            <span>Senha</span>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Sua senha'}
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'register' ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <div className="auth-demo">
          <div>
            <strong>Conta demo</strong>
            <span>{demoEmail} / {demoPassword}</span>
          </div>
          <button type="button" onClick={handleDemoLogin} disabled={loading}>
            Entrar demo
          </button>
        </div>
      </section>

      <style jsx>{`
        .auth-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(circle at 18% 18%, rgba(18, 199, 111, 0.12), transparent 28%),
            var(--bg);
        }

        .auth-card {
          width: min(100%, 460px);
          border: 1px solid var(--bd);
          border-radius: 18px;
          padding: 28px;
          background: rgba(20, 20, 20, 0.95);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
        }

        .auth-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .auth-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
        }

        .auth-brand strong {
          display: block;
          color: var(--gr);
          font-size: 22px;
          line-height: 1;
        }

        .auth-brand span,
        .auth-heading p,
        .auth-demo span {
          color: var(--t2);
          font-size: 13px;
        }

        .auth-heading {
          margin-bottom: 20px;
        }

        .auth-heading h1 {
          margin: 0 0 8px;
          color: var(--tx);
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: 0;
        }

        .auth-heading p {
          margin: 0;
          line-height: 1.45;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--bd);
          border-radius: 12px;
          background: var(--s2);
          margin-bottom: 18px;
        }

        .auth-tabs button,
        .auth-demo button {
          border: 0;
          border-radius: 9px;
          min-height: 40px;
          background: transparent;
          color: var(--t2);
          font-weight: 800;
          cursor: pointer;
        }

        .auth-tabs button.active {
          background: rgba(18, 199, 111, 0.14);
          color: var(--gr);
        }

        .auth-form {
          display: grid;
          gap: 14px;
        }

        label span {
          display: block;
          margin-bottom: 6px;
          color: var(--t2);
          font-size: 12px;
          font-weight: 700;
        }

        input {
          width: 100%;
          min-height: 48px;
          border: 1px solid var(--bd);
          border-radius: 10px;
          background: var(--s1);
          color: var(--tx);
          font-size: 14px;
          padding: 0 14px;
          outline: none;
        }

        input:focus {
          border-color: rgba(18, 199, 111, 0.55);
          box-shadow: 0 0 0 3px rgba(18, 199, 111, 0.1);
        }

        .auth-error {
          border: 1px solid rgba(255, 74, 98, 0.35);
          border-radius: 10px;
          padding: 10px 12px;
          background: rgba(255, 74, 98, 0.1);
          color: var(--rd);
          font-size: 13px;
          font-weight: 700;
        }

        .auth-submit {
          min-height: 48px;
          border: 0;
          border-radius: 10px;
          background: var(--gr);
          color: #03120a;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .auth-submit:disabled,
        .auth-demo button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .auth-demo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 18px;
          padding: 14px;
          border: 1px solid var(--bd);
          border-radius: 12px;
          background: var(--s2);
        }

        .auth-demo strong {
          display: block;
          color: var(--tx);
          font-size: 13px;
          margin-bottom: 2px;
        }

        .auth-demo button {
          padding: 0 14px;
          background: rgba(18, 199, 111, 0.12);
          color: var(--gr);
          white-space: nowrap;
        }

        @media (max-width: 520px) {
          .auth-card {
            padding: 22px;
          }

          .auth-demo {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  )
}
