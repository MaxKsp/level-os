# 10 — Agentes de IA: arquitetura atual e especialidades propostas

**Data:** 2026-08-26
**Escopo:** inspeção estática do roteamento, catálogo, confirmação, persistência, fallback e qualidade, complementada pela suíte PHP 50/50 e repetição dirigida de `assistant_agent_policy` e `assistant_router_contract`. Providers externos, banco MySQL e stored injection fim a fim não foram executados.
**Legenda:** **EXISTENTE** = comprovado no worktree; **PROPOSTA** = desenho futuro, não implementado; **BLOQUEADO POR AMBIENTE** = depende de runtime/infra.

> As especialidades da seção 5 são propostas. Não há afirmação de que elas já existam.

## 1. Mapa do que EXISTE

### 1.1 Roteador global + quatro agentes de domínio

- O endpoint aceita apenas `financeiro`, `agenda`, `treinos` e `alimentacao`; sem módulo válido, `AssistantService` usa triagem global determinística e encerra sem provider, dados de domínio ou mutação (`api/assistant.php:9-46`; `app/Modules/Assistant/AssistantService.php:28-64`; `app/Modules/Assistant/AssistantTriage.php:7-52`).
- Com módulo, o fluxo tenta continuação estruturada, rotas locais/recusa/parser financeiro, monta contexto mínimo e só então chama a cadeia LLM (`app/Modules/Assistant/AssistantService.php:65-100`; `app/Modules/Assistant/AssistantRouter.php:17-57`).
- O roteador envia contrato XML confiável, catálogo limitado ao módulo, contexto JSON e texto do usuário; a saída é validada e limitada a uma ação (`app/Modules/Assistant/AssistantRouter.php:59-141,157-174,194-231`).

### 1.2 Allowlists e schemas

| Agente EXISTENTE | Ações permitidas |
|---|---|
| Financeiro | `add_expense`, `add_income`, `add_transfer`, `query` |
| Rotina (`agenda`) | `add_task`, `query` |
| Treinos | `create_workout`, `create_workout_program`, `log_workout_session`, `log_measurement`, `log_cardio`, `query` |
| Alimentação | `create_diet_plan`, `query` |

Fonte: `app/Modules/Assistant/AssistantActionCatalog.php:81-99`.

Os XMLs precisam validar no XSD, rejeitam DOCTYPE/ENTITY e declarar exatamente as mesmas ações do catálogo PHP; editar prompt não amplia permissões (`app/Modules/Assistant/AssistantAgentPolicy.php:13-63,96-119`). Schemas rejeitam propriedades extras, limitam formatos/tamanhos e são revalidados após a resposta (`app/Modules/Assistant/AssistantActionCatalog.php:6-79,164-269`).

### 1.3 Dados locais, LLM e fallback

- Consultas reconhecidas e lançamentos financeiros simples podem ser resolvidos localmente; o parser aceita moeda/data pt-BR em parte dos casos (`app/Modules/Assistant/AssistantRouter.php:17-57`; `app/Modules/Assistant/AssistantFinanceInterpreter.php:18-143,182-223`).
- Em pedidos complexos, LLM produz objeto estruturado; não executa diretamente. Programas/planos passam por schema, preview e confirmação.
- Falha transitória recebe uma segunda tentativa no mesmo provider; depois pode seguir ao próximo. Há cache de rota cifrado e curto. Se todos falham, consultas/lançamentos determinísticos ainda podem funcionar (`app/Modules/Assistant/AssistantRouter.php:99-154`; `app/Modules/Assistant/AssistantRepository.php:89-118`).

### 1.4 Confirmação universal e replay

- `query` é read-only. Toda outra ação do catálogo exige confirmação explícita (`app/Modules/Assistant/AssistantActionCatalog.php:101-105`).
- A confirmação expira em 300 s; undo, quando disponível, em 45 s. Antes de executar, o serviço trava a linha, valida token/status/expiração, decifra rota, reaplica schema/allowlist, compara tipo e `stateHash` quando existe (`app/Modules/Assistant/AssistantService.php:16-17,151-194,277-366`).
- `requestId` é único por usuário; repetição devolve resposta terminal. Token tem 128 bits, é escopado por usuário e só transiciona de `confirmation` uma vez (`app/Modules/Assistant/AssistantService.php:28-38,393-397`; `app/Modules/Assistant/AssistantRepository.php:15-46,128-147`).

