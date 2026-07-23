(() => {
  const eyeIcon = (visible) => visible
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 5a16 16 0 0 1-2.2 2.6M6.6 6.6C4.3 8.1 3 10 3 10s3.5 5 9 5c1.2 0 2.3-.2 3.3-.6"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'

  function addStrengthMeter(input, wrapper, index) {
    if (input.name !== "password" || input.autocomplete !== "new-password") return

    const meter = document.createElement("div")
    const meterId = `${input.id || `password-${index}`}-strength`
    meter.id = meterId
    meter.className = "password-strength"
    meter.dataset.level = "0"
    meter.innerHTML = `
      <div class="password-strength__meta">
        <span>Força da senha</span>
        <strong data-password-strength-label>Digite sua senha</strong>
      </div>
      <div class="password-strength__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <ul class="password-rules" aria-label="Critérios recomendados para uma senha forte">
        <li data-password-rule="length">8+ caracteres</li>
        <li data-password-rule="case">Maiúscula e minúscula</li>
        <li data-password-rule="number">Número</li>
        <li data-password-rule="symbol">Símbolo</li>
      </ul>`
    wrapper.insertAdjacentElement("afterend", meter)

    const descriptions = [input.getAttribute("aria-describedby"), meterId].filter(Boolean)
    input.setAttribute("aria-describedby", descriptions.join(" "))
    const label = meter.querySelector("[data-password-strength-label]")

    const update = () => {
      const value = input.value
      const rules = {
        length: value.length >= 8,
        case: /[a-z]/.test(value) && /[A-Z]/.test(value),
        number: /\d/.test(value),
        symbol: /[^A-Za-z0-9]/.test(value),
      }
      Object.entries(rules).forEach(([name, valid]) => {
        meter.querySelector(`[data-password-rule="${name}"]`)?.classList.toggle("is-valid", valid)
      })

      const checks = Object.values(rules).filter(Boolean).length
      const level = value.length === 0 ? 0 : checks <= 1 ? 1 : checks === 2 ? 2 : checks === 3 ? 3 : 4
      const labels = ["Digite sua senha", "Fraca", "Razoável", "Boa", "Forte"]
      meter.dataset.level = String(level)
      if (label) label.textContent = labels[level]
    }

    input.addEventListener("input", update)
    update()
  }

  function enhancePassword(input, index) {
    if (input.closest(".password-field")) return

    const wrapper = document.createElement("div")
    wrapper.className = "password-field"
    input.insertAdjacentElement("beforebegin", wrapper)
    wrapper.appendChild(input)

    const toggle = document.createElement("button")
    toggle.type = "button"
    toggle.className = "password-toggle"
    toggle.setAttribute("aria-label", "Mostrar senha")
    toggle.setAttribute("aria-pressed", "false")
    if (input.id) toggle.setAttribute("aria-controls", input.id)
    toggle.innerHTML = eyeIcon(false)
    toggle.addEventListener("click", () => {
      const visible = input.type === "password"
      input.type = visible ? "text" : "password"
      toggle.setAttribute("aria-label", visible ? "Ocultar senha" : "Mostrar senha")
      toggle.setAttribute("aria-pressed", String(visible))
      toggle.innerHTML = eyeIcon(visible)
      input.focus({ preventScroll: true })
    })
    wrapper.appendChild(toggle)
    addStrengthMeter(input, wrapper, index)
  }

  const initialize = () => {
    document.querySelectorAll('input[type="password"]').forEach((input, index) => {
      if (input instanceof HTMLInputElement) enhancePassword(input, index)
    })
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true })
  else initialize()
})()
