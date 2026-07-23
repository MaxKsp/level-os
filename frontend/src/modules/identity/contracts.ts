export interface Identity {
  username: string
  email: string
  avatar: string | null
  totp_enabled: boolean
  notify_email: boolean
  has_password: boolean
  auth_provider: "supabase" | null
}

export const PREVIEW_IDENTITY: Identity = {
  username: "Usuário",
  email: "",
  avatar: null,
  totp_enabled: false,
  notify_email: false,
  has_password: false,
  auth_provider: null,
}
