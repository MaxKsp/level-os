/**
 * Bootstrap de tema antes da primeira pintura.
 *
 * Arquivo externo de propósito: a CSP do Level OS usa `script-src 'self'` e não
 * autoriza script inline. A chave é a mesma do runtime (`level-os:theme`), então
 * recarregar não pisca nem volta ao tema anterior.
 */
(function () {
  var root = document.documentElement;
  try {
    root.dataset.theme = localStorage.getItem('level-os:theme') === 'light' ? 'light' : 'dark';
    // Accents legados foram descontinuados: limpar evita reaplicar cor antiga.
    localStorage.removeItem('orby_accent');
    localStorage.removeItem('orby_custom_accent');
    localStorage.removeItem('orby_theme');
  } catch (_) {
    root.dataset.theme = 'dark';
  }
  root.removeAttribute('data-accent');
})();
