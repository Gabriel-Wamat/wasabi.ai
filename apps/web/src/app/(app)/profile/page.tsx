'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getStoredUser, logout } from '@/lib/api/auth'

interface User {
  id: string
  name: string
  email: string
  timezone: string
  plan: string
  createdAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await api.get<{ data: User }>('/user/me')
      setUser(response.data)
      setName(response.data.name)
      setTimezone(response.data.timezone)
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao carregar perfil', 'error')
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/user/me', { name, timezone })
      showToast('Perfil atualizado com sucesso!', 'success')
      loadProfile()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao atualizar perfil', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem', 'error')
      return
    }
    setPasswordLoading(true)
    try {
      await api.post('/user/me/change-password', {
        currentPassword,
        newPassword,
      })
      showToast('Senha alterada com sucesso!', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao alterar senha', 'error')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  if (!user) {
    return (
      <div>
        <Header title="Perfil" />
        <div style={{ padding: 20, color: 'var(--t2)' }}>Carregando...</div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Perfil" />
      <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
        {/* Informações da Conta */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: '#fff'
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{user.name}</h2>
              <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 4 }}>{user.email}</div>
              <div style={{
                fontSize: 11, color: 'var(--gr)', fontWeight: 600,
                background: 'rgba(17, 199, 111, 0.1)', padding: '4px 10px',
                borderRadius: 6, display: 'inline-block'
              }}>
                {user.plan === 'PRO' ? '✨ PRO' : '🆓 FREE'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Editar Perfil */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Editar Perfil</h3>
          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%', background: 'var(--s1)', border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                  fontSize: 14, outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                style={{
                  width: '100%', background: 'var(--s1)', border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                  fontSize: 14, outline: 'none'
                }}
              >
                <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                <option value="America/Recife">Recife (UTC-3)</option>
                <option value="America/Manaus">Manaus (UTC-4)</option>
                <option value="America/Rio_Branco">Rio Branco (UTC-5)</option>
              </select>
            </div>

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </div>

        {/* Alterar Senha */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Alterar Senha</h3>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Senha Atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                style={{
                  width: '100%', background: 'var(--s1)', border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                  fontSize: 14, outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%', background: 'var(--s1)', border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                  fontSize: 14, outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%', background: 'var(--s1)', border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                  fontSize: 14, outline: 'none'
                }}
              />
            </div>

            <Button type="submit" variant="primary" disabled={passwordLoading}>
              {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </div>

        {/* Sair */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Sair da Conta</h3>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
            Desconectar deste dispositivo
          </p>
          <Button
            onClick={handleLogout}
            variant="secondary"
            style={{
              background: 'rgba(244, 67, 54, 0.1)',
              borderColor: 'rgba(244, 67, 54, 0.3)',
              color: 'var(--rd)'
            }}
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  )
}
