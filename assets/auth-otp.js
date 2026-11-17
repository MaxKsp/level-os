(() => {
  const instances = new WeakMap();

  const digitsOnly = (value, length) => String(value ?? "").replace(/\D/g, "").slice(0, length);

  function enhance(source) {
    if (!(source instanceof HTMLInputElement)) return null;
    if (instances.has(source)) return instances.get(source);

    const length = Number.parseInt(source.dataset.otpLength || "6", 10) || 6;
    const group = document.createElement("div");
    group.className = "auth-otp";
    group.dataset.status = source.dataset.otpStatus || "idle";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", source.getAttribute("aria-label") || "Código de verificação");

    const cells = document.createElement("div");
    cells.className = "auth-otp-cells";
    const inputs = [];

    const sync = (value, focusIndex) => {
      const clean = digitsOnly(value, length);
      source.value = clean;
      inputs.forEach((input, index) => { input.value = clean[index] || ""; });
      source.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof focusIndex === "number") inputs[Math.max(0, Math.min(focusIndex, length - 1))]?.focus();
    };

    for (let index = 0; index < length; index += 1) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "auth-otp-cell";
      input.inputMode = "numeric";
      input.pattern = "[0-9]*";
      input.maxLength = 1;
      input.autocomplete = index === 0 ? "one-time-code" : "off";
      input.setAttribute("aria-label", `Código de verificação, dígito ${index + 1} de ${length}`);
      input.style.setProperty("--otp-index", String(index));
      input.addEventListener("focus", () => input.select());
      input.addEventListener("input", () => {
        group.dataset.status = "idle";
        const next = inputs.map((item) => item.value).join("").split("");
        next[index] = digitsOnly(input.value, 1);
        sync(next.join(""), next[index] && index < length - 1 ? index + 1 : index);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace") {
          event.preventDefault();
          const current = digitsOnly(source.value, length).split("");
          if (input.value) current[index] = "";
          else if (index > 0) current[index - 1] = "";
          sync(current.join(""), input.value ? index : index - 1);
        } else if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault(); inputs[index - 1].focus();
        } else if (event.key === "ArrowRight" && index < length - 1) {
          event.preventDefault(); inputs[index + 1].focus();
        } else if (event.key === "Home") {
          event.preventDefault(); inputs[0].focus();
        } else if (event.key === "End") {
          event.preventDefault(); inputs[length - 1].focus();
        }
      });
      input.addEventListener("paste", (event) => {
        event.preventDefault();
        const pasted = digitsOnly(event.clipboardData?.getData("text"), length);
        if (pasted) sync(pasted, Math.min(pasted.length, length) - 1);
      });
      inputs.push(input);
      cells.appendChild(input);
    }

    const success = document.createElement("div");
    success.className = "auth-otp-success";
    success.setAttribute("role", "status");
    success.setAttribute("aria-live", "polite");
    success.innerHTML = '<span aria-hidden="true">✓</span><strong>Verificado com sucesso</strong>';
    group.append(cells, success);
    source.classList.add("auth-otp-source-hidden");
    source.insertAdjacentElement("afterend", group);

    if (source.dataset.otpBackup === "true") {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "auth-otp-backup-toggle";
      toggle.textContent = "Usar código de recuperação";
      toggle.addEventListener("click", () => {
        const backupMode = group.dataset.backup !== "true";
        group.dataset.backup = String(backupMode);
        group.hidden = backupMode;
        cells.hidden = backupMode;
        source.classList.toggle("auth-otp-source-hidden", !backupMode);
        source.value = "";
        toggle.textContent = backupMode ? "Usar código do autenticador" : "Usar código de recuperação";
        (backupMode ? source : inputs[0]).focus();
      });
      group.insertAdjacentElement("afterend", toggle);
    }

    sync(source.value);
    const api = {
      setStatus(status) {
        group.dataset.status = status;
        group.setAttribute("aria-invalid", status === "error" ? "true" : "false");
      },
      focus() { inputs[Math.min(digitsOnly(source.value, length).length, length - 1)]?.focus(); },
    };
    instances.set(source, api);
    if (source.autofocus) window.requestAnimationFrame(() => api.focus());
    return api;
  }

  function setStatus(source, status) {
    enhance(source)?.setStatus(status);
  }

  window.LevelOtp = { enhance, setStatus };

  const scan = (root = document) => root.querySelectorAll?.("input[data-otp-input]").forEach(enhance);
  const initialize = () => {
    scan();
    new MutationObserver((entries) => {
      for (const entry of entries) for (const node of entry.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches("input[data-otp-input]")) enhance(node);
        scan(node);
      }
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
