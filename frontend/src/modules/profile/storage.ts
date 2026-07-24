import { useSyncExternalStore } from "react"

export interface ProfileData {
  name: string
  email: string
  phone: string
  city: string
  bio: string
}

export const PROFILE_KEY = "level-os:profile:v1"
const PROFILE_EVENT = "level-profile-change"

export const DEFAULT_PROFILE: ProfileData = {
  name: "Usuário",
  email: "",
  phone: "",
  city: "",
  bio: "Evoluindo finanças, rotina e saúde em um só sistema.",
}

let cachedProfile: ProfileData | null = null

export function loadProfileData(): ProfileData {
  return cachedProfile ?? DEFAULT_PROFILE
}

export function saveProfileData(profile: ProfileData): void {
  cachedProfile = { ...DEFAULT_PROFILE, ...profile }
  window.dispatchEvent(new Event(PROFILE_EVENT))
}

function getSnapshot(): ProfileData {
  return cachedProfile ?? DEFAULT_PROFILE
}

function subscribe(listener: () => void): () => void {
  const sync = () => listener()
  window.addEventListener(PROFILE_EVENT, sync)
  return () => {
    window.removeEventListener(PROFILE_EVENT, sync)
  }
}

export function useProfileData(): ProfileData {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PROFILE)
}
