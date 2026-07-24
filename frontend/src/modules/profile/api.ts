import type { ProfileData } from "./storage"

interface ProfilePayload {
  phone: string
  city: string
  bio: string
}

function csrfHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": window.CSRF_TOKEN ?? "",
  }
}

async function decode(response: Response): Promise<ProfilePayload> {
  const payload = await response.json().catch(() => null) as (ProfilePayload & { error?: string }) | null
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Não foi possível carregar os dados pessoais.")
  }
  return payload
}

export async function loadRemoteProfile(): Promise<ProfilePayload> {
  return decode(await fetch("/api/profile.php", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }))
}

export async function saveRemoteProfile(profile: ProfileData): Promise<ProfilePayload> {
  return decode(await fetch("/api/profile.php", {
    method: "POST",
    credentials: "same-origin",
    headers: csrfHeaders(),
    body: JSON.stringify({
      phone: profile.phone,
      city: profile.city,
      bio: profile.bio,
    }),
  }))
}
