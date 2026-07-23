# Shared

`Shared` guardara componentes reutilizaveis sem dono de dominio.

## Componentes atuais

- `AuthView.php`: elementos compartilhados das telas de autenticacao.
- `DashboardView.php`: carrega o build React no servidor local e ajusta os
  caminhos dos assets; usa o legado apenas quando o build nao existe.
- `Dashboard/LegacyDashboardView.php`: fallback de compatibilidade; nao recebe
  funcionalidades novas.

## Regra

Componentes compartilhados nao podem conter regra de negocio de um dominio.
O frontend novo continua pertencendo exclusivamente a `frontend/`.
