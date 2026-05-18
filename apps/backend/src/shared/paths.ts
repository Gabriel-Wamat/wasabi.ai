import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'

/**
 * Resolve o diretório de dados do Wasabi seguindo convenção por SO:
 *   - macOS:   ~/Library/Application Support/Wasabi
 *   - Linux:   $XDG_DATA_HOME/wasabi  ou  ~/.local/share/wasabi
 *   - Windows: %APPDATA%\Wasabi
 *
 * Override: defina WASABI_DATA_DIR no env (útil para testes).
 */
export function getDataDir(): string {
  const override = process.env.WASABI_DATA_DIR
  if (override && override.trim()) return override

  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Wasabi')
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
    return join(appData, 'Wasabi')
  }
  // linux + outros
  const xdg = process.env.XDG_DATA_HOME
  return xdg ? join(xdg, 'wasabi') : join(homedir(), '.local', 'share', 'wasabi')
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

export interface WasabiPaths {
  root:       string
  databaseFile: string
  filesDir:    string
  modelsDir:   string
  configFile:  string
}

let cached: WasabiPaths | null = null

export function getPaths(): WasabiPaths {
  if (cached) return cached

  const root = getDataDir()
  ensureDir(root)

  const filesDir   = join(root, 'files')
  const modelsDir  = join(root, 'models')
  ensureDir(filesDir)
  ensureDir(modelsDir)

  cached = {
    root,
    databaseFile: join(root, 'data.db'),
    filesDir,
    modelsDir,
    configFile:   join(root, 'config.json'),
  }
  return cached
}
