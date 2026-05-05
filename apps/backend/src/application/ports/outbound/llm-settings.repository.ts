export type UserLlmProvider = 'openai' | 'anthropic' | 'ollama'

export interface UserLlmSettings {
  id:        string
  userId:    string
  provider:  UserLlmProvider
  model:     string
  apiKey?:   string
  baseUrl?:  string
  createdAt: Date
  updatedAt: Date
}

export interface PublicUserLlmSettings {
  provider:  UserLlmProvider
  model:     string
  baseUrl?:  string
  hasApiKey: boolean
  updatedAt?: Date
}

export interface SaveUserLlmSettingsInput {
  userId:   string
  provider: UserLlmProvider
  model:    string
  apiKey?:  string
  baseUrl?: string
}

export interface ILlmSettingsRepository {
  get(userId: string): Promise<UserLlmSettings | null>
  getPublic(userId: string): Promise<PublicUserLlmSettings>
  save(input: SaveUserLlmSettingsInput): Promise<PublicUserLlmSettings>
}
