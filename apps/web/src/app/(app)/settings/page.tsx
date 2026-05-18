'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { api } from '@/lib/api/client'
import { LlmProvider, OllamaModel, OllamaModelsResponse, UserLlmSettings } from '@/types'

interface ApiResponse<T> {
  data: T
}

const PROVIDERS: Array<{
  id: LlmProvider
  label: string
  description: string
  defaultModel: string
}> = [
  { id: 'openai', label: 'OpenAI', description: 'Use uma chave de API para rodar o Wasabi em nuvem.', defaultModel: 'gpt-5.1-mini' },
  { id: 'anthropic', label: 'Anthropic', description: 'Use Claude com sua própria chave de API.', defaultModel: 'claude-haiku-4-5' },
  { id: 'ollama', label: 'Ollama local', description: 'Roda na sua máquina, sem enviar dados para um provider externo.', defaultModel: 'llama3.1' },
]

const DEFAULT_OLLAMA_MODEL = 'llama3.1'
const OLLAMA_DOWNLOAD_URL = 'https://ollama.com/download'

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserLlmSettings | null>(null)
  const [provider, setProvider] = useState<LlmProvider>('openai')
  const [model, setModel] = useState('gpt-5.1-mini')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string | null>(null)
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dismissOllamaDownload, setDismissOllamaDownload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const selectedProvider = useMemo(
    () => PROVIDERS.find(item => item.id === provider) ?? PROVIDERS[0],
    [provider],
  )
  const needsApiKey = provider !== 'ollama'
  const hasCurrentProviderKey = Boolean(settings?.hasApiKey && settings.provider === provider)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (provider !== 'ollama') return
    void loadOllamaModels()
  }, [provider])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<UserLlmSettings>>('/user/me/llm-settings')
      setSettings(res.data)
      setProvider(res.data.provider)
      setModel(res.data.model)
      setBaseUrl(res.data.baseUrl ?? '')
    } catch (error) {
      setStatus({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const selectProvider = (next: LlmProvider) => {
    const item = PROVIDERS.find(p => p.id === next)!
    setProvider(next)
    setModel(item.defaultModel)
    setApiKey('')
    setBaseUrl(next === 'ollama' && settings?.provider === 'ollama' ? settings.baseUrl ?? '' : '')
    setShowAdvanced(false)
    setDismissOllamaDownload(false)
    setStatus(null)
  }

  const loadOllamaModels = async (overrideBaseUrl?: string) => {
    setLoadingModels(true)
    try {
      const query = overrideBaseUrl || baseUrl
        ? `?baseUrl=${encodeURIComponent((overrideBaseUrl || baseUrl).trim())}`
        : ''
      const res = await api.get<ApiResponse<OllamaModelsResponse>>(`/user/me/llm-settings/ollama-models${query}`)
      setOllamaModels(res.data.models)
      setOllamaBaseUrl(res.data.baseUrl)
      setOllamaAvailable(res.data.available)
      if (res.data.baseUrl && !baseUrl.trim()) {
        setBaseUrl(res.data.baseUrl)
      }
      if (res.data.models.length) {
        const exact = res.data.models.some(item => item.name === model.trim())
        const latestAlias = res.data.models.find(item => item.name === `${model.trim()}:latest`)
        if (!exact && latestAlias) {
          setModel(latestAlias.name)
        } else if (!exact && !model.trim()) {
          setModel(res.data.models[0].name)
        } else if (!exact && model.trim() === DEFAULT_OLLAMA_MODEL) {
          setModel(res.data.models[0].name)
        }
      }
    } catch (error) {
      setOllamaModels([])
      setOllamaBaseUrl(null)
      setOllamaAvailable(false)
      setStatus({ type: 'error', text: (error as Error).message })
    } finally {
      setLoadingModels(false)
    }
  }

  const payload = () => ({
    provider,
    model: model.trim(),
    apiKey: apiKey.trim() || undefined,
    baseUrl: baseUrl.trim() || undefined,
  })

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await api.put<ApiResponse<UserLlmSettings>>('/user/me/llm-settings', payload())
      setSettings(res.data)
      setApiKey('')
      setStatus({ type: 'success', text: 'Configuração salva. O Ask Wasabi já vai usar este provider.' })
    } catch (error) {
      setStatus({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setStatus(null)
    setDismissOllamaDownload(false)
    try {
      const res = await api.post<ApiResponse<{ baseUrl?: string }>>('/user/me/llm-settings/test', payload())
      if (provider === 'ollama' && res.data.baseUrl) {
        setBaseUrl(res.data.baseUrl)
        void loadOllamaModels(res.data.baseUrl)
      }
      setStatus({
        type: 'success',
        text: provider === 'ollama'
          ? 'Ollama conectado. Salve para usar esse modelo no Ask Wasabi.'
          : 'Conexão validada com sucesso.',
      })
    } catch (error) {
      setStatus({ type: 'error', text: (error as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const shouldShowOllamaDownload =
    provider === 'ollama' &&
    status?.type === 'error' &&
    !dismissOllamaDownload

  return (
    <div>
      <Header title="Configurações" />
      <main className="settings-page">
        <section className="settings-card">
          <div className="settings-head">
            <div>
              <h1>Modelo do Wasabi AI</h1>
              <p>Escolha entre Ollama local ou uma chave de API. A configuração fica salva para o seu usuário.</p>
            </div>
            <div className={`settings-pill ${hasCurrentProviderKey || provider === 'ollama' ? 'ok' : 'warn'}`}>
              {provider === 'ollama' ? 'Local' : hasCurrentProviderKey ? 'Chave salva' : 'Pendente'}
            </div>
          </div>

          <div className="provider-grid">
            {PROVIDERS.map(item => (
              <button
                key={item.id}
                type="button"
                className={`provider-card ${provider === item.id ? 'active' : ''}`}
                onClick={() => selectProvider(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </button>
            ))}
          </div>

          <div className="settings-form">
            {provider === 'ollama' && ollamaModels.length > 0 ? (
              <label>
                <span>Modelo instalado</span>
                <select
                  value={model}
                  disabled={loading || loadingModels}
                  onChange={event => setModel(event.target.value)}
                >
                  {ollamaModels.map(item => (
                    <option key={item.name} value={item.name}>
                      {item.name}{item.parameterSize ? ` · ${item.parameterSize}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <span>Modelo</span>
                <input
                  value={model}
                  disabled={loading}
                  onChange={event => setModel(event.target.value)}
                  placeholder={selectedProvider.defaultModel}
                />
              </label>
            )}

            {provider !== 'ollama' && (
              <label>
                <span>Chave de API</span>
                <input
                  value={apiKey}
                  disabled={loading}
                  type="password"
                  autoComplete="off"
                  onChange={event => setApiKey(event.target.value)}
                  placeholder={settings?.hasApiKey && settings.provider === provider ? 'Chave salva. Digite outra para trocar.' : 'Cole sua chave aqui'}
                />
              </label>
            )}

            {provider === 'ollama' && (
              <div className="ollama-status-field">
                <span>Status do Ollama</span>
                <div className={`ollama-status-row ${ollamaAvailable ? 'connected' : ''}`}>
                  <div className="ollama-status-main">
                    <i className="ollama-dot" aria-hidden="true" />
                    <strong>
                      {ollamaAvailable
                        ? `${ollamaModels.length} modelo${ollamaModels.length === 1 ? '' : 's'} instalado${ollamaModels.length === 1 ? '' : 's'}`
                        : 'Ollama não conectado'}
                    </strong>
                  </div>
                  <div className="ollama-status-actions">
                    <button type="button" className="refresh" onClick={() => void loadOllamaModels()} disabled={loadingModels}>
                      {loadingModels ? 'Atualizando' : 'Atualizar'}
                    </button>
                    <button type="button" onClick={() => setShowAdvanced(prev => !prev)}>
                      {showAdvanced ? 'Ocultar' : 'Endpoint'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {provider === 'ollama' && showAdvanced && (
            <label className="advanced-url">
              <span>Endpoint do Ollama</span>
              <input
                value={baseUrl}
                disabled={loading}
                onChange={event => setBaseUrl(event.target.value)}
                placeholder="Detecção automática"
              />
            </label>
          )}

          {provider === 'ollama' && (
            <div className="ollama-steps">
              <div>
                <b>1</b>
                <span>Abra o Ollama</span>
              </div>
              <div>
                <b>2</b>
                <span>Escolha qualquer modelo instalado</span>
              </div>
              <div>
                <b>3</b>
                <span>Teste e salve a conexão</span>
              </div>
            </div>
          )}

          {status && <div className={`settings-status ${status.type}`}>{status.text}</div>}

          {shouldShowOllamaDownload && (
            <div className="ollama-download-card">
              <div>
                <strong>Ollama não encontrado nesta máquina</strong>
                <p>Instale o Ollama, abra o app e depois volte para testar a conexão novamente.</p>
              </div>
              <div className="ollama-download-actions">
                <button type="button" className="quiet" onClick={() => setDismissOllamaDownload(true)}>
                  Agora não
                </button>
                <a href={OLLAMA_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                  Baixar Ollama
                </a>
              </div>
            </div>
          )}

          <div className="settings-actions">
            <button type="button" className="secondary" disabled={testing || saving || loading || !model.trim() || (needsApiKey && !apiKey.trim() && !hasCurrentProviderKey)} onClick={testConnection}>
              {testing ? 'Testando...' : 'Testar conexão'}
            </button>
            <button type="button" className="primary" disabled={saving || loading || !model.trim()} onClick={save}>
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>
        </section>
      </main>

      <style>{`
        .settings-page {
          padding: 18px 16px 28px 0;
          max-width: 920px;
        }
        .settings-card {
          border: 1px solid var(--bd);
          border-radius: 14px;
          background: rgba(20,20,20,.92);
          padding: 20px;
          box-shadow: 0 16px 40px rgba(0,0,0,.16);
        }
        .settings-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }
        h1 {
          margin: 0 0 6px;
          font-size: 22px;
          line-height: 1.1;
          letter-spacing: 0;
        }
        p {
          margin: 0;
          color: var(--t2);
          font-size: 13px;
          line-height: 1.45;
          max-width: 620px;
        }
        .settings-pill {
          height: 34px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid var(--bd);
          color: var(--t2);
        }
        .settings-pill.ok {
          color: var(--gr);
          border-color: rgba(17,199,111,.24);
          background: rgba(17,199,111,.08);
        }
        .settings-pill.warn {
          color: var(--yw);
          border-color: rgba(255,204,0,.24);
          background: rgba(255,204,0,.08);
        }
        .provider-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }
        .provider-card {
          min-height: 104px;
          text-align: left;
          border: 1px solid var(--bd);
          border-radius: 12px;
          background: var(--s2);
          color: var(--tx);
          padding: 14px;
          cursor: pointer;
          transition: border-color .16s, background .16s, transform .16s;
        }
        .provider-card:hover {
          border-color: rgba(17,199,111,.28);
          transform: translateY(-1px);
        }
        .provider-card.active {
          border-color: rgba(17,199,111,.42);
          background: var(--gd);
        }
        .provider-card span {
          display: block;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .provider-card small {
          display: block;
          color: var(--t2);
          font-size: 11px;
          line-height: 1.4;
        }
        .settings-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          align-items: end;
        }
        label {
          display: grid;
          gap: 7px;
        }
        .ollama-status-field {
          display: grid;
          gap: 7px;
          min-width: 0;
        }
        label span,
        .ollama-status-field > span {
          color: var(--t2);
          text-transform: uppercase;
          letter-spacing: .08em;
          font-size: 10px;
          font-weight: 800;
        }
        input,
        select {
          height: 44px;
          width: 100%;
          border: 1px solid var(--bd);
          border-radius: 10px;
          background: var(--s1);
          color: var(--tx);
          outline: none;
          padding: 0 12px;
          font-size: 13px;
          font-family: inherit;
        }
        select {
          appearance: none;
          background-image: linear-gradient(45deg, transparent 50%, var(--t2) 50%), linear-gradient(135deg, var(--t2) 50%, transparent 50%);
          background-position: calc(100% - 18px) 19px, calc(100% - 12px) 19px;
          background-size: 6px 6px, 6px 6px;
          background-repeat: no-repeat;
          padding-right: 34px;
        }
        input:focus,
        select:focus {
          border-color: rgba(17,199,111,.45);
        }
        .ollama-status-row {
          width: 100%;
          height: 44px;
          min-height: 44px;
          border: 1px solid var(--bd);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          padding: 0 10px 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: border-color .16s, background .16s;
        }
        .ollama-status-row.connected {
          border-color: rgba(17,199,111,.24);
          background: rgba(17,199,111,.04);
        }
        .ollama-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--t3);
          box-shadow: 0 0 0 5px rgba(255,255,255,.035);
          flex: 0 0 auto;
        }
        .ollama-status-row.connected .ollama-dot {
          background: var(--gr);
          box-shadow: 0 0 0 5px rgba(17,199,111,.09);
        }
        .ollama-status-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .advanced-url span {
          color: var(--t2);
          text-transform: uppercase;
          letter-spacing: .08em;
          font-size: 10px;
          font-weight: 800;
        }
        .ollama-status-main strong {
          color: var(--tx);
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ollama-status-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }
        .ollama-status-actions button {
          height: 30px;
          border-radius: 8px;
          border: 1px solid var(--bd);
          background: var(--s2);
          color: var(--t2);
          font-size: 10px;
          font-weight: 800;
          padding: 0 10px;
          cursor: pointer;
          white-space: nowrap;
        }
        .ollama-status-actions .refresh {
          border-color: rgba(17,199,111,.2);
          color: var(--gr);
          background: rgba(17,199,111,.055);
        }
        .ollama-status-actions button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }
        .advanced-url {
          margin-top: 12px;
        }
        .ollama-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }
        .ollama-steps div {
          border: 1px solid var(--bd);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }
        .ollama-steps b {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          background: var(--gd);
          color: var(--gr);
          font-size: 11px;
        }
        .ollama-steps span {
          color: var(--t2);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.25;
        }
        .settings-status {
          margin-top: 12px;
          border-radius: 10px;
          padding: 11px 12px;
          font-size: 12px;
          font-weight: 700;
        }
        .settings-status.success {
          color: var(--gr);
          background: rgba(17,199,111,.08);
          border: 1px solid rgba(17,199,111,.22);
        }
        .settings-status.error {
          color: var(--rd);
          background: rgba(255,71,87,.08);
          border: 1px solid rgba(255,71,87,.22);
        }
        .settings-status.info {
          color: var(--t2);
          background: rgba(255,255,255,.04);
          border: 1px solid var(--bd);
        }
        .ollama-download-card {
          margin-top: 12px;
          border: 1px solid rgba(17,199,111,.22);
          border-radius: 12px;
          background: rgba(17,199,111,.055);
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .ollama-download-card strong {
          display: block;
          color: var(--tx);
          font-size: 13px;
          margin-bottom: 4px;
        }
        .ollama-download-card p {
          font-size: 12px;
          max-width: 520px;
        }
        .ollama-download-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }
        .ollama-download-actions button,
        .ollama-download-actions a {
          height: 36px;
          border-radius: 10px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }
        .ollama-download-actions .quiet {
          border: 1px solid var(--bd);
          background: var(--s2);
          color: var(--t2);
        }
        .ollama-download-actions a {
          border: 1px solid transparent;
          background: var(--gr);
          color: #03110a;
        }
        .settings-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }
        .settings-actions button {
          height: 42px;
          border-radius: 10px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          border: 1px solid var(--bd);
        }
        .settings-actions button:disabled {
          opacity: .52;
          cursor: not-allowed;
        }
        .secondary {
          background: var(--s2);
          color: var(--tx);
        }
        .primary {
          border-color: transparent !important;
          background: var(--gr);
          color: #03110a;
        }
        @media (max-width: 760px) {
          .settings-page {
            padding-right: 12px;
          }
          .settings-head,
          .settings-actions,
          .ollama-download-card {
            flex-direction: column;
            align-items: stretch;
          }
          .ollama-download-actions {
            justify-content: flex-end;
          }
          .provider-grid,
          .settings-form,
          .ollama-steps {
            grid-template-columns: 1fr;
          }
          .ollama-status-row {
            max-width: none;
          }
          .ollama-status-row {
            align-items: stretch;
            flex-direction: column;
            height: auto;
            padding: 8px 10px;
          }
          .ollama-status-actions {
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  )
}