### 1.5 Cifra, histórico e qualidade

- Resposta, undo, cache de rota e ambos os lados do histórico são cifrados com contexto de usuário/provider/campo (`app/Modules/Assistant/AssistantRepository.php:49-68,77-118,128-188,194-325,446-455`).
- A cifra usa envelope autenticado, nonce aleatório e AAD; nenhum valor de chave foi lido/reproduzido (`app/Core/TokenCrypto.php:6-16,54-118`; `app/Modules/Assistant/AssistantCrypto.php:4-29`).
- Qualidade agrega solicitações, clarificações, recusas, confirmações, cancelamentos, undo, falhas, latência, tokens e custo por agente/provider (`app/Modules/Assistant/AssistantRepository.php:335-443`). É telemetria operacional, não correção semântica.

## 2. Riscos e lacunas EXISTENTES

| Risco | Evidência/veredito | PROPOSTA |
|---|---|---|
| `result_summary` claro/insuficiente | Payloads são cifrados, mas `result_summary`, provider, ação, status e timestamps ficam em claro. O resumo é truncado a 255 e varia entre texto humano e genérico (`app/Modules/Assistant/AssistantRepository.php:49-75,128-147`; `app/Modules/Assistant/AssistantService.php:54-58,115-140,181-194,234-250`) | Separar `result_code`, entity ID, hashes before/after e resumo público redigido; cifrar detalhe sensível. Não usá-lo como proxy de qualidade |
| Provider exposto | Resposta live e histórico removem `provider`, mas o endpoint de qualidade devolve `provider` por item (`api/assistant.php:43-46`; `app/Modules/Assistant/AssistantRepository.php:283-313,405-443`; `api/assistant-quality.php:9-21`) | API de usuário retorna `local|external` ou alias; nome real só em observabilidade autorizada |
| Categoria livre | `add_expense.category` é string, não enum. Parser local usa catálogo fechado, mas provider pode propor literal arbitrário validado só por tamanho (`app/Modules/Assistant/AssistantActionCatalog.php:37-40`; `app/Modules/Assistant/AssistantFinanceInterpreter.php:14-17,207-223`) | `categoryId`/enum server-side; desconhecida gera clarificação, não persistência |
| Prompt literal não filtrado | Texto do usuário vai literal como `user`; contexto JSON vai como segunda mensagem `system`. O prompt diz que são dados não confiáveis, mas não há sanitização semântica total (`app/Modules/Assistant/AssistantRouter.php:59-98`) | Contexto via ferramenta/estrutura de baixa autoridade, IDs e campos allowlisted, minimização e delimitadores |
| “próxima sexta” | Parser reconhece ISO, `DD/MM/AAAA`, anteontem/ontem/amanhã; expressão não reconhecida cai silenciosamente em hoje (`app/Modules/Assistant/AssistantFinanceInterpreter.php:182-197`) | Parser determinístico com timezone/clock e regra documentada; em ambiguidade, perguntar |
| Formatos BR | Moeda com R$, milhar/ponto, decimal/vírgula e data completa são parcialmente normalizados (`app/Modules/Assistant/AssistantFinanceInterpreter.php:123-143,182-197`) | Cobrir `1.234,56`, `1234,56`, datas inválidas/bissextas, `DD/MM`, horas coloquiais e virada de dia |
| Replay | Reserva/token/status/lock são fortes; `requestId` não é ligado a hash do corpo e `stateHash` não cobre toda mutação (`app/Modules/Assistant/AssistantService.php:28-38,277-366`; `app/Modules/Assistant/AssistantRepository.php:15-46,128-147`) | Persistir hash canônico do pedido; 409 se mesmo ID vier com corpo diferente; testes concorrentes |
| Ambiguidade | Global pede escolha e contas são validadas contra contexto/menção; porém data desconhecida vira hoje e categoria de provider pode ser livre (`app/Modules/Assistant/AssistantTriage.php:7-52`; `app/Modules/Assistant/AssistantService.php:407-499`; `app/Modules/Assistant/AssistantFinanceInterpreter.php:182-223`) | Campo material ambíguo sempre gera clarificação; nenhum default silencioso |
| Stored prompt injection | Continuação é estruturada/cifrada, mas strings persistidas podem entrar no contexto JSON com papel `system`; testes-fonte exercitam texto hostil direto, não dado persistido fim a fim (`app/Modules/Assistant/AssistantRepository.php:194-254`; `app/Modules/Assistant/AssistantRouter.php:59-98`; `tests/cases/assistant_agent_policy_test.php:62-94`) | Tratar contexto como dados, normalizar labels, usar IDs, testar conta/tarefa/treino/ingrediente persistido hostil |
| “Qualidade” sem qualidade semântica | Contadores medem operação/custo/latência; não há correção factual, satisfação, acerto de roteamento ou categoria/data corrigida (`app/Modules/Assistant/AssistantRepository.php:335-443`) | Métricas de validação determinística, correções pelo usuário, razão de clarificação e feedback opcional redigido |
| Limites de tamanho | Catálogo permite até 64 KiB de argumentos; envelope cifra até 32 KiB (`app/Modules/Assistant/AssistantActionCatalog.php:164-173`; `app/Core/TokenCrypto.php:15-16,54-58`) | Rejeitar antes da chamada/persistência com limite único e mensagem segura |

