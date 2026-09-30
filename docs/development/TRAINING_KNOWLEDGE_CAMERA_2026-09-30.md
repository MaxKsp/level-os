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

### RepDB — avaliado, não incorporado nesta entrega
- Projeto: https://github.com/RepDB/exercise-dataset
- Dataset possui centenas de exercícios, imagens e estrutura consistente.
- O uso gratuito permite conteúdo no aplicativo com atribuição, mas animações de produção pertencem ao plano/licença correspondente.
- Não copiamos previews ou animações sem licença. Pode ser adicionado futuramente como fonte complementar se contratada/licenciada.

### free-exercise-db — avaliado
- Projeto: https://github.com/yuhonas/free-exercise-db
- Útil como fallback de dados/imagens, mas não resolve a necessidade de vídeos. Não foi necessário nesta entrega.
## Biblioteca do Level OS
Backend:
- `app/Modules/Training/TrainingKnowledgeService.php`: busca, cache, normalização e atribuição.
- `api/training-library.php`: endpoint autenticado e rate-limited para consulta.
- Cache upstream de 6 horas no diretório temporário do servidor; não vira fonte autoritativa de dados do usuário.
- Busca por texto, grupo muscular e equipamento; paginação com máximo de 60 itens por chamada.
- O backend remove HTML, limita tamanhos e normaliza apenas campos necessários para a experiência.

Frontend:
- `trainingKnowledge.ts`: contrato da API.
- `ExerciseLibraryPicker.tsx`: busca, filtros LevelSelect, cards, imagem, instrução, vídeo/fallback e atribuição.
- `ExerciseReferenceButton.tsx`: consulta contextual dentro de ficha e treino ao vivo.
- `TrainingScreen.tsx`: nova aba **Biblioteca**, separada de Treinos, Sessões e Medidas.

O catálogo local antigo permanece como fallback quando o usuário não está autenticado ou a fonte externa está temporariamente indisponível.
## Vídeos
Prioridade de mídia:
1. vídeo retornado pela Wger com licença/autoria explícita;
2. referência de busca externa já existente no Level OS quando a base não contém vídeo;
3. ausência de botão quando não existe referência segura.

Não hospedamos cópia da mídia externa nesta entrega. Isso reduz custo, evita duplicação e mantém a atribuição no contexto da fonte.
Como alguns vídeos upstream podem usar codecs diferentes, a interface abre a referência externa em vez de assumir reprodução compatível em todo navegador.

Próxima evolução possível:
- catálogo editorial próprio de vídeos Level OS;
- CDN própria apenas para mídias que o Level OS tenha direito de distribuir;
- avaliação/curadoria humana de execução antes de marcar um vídeo como “verificado”.
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
7. Se a confiança for baixa, o usuário escolhe manualmente um candidato antes de consultar conteúdo.
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
