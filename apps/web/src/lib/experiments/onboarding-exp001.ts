'use client'

export const EXPERIMENT_KEY = 'exp_001_onboarding_step1_cta'

const BUCKET_STORAGE_KEY = 'exp001_onboarding_bucket'
const SESSION_STORAGE_KEY = 'exp001_onboarding_session_id'
const ASSIGNED_AT_STORAGE_KEY = 'exp001_onboarding_assigned_at'
const EXPOSURE_TRACKED_STORAGE_KEY = 'exp001_onboarding_exposure_tracked'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const FLAG_VALUE = process.env.NEXT_PUBLIC_EXP001_ONBOARDING_ENABLED
const EXPERIMENT_ENABLED = FLAG_VALUE === '1' || FLAG_VALUE === 'true'

export type OnboardingExperimentVariant = 'control' | 'continuar_no_secondary'

export type OnboardingExperimentAssignment = {
  experimentKey: typeof EXPERIMENT_KEY
  variant: OnboardingExperimentVariant
  assignmentKey: string
  assignmentExpiresAt: string
  sessionId: string
  enabled: boolean
}

type OnboardingEventName =
  | 'experiment_assigned'
  | 'onboarding_step_viewed'
  | 'onboarding_cta_click'
  | 'onboarding_step_progressed'
  | 'experiment_exposure_error'

type CommonOnboardingEventProps = {
  variant: OnboardingExperimentVariant | null
  session_id: string
  user_id?: string | null
  anonymous_id?: string | null
  company_id?: string | null
  workspace_id?: string | null
  surface?: 'web'
  locale?: 'pt-BR'
  environment?: string
  schema_version?: '1'
  is_internal?: boolean
  is_test?: boolean
}

type OnboardingEventProps = CommonOnboardingEventProps & {
  assignment_key?: string
  assignment_expires_at?: string
  allocation?: '50_50'
  step?: 1
  from?: 1
  to?: 2
  step_id?: 'onboarding_step_1'
  next_step_id?: string
  secondary_ctas_present?: boolean
  button_label?: string
  error_code?: string
  error_stage?: 'assignment' | 'render' | 'tracking' | 'persistence'
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `exp001-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getStoredSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const sessionId = createSessionId()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  return sessionId
}

function getAssignmentExpiry(assignedAt: number) {
  return new Date(assignedAt + THIRTY_DAYS_MS).toISOString()
}

function getStoredAssignedAt() {
  return Number(window.localStorage.getItem(ASSIGNED_AT_STORAGE_KEY) ?? 0)
}

function getStickyVariant(): OnboardingExperimentVariant {
  const assignedAt = Number(window.localStorage.getItem(ASSIGNED_AT_STORAGE_KEY) ?? 0)
  const storedBucket = window.localStorage.getItem(BUCKET_STORAGE_KEY) as OnboardingExperimentVariant | null
  const assignmentIsFresh = assignedAt > 0 && Date.now() - assignedAt < THIRTY_DAYS_MS

  if ((storedBucket === 'control' || storedBucket === 'continuar_no_secondary') && assignmentIsFresh) {
    return storedBucket
  }

  const bucket = Math.random() < 0.5 ? 'control' : 'continuar_no_secondary'
  window.localStorage.setItem(BUCKET_STORAGE_KEY, bucket)
  window.localStorage.setItem(ASSIGNED_AT_STORAGE_KEY, String(Date.now()))
  window.localStorage.removeItem(EXPOSURE_TRACKED_STORAGE_KEY)
  return bucket
}

export function getOnboardingExperimentAssignment(): OnboardingExperimentAssignment {
  if (typeof window === 'undefined') {
    return {
      experimentKey: EXPERIMENT_KEY,
      variant: 'control',
      assignmentKey: 'server',
      assignmentExpiresAt: new Date(Date.now() + THIRTY_DAYS_MS).toISOString(),
      sessionId: 'server',
      enabled: false,
    }
  }

  if (!EXPERIMENT_ENABLED) {
    return {
      experimentKey: EXPERIMENT_KEY,
      variant: 'control',
      assignmentKey: 'flag_disabled',
      assignmentExpiresAt: new Date(Date.now() + THIRTY_DAYS_MS).toISOString(),
      sessionId: getStoredSessionId(),
      enabled: false,
    }
  }

  const variant = getStickyVariant()
  const assignedAt = getStoredAssignedAt()

  return {
    experimentKey: EXPERIMENT_KEY,
    variant,
    assignmentKey: getStoredSessionId(),
    assignmentExpiresAt: getAssignmentExpiry(assignedAt),
    sessionId: getStoredSessionId(),
    enabled: true,
  }
}

export function trackOnboardingEvent(name: OnboardingEventName, props: OnboardingEventProps) {
  if (typeof window === 'undefined') return

  const payload = {
    event: name,
    event_id: createSessionId(),
    event_name: name,
    experiment_key: EXPERIMENT_KEY,
    event_time: new Date().toISOString(),
    source: 'web',
    surface: 'web',
    locale: 'pt-BR',
    user_id: null,
    anonymous_id: props.session_id,
    experiment_session_id: props.session_id,
    company_id: null,
    workspace_id: null,
    environment: process.env.NODE_ENV ?? 'development',
    schema_version: '1',
    is_internal: false,
    is_test: process.env.NODE_ENV === 'test',
    ...props,
  }

  window.dispatchEvent(new CustomEvent('personalhub:analytics', { detail: payload }))
  ;(window as any).dataLayer?.push(payload)
}

export function trackExperimentAssigned(assignment: OnboardingExperimentAssignment) {
  if (typeof window === 'undefined' || !assignment.enabled) return

  const exposureKey = `${assignment.variant}:${assignment.assignmentExpiresAt}`
  if (window.localStorage.getItem(EXPOSURE_TRACKED_STORAGE_KEY) === exposureKey) return

  trackOnboardingEvent('experiment_assigned', {
    variant: assignment.variant,
    assignment_key: assignment.assignmentKey,
    assignment_expires_at: assignment.assignmentExpiresAt,
    allocation: '50_50',
    session_id: assignment.sessionId,
  })
  window.localStorage.setItem(EXPOSURE_TRACKED_STORAGE_KEY, exposureKey)
}
