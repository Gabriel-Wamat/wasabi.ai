export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export const getTauriAPI = () => {
  if (isTauri()) {
    return (window as any).__TAURI__
  }

  return null
}
