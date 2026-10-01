# Level OS — Academia: conteúdo, mídia e reconhecimento por câmera
Data: 30/09/2026 · branch `feature/training-knowledge-camera-20260930`

## Objetivo do módulo
Academia não deve ser apenas um formulário de registro. A experiência passa a ter quatro camadas:
1. **Aprender**: biblioteca pesquisável de exercícios, músculos, equipamentos, instruções, imagens e vídeos licenciados quando disponíveis.
2. **Planejar**: montar fichas usando a mesma biblioteca, preservando séries, repetições, carga e descanso.
3. **Executar**: durante a sessão, abrir “Como executar” sem sair do treino e consultar a referência do movimento.
4. **Reconhecer**: no PWA, fotografar um aparelho, receber candidatos com confiança e confirmar a máquina antes de mostrar boas práticas/conteúdo.

A execução registrada pelo usuário continua separada do conteúdo educacional. Foto, reconhecimento ou visualização de vídeo nunca registram uma série automaticamente.
## Fonte de conteúdo e decisão de licenciamento
### Wger — integrado
- Projeto open source: https://github.com/wger-project/wger
- API consumida pelo backend: `https://wger.de/api/v2/exerciseinfo/?limit=1000`.
- Verificação feita em 30/09/2026: 912 registros retornados; 273 com imagens, 46 exercícios com vídeo e 66 com tradução em português.
- A API traz licença e autoria por exercício e também metadados de licença/autoria da mídia.
- O Level OS preserva fonte, licença e autor na interface; URLs de imagem/vídeo aceitas pelo normalizador precisam pertencer a `https://wger.de/`.
- Tradução PT tem prioridade. Quando não existe, o conteúdo aparece marcado como idioma original/fallback, sem fingir tradução.

### RepDB — integrado para imagens de referência
- Projeto canônico: https://github.com/RepDB/exercise-dataset
- Snapshot gratuito verificado em 01/10/2026: 601 exercícios e 601/601 com ilustração WebP.
- O free tier permite uso pessoal/comercial dentro do aplicativo com atribuição visível.
- O Level OS usa somente as ilustrações estáticas do free tier; animações premium não são copiadas nem utilizadas.
- A atribuição “Exercise data by RepDB” fica visível na biblioteca e a licença é preservada por item.

### Free Exercise DB — integrado para ampliar cobertura
- Projeto canônico: https://github.com/yuhonas/free-exercise-db
- Snapshot verificado em 01/10/2026: 876 exercícios; 873 possuem imagens no repositório.
- Conteúdo publicado sob Unlicense/Public Domain conforme o repositório.
- Registros sem imagem são descartados da biblioteca; nenhum card autenticado é publicado sem referência visual.
- As imagens são consumidas do repositório canônico, sem copiar o dataset para o repositório do Level OS.
## Biblioteca do Level OS
Backend:
- `app/Modules/Training/TrainingKnowledgeService.php`: busca, merge, deduplicação, cache e atribuição.
- `app/Modules/Training/TrainingReferenceCatalogService.php`: fontes de imagem Free Exercise DB + RepDB.
- `api/training-library.php`: endpoint autenticado e rate-limited para consulta.
- Cache upstream de 6 horas no diretório temporário do servidor; os datasets externos não são redistribuídos pelo repositório.
- Wger continua prioritário quando já possui imagem/tradução/vídeo; RepDB e Free Exercise DB completam ou ampliam o catálogo visual.
- Validação de 01/10/2026 após deduplicação e exigência de tutorial: 1.587 exercícios publicados, 0 sem imagem, 0 sem etapas e 0 sem mídia visual de orientação (338 Wger, 509 RepDB, 740 Free Exercise DB).
- Busca por texto, grupo muscular e equipamento; paginação com máximo de 60 itens por chamada.
- O backend remove HTML, limita tamanhos e normaliza apenas campos necessários para a experiência.

Frontend:
- `trainingKnowledge.ts`: contrato da API, incluindo etapas estruturadas e frames visuais do tutorial.
- `ExerciseLibraryPicker.tsx`: busca, filtros LevelSelect, cards e acesso ao tutorial em todos os exercícios publicados.
- `NativeTrainingVideo.tsx`: player responsivo único. Reproduz vídeo direto quando licenciado; caso contrário executa tutorial visual automático com etapas, frames, play/pause, anterior, próximo e reinício.
- `ExerciseReferenceButton.tsx`: consulta contextual com o mesmo tutorial dentro de ficha e treino ao vivo.
- `TrainingMachineScanner.tsx`: identifica aparelho e abre o tutorial compatível, sem depender da existência de MP4.
- `TrainingScreen.tsx`: **Central de treino** com acesso direto a scanner, fichas, biblioteca, sessões e medidas.

O catálogo local antigo permanece como fallback quando o usuário não está autenticado ou a fonte externa está temporariamente indisponível.
## Tutorial visual para todos os exercícios
Prioridade de mídia:
1. vídeo direto retornado pela Wger quando a licença/autoria permitem reprodução;
2. quando não existe vídeo direto, o Level OS monta um tutorial visual nativo com as imagens licenciadas disponíveis e as instruções estruturadas em etapas;
3. exercícios sem imagem ou sem instruções suficientes não entram no catálogo publicado.

O player é o mesmo na biblioteca, na referência da ficha, no treino ao vivo e no reconhecimento por câmera. Em telas grandes, demonstração e etapas ficam lado a lado; em celular, o conteúdo empilha verticalmente e os controles usam grade compacta para evitar overflow.
O tutorial visual possui reprodução automática de etapas, pausa, anterior, próximo, reinício e barra de progresso. Ele não transforma imagens estáticas em um vídeo falso: quando a fonte oferece somente frames, a interface os apresenta explicitamente como **tutorial guiado**.
Não copiamos vídeo da Wger para hospedagem própria e não incorporamos GIFs/vídeos de repositórios cuja licença de mídia não esteja clara. O fallback legado de buscas do YouTube continua removido.