## 3. Princípios obrigatórios para especialidades PROPOSTAS

1. **Não personificar aconselhamento médico.** Treino/Nutrição organizam dados e rascunhos gerais; não diagnosticam, prescrevem tratamento, prometem resultado ou substituem profissional.
2. **Cálculo local é autoritativo.** LLM pode classificar/explicar/rascunhar; não decide saldo, total, conflito, alergia declarada, limite ou persistência.
3. **Confirmação universal:** toda criação, edição, exclusão, importação, classificação persistida ou aplicação de rascunho exige preview + confirmação. Leitura pura não.
4. **Minimização:** enviar ao provider somente campos necessários, preferencialmente IDs/pseudônimos e agregados.
5. **Fallback explícito:** deterministic/local quando possível; caso contrário, indisponibilidade clara, nunca resultado inventado.
6. **Nenhuma especialidade amplia a allowlist automaticamente.** Novas ações exigem schema, executor, preview, confirmação, undo/idempotência e testes.

## 4. Dados locais versus chamada LLM

| Tipo | Local por padrão | LLM opcional | Nunca delegar ao LLM |
|---|---|---|---|
| Cálculo/agregação | totais, duplicidade exata, datas, conflitos, volume, orçamento, restrições declaradas | narrativa sobre resultado já calculado | número final/autorização |
| Classificação | regras/catalogo fechado | sugestão com confiança + justificativa | persistência sem confirmação |
| Planejamento | restrições, limites, feasibility | rascunho estruturado | aplicação automática |
| Mutação | executor server-side allowlisted | nenhuma execução direta | SQL, ID inventado, bypass de gate |

## 5. Catálogo de especialidades PROPOSTAS

**Todas as linhas abaixo são PROPOSTA; nenhuma afirma existência atual.** “Conf.” significa confirmação universal antes de qualquer mutação.

