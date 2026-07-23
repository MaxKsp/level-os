/**
 * Migração única das chaves legadas "orby_*" do localStorage para o namespace
 * "level-os:*". Importado como PRIMEIRO módulo em main.tsx: roda antes de
 * qualquer store ler as chaves novas. Sem storage disponível, sai em silêncio.
 */
const LEGACY_TO_NEW: ReadonlyArray<readonly [string, string]> = [
  ["orby_theme", "level-os:theme"],
  ["orby_tasks", "level-os:tasks"],
  ["orby_exercises", "level-os:exercises"],
  ["orby_finance_v1", "level-os:finance:v1"],
  ["orby_notifications_v1", "level-os:notifications:v1"],
  ["orby_profile_v1", "level-os:profile:v1"],
  ["orby_training_v2", "level-os:training:v2"],
]

try {
  for (const [legacy, next] of LEGACY_TO_NEW) {
    const value = window.localStorage.getItem(legacy)
    if (value !== null) {
      if (window.localStorage.getItem(next) === null) {
        window.localStorage.setItem(next, value)
      }
      window.localStorage.removeItem(legacy)
    }
  }
} catch {
  // Sem localStorage (modo privado restrito): o app segue com defaults.
}

export {}
