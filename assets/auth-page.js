(() => {
  const root = document.documentElement;

  try {
    let stored = localStorage.getItem("level-os:theme");
    if (stored === null) {
      const legacy = localStorage.getItem("orby_theme");
      if (legacy !== null) {
        localStorage.setItem("level-os:theme", legacy);
        localStorage.removeItem("orby_theme");
        stored = legacy;
      }
    }
    root.dataset.theme = stored === "light" ? "light" : "dark";
    root.removeAttribute("data-accent");
    root.removeAttribute("data-metallic");
    localStorage.removeItem("orby_accent");
    localStorage.removeItem("orby_custom_accent");
  } catch (_) {
    root.dataset.theme = "dark";
    root.removeAttribute("data-accent");
  }

  const initialize = () => {
    const syncThemeColor = () => {
      const isDark = root.dataset.theme !== "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", isDark ? "#080b10" : "#f4f7fb");
    };
    const syncVisibility = () => root.toggleAttribute("data-page-hidden", document.hidden);
    document.addEventListener("visibilitychange", syncVisibility, { passive: true });
    syncVisibility();
    syncThemeColor();

    const element = document.getElementById("auth-intro-title");
    if (!element) return;

    const phrases = [
      "Tudo o que importa, num só lugar.",
      "Suas finanças e sua rotina, no próximo nível.",
      "Menos planilha, mais evolução.",
      "Seu dinheiro, seus hábitos, seu progresso.",
      "Organize hoje, evolua sempre.",
      "Cada dia, um nível acima.",
    ];
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let phraseIndex = 0;
    let paused = false;
    element.addEventListener("mouseenter", () => { paused = true; });
    element.addEventListener("mouseleave", () => { paused = false; });

    const stack = document.createElement("div");
    stack.className = "auth-intro-title-stack";
    element.parentNode?.insertBefore(stack, element);
    stack.appendChild(element);
    for (const phrase of phrases) {
      const ghost = document.createElement("h2");
      ghost.className = "auth-intro-title-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.textContent = phrase;
      stack.appendChild(ghost);
    }

    if (reduce) return;

    const chars = "!<>-_\\/[]{}=+*^?#________";
    let queue = [];
    let frame = 0;
    let request = 0;
    let resolve = null;

    const update = () => {
      let output = "";
      let complete = 0;
      for (const item of queue) {
        if (item.to === " ") {
          if (frame >= item.end) complete += 1;
          output += " ";
        } else if (frame >= item.end) {
          complete += 1;
          output += item.to;
        } else if (frame >= item.start) {
          if (!item.char || Math.random() < 0.28) {
            item.char = chars[Math.floor(Math.random() * chars.length)];
          }
          output += `<span class="scramble-dud">${item.char}</span>`;
        } else {
          output += item.from;
        }
      }
      element.innerHTML = output;
      if (complete === queue.length) resolve?.();
      else {
        request = requestAnimationFrame(update);
        frame += 1;
      }
    };

    const setText = (next) => {
      const current = element.textContent ?? "";
      const length = Math.max(current.length, next.length);
      const promise = new Promise((done) => { resolve = done; });
      queue = Array.from({ length }, (_, index) => {
        const start = Math.floor(Math.random() * 40);
        return {
          from: current[index] || "",
          to: next[index] || "",
          start,
          end: start + Math.floor(Math.random() * 40),
          char: "",
        };
      });
      cancelAnimationFrame(request);
      frame = 0;
      update();
      return promise;
    };

    window.setInterval(() => {
      if (paused || document.hidden) return;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      void setText(phrases[phraseIndex]);
    }, 4200);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