| Domínio / especialidade | Função | Dados locais × LLM | Modo | Conf. | Fallback | Testes mínimos |
|---|---|---|---|---|---|---|
| Global — **Roteador** | escolher exatamente um domínio e fazer handoff | texto atual + sinais locais; sem LLM por padrão | read-only | N/A | pedir escolha em empate/multidomínio | zero acesso a dados; multidomínio; injeção; sem provider |
| Financeiro — **Caça-Duplicatas** | apontar lançamentos/importações possivelmente repetidos | hash/valor/data/conta/merchant locais; LLM só explica candidatos redigidos | RO; marcar/mesclar muta | sim ao marcar/mesclar | chave exata + score determinístico | replay OFX; estorno; mesmo valor legítimo; falso positivo; concorrência |
| Financeiro — **Radar de Assinaturas** | detectar recorrência e variação | histórico/merchant/periodicidade locais; LLM opcional para rótulo | RO; tag/lembrete muta | sim na mutação | heurística mensal/anual | drift de dias; anual; pausa; reembolso; merchant variante |
| Financeiro — **Guardião de Fatura** | consolidar snapshot, fechamento, parcelas e alertas | cálculo inteiramente local; narrativa opcional | RO; lembrete/ajuste muta | sim na mutação | cálculo local ou “dados insuficientes” | virada de fechamento; timezone; parcela; cartão vazio; limite zero |
| Financeiro — **Planejador de Metas** | simular meta e fluxo | projeção local; LLM só explica cenários | RO simulação; salvar meta muta | sim ao salvar/aplicar | projeção determinística | centavos; caixa negativo; renda ausente; prazo inviável |
| Financeiro — **Fiscal de Extrato** | validar OFX, conciliar e sugerir categoria | parser/transações/categorias locais; LLM opcional com merchant minimizado | RO análise; importar/classificar muta | sim, preview de lote | regras locais; desconhecida pede escolha | encoding; lote parcial; duplicata; replay; enum; isolamento |
| Rotina — **Radar de Prazos** | exibir atrasos e próximos vencimentos | tarefas/datas/status/timezone locais; sem LLM | RO; reagendar muta | sim ao reagendar | ordenação local | vencido/hoje; virada do dia; timezone; concluída |
| Rotina — **Detector de Conflitos** | encontrar sobreposição/janelas inviáveis | intervalos locais; sem LLM | RO; mover evento muta | sim ao mover | algoritmo determinístico | all-day; fronteiras; recorrência; DST; empate |
| Rotina — **Planejador de Semana** | gerar rascunho de sequência/prioridades | feasibility local; LLM opcional para rascunho schema | RO rascunho; aplicar muta | sim ao aplicar | prazo/prioridade determinísticos | carga impossível; duração ausente; multidomínio; replay |
| Rotina — **Decompositor de Tarefas** | sugerir subtarefas limitadas | tarefa selecionada; LLM para rascunho estruturado | RO; criar subtarefas muta | sim ao criar | template/solicitar detalhes | stored injection; máximo; duplicação; texto longo |
| Rotina — **Revisor de Rotina** | resumir conclusão, atraso e carga semanal | métricas locais; LLM só verbaliza números prontos | read-only | N/A | sumário determinístico | semana vazia; agregação; isolamento; arredondamento |
| Treino — **Leitor de Volume** | calcular volume, frequência e consistência | sessões/séries/reps/carga locais; sem LLM | read-only | N/A | fórmulas locais | unidades; nulos; extremos; precisão |
| Treino — **Radar de Progressão** | mostrar tendência sem diagnóstico | histórico local; LLM só explica tendência calculada | read-only | N/A | limiares + “dados insuficientes” | amostra curta; outlier; exercício renomeado; regressão legítima |
| Treino — **Montador de Sessões** | rascunho organizacional por objetivo/equipamento declarado | regras/limites locais + LLM structured output | criar ficha/programa muta | sim | templates gerais seguros ou indisponível | schema; limites; casa/academia; injeção; sem claims clínicos |
| Treino — **Conferidor de Registros** | normalizar rascunho de sessão/cardio | IDs/unidades locais; LLM opcional para parsing | mutação | sim | formulário estruturado | ID inventado; usuário cruzado; unidades; duplicata; replay |
| Treino — **Sinalizador de Limites Declarados** | interromper quando usuário declara dor/lesão/restrição; sem diagnóstico | regras locais sobre declaração; LLM no máximo explica neutralmente | RO/recusa | mutações continuam confirmadas | falhar fechado e recomendar avaliação qualificada | termos de risco; negação; ambiguidade; LLM não remove bloqueio |
| Nutrição — **Orçamentista de Cardápio** | verificar custo do rascunho contra orçamento | soma/tolerância locais; LLM apenas ajusta rascunho | RO cálculo; salvar muta | sim ao salvar | recálculo local/solicitar ajuste | centavos; 7/30 dias; tolerância; orçamento inviável |
| Nutrição — **Consolidador de Compras** | agregar ingredientes/quantidades | itens aprovados e categorias locais; LLM opcional para normalizar nome | RO; salvar lista muta | sim ao salvar | agregação literal | duplicatas; unidades incompatíveis; enum; texto hostil |
| Nutrição — **Organizador de Refeições** | rascunho culinário geral não clínico | preferências/orçamento declarados; LLM structured output | salvar plano muta | sim | templates gerais ou indisponibilidade clara | obrigatórios; custo; limites; sem diagnóstico/prescrição |
| Nutrição — **Verificador de Restrições Declaradas** | comparar ingredientes a alergias/restrições informadas | decisão local; LLM opcional só para linguagem | RO/bloqueio | plano alterado reconfirma | falhar fechado em conflito | sinônimos; dado ausente; conflito; LLM não sobrescreve |
| Nutrição — **Radar de Aproveitamento** | sugerir reuso de ingredientes/desperdício | interseção local; LLM opcional para ideias culinárias gerais | RO; alterar plano/lista muta | sim ao alterar | regras de interseção | estoque desconhecido; validade não inventada; orçamento; isolamento |