Próxima evolução possível:
- catálogo editorial próprio de vídeos Level OS;
- CDN própria apenas para mídias que o Level OS tenha direito de distribuir;
- curadoria humana de execução antes de marcar um vídeo como “verificado”.
## Reconhecimento de aparelhos no PWA
Arquivos:
- `TrainingMachineScanner.tsx`
- `api/training-machine-recognition.php`
- `TrainingMachineVisionService.php`

Fluxo:
1. Usuário toca **Abrir câmera** ou **Enviar foto**.
2. PWA pede câmera somente nesse momento; microfone e geolocalização continuam bloqueados.
3. A foto é reamostrada no navegador (máximo aproximado de 1280 px) e convertida para JPEG, removendo metadados do arquivo no fluxo padrão.
4. O usuário inicia a análise; a imagem é enviada ao provedor de IA configurado e não é gravada pelo endpoint.
5. O modelo só pode escolher uma taxonomia fechada de aparelhos e retornar confiança/alternativas.
6. A orientação não vem do modelo visual. Ela vem da taxonomia do Level OS.
7. Com confiança alta (>= 72%), o aparelho é selecionado automaticamente e o Level OS abre o melhor tutorial compatível; vídeo direto é preferido quando existe, mas o fluxo funciona também com o tutorial visual guiado.
8. Com confiança baixa, ou se a classificação estiver incorreta, o usuário escolhe manualmente qualquer aparelho da taxonomia suportada antes de consultar conteúdo.
## Taxonomia inicial reconhecida
Cobertura inicial inclui, entre outros:
- leg press, extensora, flexora, hack squat e Smith;
- puxada alta, remada sentada, chest press, peck deck e shoulder press;
- polia/crossover, abdutora, adutora, hip thrust e barra/mergulho assistido;
- extensão lombar, abdominal, panturrilha;
- esteira, bicicleta ergométrica, remo, elíptico e escada.

Cada item possui:
- nome de apresentação;
- termo usado para cruzar com a biblioteca;
- tipo de equipamento;
- boas práticas gerais de ajuste/uso.

O classificador não tem permissão para criar novos IDs. Resultado fora da taxonomia é tratado como incerto.
## Privacidade e segurança da câmera
- `Permissions-Policy`: câmera liberada somente para a própria origem; microfone/geolocalização bloqueados.
- CSP libera Wger apenas para imagens/mídia; scripts externos continuam bloqueados.
- Endpoint exige autenticação, plano válido, CSRF e limite de 6 análises/minuto.
- Aceita somente JPEG, PNG ou WebP; valida base64, MIME real, dimensões e tamanho.
- Payload bruto limitado a 3 MB e imagem decodificada a 1,8 MB.
- OpenAI/Gemini permitem payload maior apenas quando a requisição realmente contém imagem; requisições somente texto continuam com limite menor.
- A interface informa que a foto será enviada ao provedor de IA configurado.
- Não há persistência da foto, reconhecimento de pessoa, rosto, localização ou identidade.

A câmera é uma assistência de identificação de equipamento, não um avaliador médico, diagnóstico postural ou substituto das instruções do fabricante.
## Padrão visual — sem controles nativos de seleção/data
A Academia não pode introduzir:
- `<select>` nativo;
- `<datalist>`;
- `input type=date/time/datetime-local/month/week`.

Use:
- `LevelSelect` para dropdowns;
- `LevelDateInput` para data/horário;
- modais, tabs e confirmações do design system do Level OS.

`TrainingControls.contract.test.ts` varre os TSX do módulo e falha se algum desses controles nativos for reintroduzido.
## Contrato para o aplicativo Expo futuro
O app nativo deve reutilizar as APIs e regras acima, não reconstruir outra biblioteca:
- `GET /api/training-library.php`: biblioteca e filtros.
- `POST /api/training-machine-recognition.php`: classificação visual.
- `POST /api/training.php`: registros e fichas existentes.

No app:
- câmera nativa pode substituir `getUserMedia`;
- manter compressão/remoção de metadata antes do envio;
- manter confirmação do candidato;
- manter taxonomia e boas práticas no backend;
- cache offline pode guardar apenas catálogo/metadados permitidos, respeitando licenças;
- não guardar fotos de aparelhos/pessoas sem uma necessidade explícita de produto.

Assim, PWA e Expo compartilham fonte de verdade e critérios de segurança.
## Evidências e critérios de aceite
Testes automatizados cobrem:
- normalização/licença da biblioteca;
- tradução PT e fallback explícito;
- rejeição de mídia em host externo não aprovado;
- taxonomia fechada da câmera;
- rejeição de IDs inventados e clamp de confiança;
- rejeição de payload que não é imagem;
- Gemini recebendo imagem como `inlineData`;
- ausência de selects e datas/horários nativos na Academia.

Aceite manual antes de produção:
- Chrome/Edge/Android PWA e Safari/iOS quando suportado;
- câmera permitida, negada e revogada;
- upload de galeria como fallback;
- fotos com pessoas ao fundo, múltiplas máquinas e enquadramento ruim;
- máquina não suportada → sem orientação categórica;
- vídeo ausente → fallback/estado claro;
- Wger indisponível → catálogo local sem travar o módulo;
- 320/360/390/430 px, teclado e leitor de tela.
