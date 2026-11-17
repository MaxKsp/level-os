# Level OS Mobile — preparação das funções de câmera
Planejamento para a etapa **posterior ao fechamento dos módulos Web/PWA**. Nenhuma leitura/captura de mídia foi ativada por esta entrega.
Fonte nativa existente: `mobile/` (Expo SDK 55, React Native e Expo Router, sem WebView). A integração anterior `frontend/` + Capacitor tem documentação própria em `docs/MOBILE_NATIVE.md`: definir uma única estratégia de distribuição antes de duplicar recursos.

## Estado atual do aplicativo
- `mobile/src/app/(app)/nutrition.tsx` já exibe cardápio, lista e histórico, mas a marcação do carrinho usa estado local `checked` e **não** carrega o workspace sincronizado da Web/PWA.
- `mobile/src/lib/api.ts` provê `apiRequest` com sessão segura do aparelho, ponte PHP, CSRF e cabeçalhos de cliente nativo.
- O projeto já depende de `expo-image-picker` e `expo-file-system`. Leitura GTIN em tempo real e OCR precisam de seleção de bibliotecas, teste de compatibilidade com SDK vigente e permissões explícitas.
- Primeiro alcançar paridade com `GET/POST /api/nutrition-workspace.php` e suas revisões otimistas; **não** manter duas fontes de estoque/carrinho.

## Sequência dos recursos
| Prioridade | Experiência | Destino confirmado pelo usuário |
|---|---|---|
| 1 | Ler EAN/GTIN pela câmera ou digitar código manualmente | Consultar `/api/nutrition-barcode.php?code=...`, mostrar nome, quantidade e fonte; usuário escolhe registrar na despensa |
| 2 | Fotografar etiqueta de validade | OCR gera data candidata; confirmar/corrigir DD/MM/AAAA antes de associar a uma linha do estoque |
| 3 | Fotografar cupom/comprovante de mercado | Extrair estabelecimento, data e total como rascunho revisável; compras só entram no histórico após salvar |
| 4 | Fotografar refeição consumida | Rascunho do diário com foto opcional; nenhuma porção/caloria/macronutriente presumida automaticamente |
| 5 | Opcional em Progresso: fotos comparativas | Fluxo separado, privacidade reforçada, guarda criptografada e consentimento por captura; não compartilhar com assistentes sem autorização |
| 6 | Scan de ingredientes da receita e inventário | Após padronizar ID e unidade de ingrediente, permitir pré-preenchimento, múltiplos scans e revisão de lote |

## Contrato entre Web/PWA e app
A fonte da verdade deve continuar sendo a conta no backend:
- `NutritionWorkspace`: `revision`, `pantry`, `diary`, `purchases`, `recipes`, `mealChecks` e `cartChecks`.
- Para registrar: obter revisão, montar rascunho, exigir confirmação explícita e executar mutação autorizada.
- Em HTTP 409: recarregar workspace, indicar conflito e preservar rascunho sem reenviar automaticamente.
- Carrinho, compra declarada, item recebido, refeição registrada e baixa manual de estoque são eventos distintos.
- Extrair `nutritionInventory.ts` para módulo puro compartilhado (ou portar com teste de paridade de fixtures), sem duplicar regras divergentes entre React e React Native.
## Fluxo técnico proposto para uma captura
1. Usuário toca "Ler código", "Escanear validade" ou "Capturar comprovante": pedir permissão somente nesse momento.
2. Exibir câmera nativa, área de enquadramento, lanterna quando suportada, alternância de câmera se necessário, acessibilidade e opção "Digitar manualmente".
3. Processar GTIN localmente quando possível. Se houver OCR/IA remota, informar transmissão e pedir consentimento separado antes do upload.
4. Exibir **prévia editável** com origem dos dados, estado de confiança e campos incompletos. Nenhuma gravação automática no workspace.
5. Confirmar quantidade, unidade, data e categoria do produto; vincular ao plano/registro selecionado e persistir via API autenticada.
6. Apresentar sucesso/falha, possibilidade de desfazer no estágio de rascunho e botão "Escanear próximo". Não marcar carrinho/pagamento por inferência.
7. Descartar bytes temporários após o processamento ou deixar opção explícita de guardar mídia se existir requisito real.