## 6. Contrato PROPOSTO de saída e confirmação

Cada especialidade deve retornar um envelope comum:

- `specialty`, `mode: local|llm-assisted`, `readOnly`, `confidence` somente quando calibrada;
- `evidence`: IDs/contagens, nunca prompt bruto ou segredo;
- `result`: estrutura validada;
- `ambiguities`: campos que impedem ação;
- `proposedAction`: ação allowlisted ou `null`;
- `confirmationRequired`: verdadeiro para toda mutação;
- `fallbackUsed` e código público seguro.

O preview deve repetir valor/data/conta/categoria em formato humano pt-BR, mostrar efeitos e permitir cancelar. A confirmação revalida schema, identidade, policy, revisão e idempotência no servidor — controles já presentes em parte no fluxo atual (`app/Modules/Assistant/AssistantService.php:277-366`).

## 7. Testes transversais PROPOSTOS

1. **Datas/BR:** clock/timezone congelados; sexta/esta sexta/próxima sexta; bissexto; `DD/MM/AAAA`; `R$ 1.234,56`; horas coloquiais.
2. **Categoria fechada:** property test garantindo que nenhuma despesa persistida fique fora do catálogo; provider inventando categoria gera clarificação.
3. **Stored injection fim a fim:** label hostil em conta, tarefa, treino e ingrediente; dado permanece baixa autoridade, não muda tool/action e não cruza usuário.
4. **Replay/concorrência:** mesmo requestId/corpo igual, mesmo ID/corpo diferente, duplo confirm simultâneo, token cruzado/cancelado/expirado, estado alterado.
5. **Fallback:** local sem provider; primeiro falha/segundo funciona; todos falham; cache não executa ação; telemetria registra tentativas sem conteúdo.
6. **Resumo/qualidade:** summary redigido sem valor/título sensível; entidade gravada corresponde ao resultado; qualidade separa sucesso técnico de correção/aceitação.
7. **Tamanho/cifra:** 31/32/33/64 KiB e planos máximos; erro controlado antes de chamada/persistência.
8. **Segurança de domínio:** nenhuma saída de treino/nutrição faz diagnóstico, prescrição clínica ou promessa terapêutica; restrição declarada falha fechado.

## 8. Validação executada e BLOQUEADO POR AMBIENTE

A suíte PHP completa passou 50/50; `assistant_agent_policy_test.php` e `assistant_router_contract_test.php` foram repetidos isoladamente e passaram. A cobertura adversarial inclui centenas de combinações de instrução hostil em texto, descrição de tarefa, nome de conta, texto de terceiro e dado escondido (`tests/cases/assistant_agent_policy_test.php:62-94`); prompt injection direto falha antes de chamar provider, ações cross-domain do provider são rejeitadas e valores pt-BR/conta real são resolvidos localmente (`tests/cases/assistant_router_contract_test.php:139-199`). Preview, confirmação, cancelamento, isolamento de histórico, recusa cross-domain e transferências sem execução pelo roteador global passam em SQLite (`tests/cases/assistant_confirmation_test.php:54-176`).

Não foram verificados: migrations aplicadas, constraints MySQL, timezone do servidor, providers habilitados, conectividade, retenção/residência do fornecedor, respostas reais e stored prompt injection entrando pelo dado persistido até o provider. Sodium e DOM estavam disponíveis no runtime PHP local; isso não prova disponibilidade no hosting. Nenhum segredo foi lido ou reproduzido.

## 9. Ordem recomendada

A ordem abaixo preserva a taxonomia global **P0=0**; prioridade pertence ao risco existente, não à proposta.

1. **P1:** fechar categoria/data ambíguas e ligar `requestId` ao hash canônico do corpo.
2. **P1 condicional:** reduzir a autoridade do contexto persistido e criar testes E2E de stored injection/replay concorrente.
3. **P2:** redigir/cifrar metadata sensível e ocultar provider no endpoint de usuário.
4. **P2:** unificar limite de payload e ampliar qualidade para validação semântica.
5. **P2:** introduzir especialidades uma a uma, começando pelas read-only locais; nenhuma mutação nova sem confirmação universal, idempotência, revisão e fallback testado.

O sistema atual oferece uma base forte de catálogo, confirmação e cifra. As especialidades propostas devem aprofundar o domínio sem transformar LLM em autoridade de cálculo, autorização ou execução.