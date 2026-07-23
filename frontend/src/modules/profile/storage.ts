import { useSyncExternalStore } from "react"
import { userStorageKey } from "../../lib/userStorage"

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
let cachedProfileKey: string | null = null

function profileStorageKey(): string {
  return userStorageKey(PROFILE_KEY)
}

export function loadProfileData(): ProfileData {
  try {
    return {
      ...DEFAULT_PROFILE,
      ...JSON.parse(localStorage.getItem(profileStorageKey()) ?? "{}"),
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveProfileData(profile: ProfileData): void {
  cachedProfile = { ...DEFAULT_PROFILE, ...profile }
  cachedProfileKey = profileStorageKey()
  localStorage.setItem(cachedProfileKey, JSON.stringify(cachedProfile))
  window.dispatchEvent(new Event(PROFILE_EVENT))
}

function getSnapshot(): ProfileData {
  const key = profileStorageKey()
  if (!cachedProfile || cachedProfileKey !== key) {
    cachedProfile = loadProfileData()
    cachedProfileKey = key
  }
  return cachedProfile
}

function subscribe(listener: () => void): () => void {
  const sync = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== profileStorageKey()) return
    cachedProfile = loadProfileData()
    cachedProfileKey = profileStorageKey()
    listener()
  }
  window.addEventListener(PROFILE_EVENT, sync)
  window.addEventListener("storage", sync)
  return () => {
    window.removeEventListener(PROFILE_EVENT, sync)
    window.removeEventListener("storage", sync)
  }
}

export function useProfileData(): ProfileData {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PROFILE)
}