### Esboço de payload local de rascunho (não é endpoint pronto)
```ts
type CaptureDraft = {
  kind: "barcode" | "expiry" | "receipt" | "meal";
  localDraftId: string;
  capturedAt: string; // ISO
  origin: "camera" | "gallery" | "manual";
  suggestions: Record<string, unknown>; // nunca dados finais sem validação
  userConfirmed: boolean;
};
```
Quando for necessária mídia persistente, projetar endpoint próprio com autenticação/escopo, MIME real validado, tamanho e dimensão máximos, quota, token idempotente, expiração, URL privada, remoção de EXIF/localização e política de retenção. Não reutilizar upload público genérico para fotos sensíveis.
## Privacidade, segurança e comportamento offline
- Permissão de câmera e galeria sob demanda, com alternativa manual quando negada. Não solicitar acesso desnecessário à biblioteca completa.
- Preferir leitura de códigos no aparelho. Evitar guardar fotos de refeições, documentos, rosto ou comprovantes por padrão.
- OCR e sistemas externos são fontes de sugestão; nunca enviar foto para modelo de IA sem ação e informação de uso.
- Não extrair/localizar GPS das imagens. Remover EXIF antes de qualquer upload autorizado; criptografar mídia em trânsito e repouso.
- Sessões de upload devem ter autorização da conta, expirar e admitir revogação/remoção; não incluir tokens em URL ou logs.
- Enquanto offline, pode manter rascunho **sem mídia sensível** ou protegido localmente, com estado "não sincronizado"; não simular conclusão.
- Repetição de requisição não pode duplicar compra, item de estoque ou registro alimentar. Planejar chaves idempotentes antes do envio em fila.
- Se câmera, OCR ou barcode falhar, direcionar para formulário manual no mesmo padrão visual Level OS.

## Critérios de aceite de câmera
- Android/iOS físico: câmera concedida, negada, revogada e permissão limitada; aparelho sem suporte e modo avião.
- Contraluz, embalagem curva, múltiplos códigos, EAN desconhecido, código repetido, etiqueta parcialmente legível.
- Recibo com diversos valores: total confirmado pelo usuário, nunca inferir liquidação pela foto.
- Conferência de quantidade/unidade, data em padrão brasileiro e fuso local, rascunho persistido/descartado adequadamente.
- Retry sem duplicidade, duas sessões com conflito 409, logout com limpeza de arquivo temporário e sem vazamento cruzado.
- Testes de voz, contraste, áreas de toque, 320–430 px equivalentes e performance em aparelho intermediário.

## Portão para iniciar o app com câmera
Fechar visual e contratos de Alimentação, Academia, Rotina, Financeiro e Progresso; estabilizar a API, autenticação mobile e isolamento; definir mídia/retenção e validar homologação em Android/iOS. Depois implementar scanner de código de barras isoladamente e ampliar em etapas.

## Extensão Academia — câmera de aparelhos (30/09/2026)
O PWA passa a estabelecer o contrato que o app Expo deverá reutilizar:
- reconhecimento é classificação em taxonomia fechada, não geração livre;
- usuário confirma o aparelho, especialmente com baixa confiança;
- boas práticas vêm do backend Level OS, não do modelo visual;
- exercícios/imagens/vídeos são cruzados com a biblioteca licenciada;
- foto é temporária e não deve virar mídia persistente por padrão;
- endpoint compartilhado: `POST /api/training-machine-recognition.php`;
- catálogo compartilhado: `GET /api/training-library.php`.

No aplicativo nativo, substituir a captura Web por câmera Expo somente na camada de interface. Compressão, consentimento, limites, confirmação e regras do backend permanecem iguais. Ver `docs/development/TRAINING_KNOWLEDGE_CAMERA_2026-09-30.md`.
