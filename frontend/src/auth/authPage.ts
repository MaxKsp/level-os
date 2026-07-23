import { AuthSessionExchangeError, exchangePhpSession, getSupabaseClient } from "./supabaseClient"
import { authCallbackIntent } from "./authCallback"

function setBusy(form: HTMLFormElement, busy: boolean): void {
  form.setAttribute("aria-busy", String(busy))
  form.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = busy })
}

function message(form: HTMLFormElement, text: string, kind: "error" | "notice" = "error"): void {
  let element = form.querySelector<HTMLElement>("[data-auth-feedback]")
  if (!element) {
    element = document.createElement("div")
    element.dataset.authFeedback = "true"
    const heading = form.querySelector(".sub")
    heading?.insertAdjacentElement("afterend", element)
  }
  element.className = kind
  element.setAttribute("role", kind === "error" ? "alert" : "status")
  element.textContent = text
}

function callbackUrl(mode?: string): string {
  const url = new URL("/auth-supabase-callback.php", window.location.origin)
  if (mode) url.searchParams.set("mode", mode)
  return url.toString()
}

async function finishSession(form: HTMLFormElement, accessSession: Parameters<typeof exchangePhpSession>[0]): Promise<void> {
  const result = await exchangePhpSession(accessSession)
  if (result === "authenticated") {
    window.location.assign("/index.php")
    return
  }
  if (result === "mfa_required") {
    window.location.reload()
    return
  }
  if (result === "supabase_mfa_required") {
    await promptSupabaseMfa(form)
    return
  }
  form.dataset.legacyFallback = "true"
  message(form, "Essa conta já existe. Entre uma vez com sua senha atual para vinculá-la com segurança.", "notice")
}

async function promptSupabaseMfa(form: HTMLFormElement): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("MFA indisponível.")
  const { data, error } = await supabase.mfa.listFactors()
  const factor = data?.totp.find((item) => item.status === "verified")
  if (error || !factor) throw new Error("Fator de autenticação não encontrado.")
  form.dataset.supabaseMfa = "true"
  form.innerHTML = `
    <h1>Verificação em duas etapas</h1>
    <p class="sub">Digite o código atual do seu aplicativo autenticador.</p>
    <label for="supabase-mfa-code">Código de verificação</label>
    <input id="supabase-mfa-code" name="mfa_code" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" pattern="[0-9]{6}" maxlength="6" required autofocus>
    <button type="submit">Confirmar e entrar</button>
    <div class="footer"><a href="/logout.php">Cancelar</a></div>`
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const code = String(new FormData(form).get("mfa_code") ?? "").replace(/\D/g, "").slice(0, 6)
    if (code.length !== 6) { message(form, "Digite o código de seis dígitos."); return }
    setBusy(form, true)
    const verified = await supabase.mfa.challengeAndVerify({ factorId: factor.id, code })
    if (verified.error) { message(form, "Código inválido ou expirado."); setBusy(form, false); return }
    const { data: sessionData } = await supabase.getSession()
    if (!sessionData.session) { message(form, "Não foi possível atualizar a sessão."); setBusy(form, false); return }
    try { await finishSession(form, sessionData.session) } catch { message(form, "Não foi possível concluir o acesso."); setBusy(form, false) }
  })
  form.querySelector<HTMLInputElement>("#supabase-mfa-code")?.focus()
}

function bindLogin(): void {
  const supabase = getSupabaseClient()
  const form = document.querySelector<HTMLFormElement>("form[data-supabase-login]")
  if (!supabase || !form || document.body.dataset.linkRequired === "true") return
  form.addEventListener("submit", async (event) => {
    if (form.dataset.supabaseMfa === "true") return
    if (form.dataset.legacyFallback === "true") return
    event.preventDefault()
    const email = String(new FormData(form).get("username") ?? "").trim().toLowerCase()
    const password = String(new FormData(form).get("password") ?? "")
    if (!email.includes("@")) {
      message(form, "Use seu e-mail para entrar pelo novo acesso.")
      return
    }
    setBusy(form, true)
    const { data, error } = await supabase.signInWithPassword({ email, password })
    if (error || !data.session) {
      message(form, "E-mail ou senha inválidos.")
      setBusy(form, false)
      return
    }
    try {
      await finishSession(form, data.session)
    } catch {
      message(form, "Não foi possível concluir o acesso. Tente novamente.")
    } finally {
      setBusy(form, false)
    }
  })

  const google = document.querySelector<HTMLAnchorElement>("[data-supabase-google]")
  google?.addEventListener("click", async (event) => {
    event.preventDefault()
    const { error } = await supabase.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    })
    if (error) message(form, "Não foi possível iniciar o acesso com Google.")
  })

  // Ao reabrir o app, o SDK pode renovar a sessao Supabase antes que exista
  // novamente uma sessao PHP. Refazemos a ponte sem pedir senha outra vez.
  void supabase.getSession().then(async ({ data }) => {
    if (!data.session) return
    try { await finishSession(form, data.session) } catch { /* formulario permanece disponivel */ }
  })
}

function bindRegister(): void {
  const supabase = getSupabaseClient()
  const form = document.querySelector<HTMLFormElement>("form[data-supabase-register]")
  if (!supabase || !form) return
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const values = new FormData(form)
    const username = String(values.get("username") ?? "").trim()
    const email = String(values.get("email") ?? "").trim().toLowerCase()
    const password = String(values.get("password") ?? "")
    const confirm = String(values.get("confirm") ?? "")
    if (password !== confirm) { message(form, "As senhas não coincidem."); return }
    setBusy(form, true)
    const { data, error } = await supabase.signUp({
      email,
      password,
      options: { data: { username }, emailRedirectTo: callbackUrl() },
    })
    if (error) {
      message(form, "Não foi possível criar a conta. Confira os dados e tente novamente.")
      setBusy(form, false)
      return
    }
    if (data.session) {
      try { await finishSession(form, data.session) } catch { message(form, "Conta criada, mas o acesso ainda não foi concluído.") }
    } else {
      message(form, "Conta criada. Enviamos um link para confirmar seu e-mail.", "notice")
    }
    setBusy(form, false)
  })
}

function bindForgotPassword(): void {
  const supabase = getSupabaseClient()
  const form = document.querySelector<HTMLFormElement>("form[data-supabase-forgot]")
  if (!supabase || !form) return
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const email = String(new FormData(form).get("email") ?? "").trim().toLowerCase()
    setBusy(form, true)
    await supabase.resetPasswordForEmail(email, { redirectTo: callbackUrl("recovery") })
    message(form, "Se existir uma conta com esse e-mail, enviaremos um link de recuperação.", "notice")
    setBusy(form, false)
  })
}

async function runCallback(): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) { window.location.replace("/login.php?auth=unavailable"); return }
  const searchParams = new URLSearchParams(window.location.search)
  const code = searchParams.get("code")
  let redirectType: string | null = null
  let { data } = await supabase.getSession()

  if (searchParams.has("error") || searchParams.has("error_code")) {
    window.location.replace("/login.php?auth=expired")
    return
  }

  if (code) {
    const exchanged = await supabase.exchangeCodeForSession(code)
    if (exchanged.error) {
      window.location.replace("/login.php?auth=expired")
      return
    }
    data = exchanged.data
    const callbackData = exchanged.data as typeof exchanged.data & { redirectType?: string | null }
    redirectType = callbackData.redirectType ?? null
  }

  if (!code && authCallbackIntent(searchParams, null) === "recovery") {
    window.location.replace("/login.php?auth=expired")
    return
  }
  if (!data.session) { window.location.replace("/login.php?auth=expired"); return }
  if (authCallbackIntent(searchParams, redirectType) === "recovery") {
    window.location.replace("/reset-password.php?supabase=1")
    return
  }
  try {
    const result = await exchangePhpSession(data.session)
    if (result === "link_required") window.location.replace("/login.php?link_required=1")
    else if (result === "mfa_required" || result === "supabase_mfa_required") window.location.replace("/login.php")
    else window.location.replace("/index.php")
  } catch (error) {
    const status = error instanceof AuthSessionExchangeError ? error.code : "failed"
    window.location.replace(`/login.php?auth=${encodeURIComponent(status)}`)
  }
}

function bindPasswordUpdate(): void {
  const supabase = getSupabaseClient()
  const form = document.querySelector<HTMLFormElement>("form[data-supabase-reset]")
  if (!supabase || !form) return
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const values = new FormData(form)
    const password = String(values.get("password") ?? "")
    const confirm = String(values.get("confirm") ?? "")
    if (password.length < 8) { message(form, "A senha precisa ter pelo menos 8 caracteres."); return }
    if (password !== confirm) { message(form, "As senhas não coincidem."); return }
    setBusy(form, true)
    const { error } = await supabase.updateUser({ password })
    if (error) { message(form, "O link expirou ou não foi possível atualizar a senha."); setBusy(form, false); return }
    await supabase.signOut()
    form.replaceChildren(Object.assign(document.createElement("div"), {
      className: "notice",
      textContent: "Senha atualizada. Volte ao login para entrar novamente.",
    }))
    const footer = document.createElement("div")
    footer.className = "footer"
    footer.innerHTML = '<a href="/login.php">Voltar para entrar</a>'
    form.appendChild(footer)
  })
}

async function runLogout(): Promise<void> {
  await getSupabaseClient()?.signOut().catch(() => undefined)
  window.location.replace("/login.php")
}

const page = document.body.dataset.authPage
if (page === "login") bindLogin()
else if (page === "register") bindRegister()
else if (page === "forgot") bindForgotPassword()
else if (page === "callback") void runCallback()
else if (page === "reset") bindPasswordUpdate()
else if (page === "logout") void runLogout()
