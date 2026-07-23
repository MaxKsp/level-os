# Arquitetura do frontend Level OS

Referência dos contratos existentes em `src/context/AppContext.tsx` e `src/components/ui`. O contexto é client-side: tarefas e exercícios persistem em `localStorage`; os demais dados voltam aos valores iniciais após reload.

## AppContext

Envolva consumidores com `AppContextProvider` e use `useApp()`. Fora do provider, o hook lança `useApp must be used within an AppContextProvider`.

### Tipos de domínio

| Tipo | Campos | Observação |
|---|---|---|
| `Task` | `id`, `time`, `title`, `subtitle`, `completed` | Item da rotina; `completed` alimenta checklist e progresso. |
| `Expense` | `id`, `description`, `amount`, `category`, `date` | Tipo exportado; atualmente não há `Expense[]` no contexto. |
| `Exercise` | `id`, `name`, `sets`, `completed` | `sets` é texto de apresentação. |
| `WeightRecord` | `date`, `weight` | Data de exibição e peso numérico em kg. |

### Estado compartilhado

| Área | API | Contrato/comportamento |
|---|---|---|
| Navegação | `currentScreen`, `setCurrentScreen` | Identificador `string`; inicia em `dashboard`. |
| Rotina | `tasks`, `setTasks` | `Task[]`; persiste em `orby_tasks`. |
| Treino | `exercises`, `setExercises` | `Exercise[]`; persiste em `orby_exercises`. |
| Finanças | `balance`, `invoice`, `projection` + setters | Valores monetários em memória. |
| Alerta/busca | `isAlertVisible`, `isSearchOpen`, `searchQuery` + setters | Visibilidade e consulta global. |
| Modais | `isTaskModalOpen`, `isExpenseModalOpen`, `isWeightModalOpen`, `isWorkoutModalOpen`, `isProfileMenuOpen` + setters | Flags independentes. |
| Nova tarefa | `newTaskTitle`, `newTaskTime`, `newTaskSubtitle` + setters | Rascunho compartilhado. |
| Despesa | `expenseDesc`, `expenseAmount`, `expenseType` + setters | Tipo: `invoice \| sub_balance`; valor é string até o submit. |
| Peso | `weightValue`, `loggedWeights` + setters | Rascunho textual e `WeightRecord[]`. |
| Cadastro | `registerPassword`, `setRegisterPassword`, `passwordChecks` | Deriva: 8+ caracteres, maiúscula ASCII, número ASCII e caractere especial. |
| Timers | `blockedTime`, `workoutTimer`, `isWorkoutActive` + setters | Bloqueio decrementa em `bloqueada`; treino incrementa quando ativo e modal aberto. |

Setters `React.Dispatch<React.SetStateAction<T>>` aceitam valor ou função baseada no anterior; os tipados `(value: T) => void` expõem atribuição direta.

### Manipuladores globais

| API | Efeito |
|---|---|
| `handleToggleTask(id)` | Inverte `completed` da tarefa. |
| `handleAddTaskSubmit(event)` | Valida título, cria tarefa pendente, limpa rascunho e fecha modal. |
| `handlePayAlertBill()` | Subtrai `342.10` de saldo/projeção e oculta alerta. |
| `handleAddExpenseSubmit(event)` | Valida valor positivo; soma à fatura ou subtrai do saldo e sempre reduz projeção. |
| `handleAddWeightSubmit(event)` | Valida peso, registra data `pt-BR` e fecha modal. |
| `handleToggleExercise(id)` | Inverte `completed` do exercício. |
| `handleResetSimulation()` | Restaura tarefas, exercícios, finanças, alerta, bloqueio e pesos iniciais. Não reseta todos os rascunhos/modais. |

## Componentes reutilizáveis

### `Card`

Estende `React.HTMLAttributes<HTMLDivElement>`: `children` obrigatório; `hoverGlow?: boolean` (padrão `true`); `className?: string`. Props HTML restantes chegam ao `<div>` externo.

### `Button`

Estende `React.ButtonHTMLAttributes<HTMLButtonElement>`: `children` obrigatório; `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` (`primary`); `size?: 'sm' | 'md' | 'lg'` (`md`); `className?: string`. Dentro de formulários, use `type="button"` nas ações que não submetem.

### `Input`

Estende `React.InputHTMLAttributes<HTMLInputElement>` e encaminha `ref`: `label?: string`, `icon?: string` (nome Material Symbol), `fontFamily?: 'sans' | 'mono'` (`sans`) e `className?: string` aplicado ao `<input>`. Hoje o `label` visual não possui `htmlFor`; informe `aria-label`/`aria-labelledby` até esse vínculo ser implementado.

### `Modal`

`isOpen: boolean`, `onClose: () => void`, `title: string` e `children` são obrigatórios; `icon?: string`; `maxWidth?: string` (`max-w-md`). Bloqueia scroll do `body` quando aberto e restaura ao fechar/desmontar. Ainda não implementa `role="dialog"`, `aria-modal`, Escape nem contenção/restauração de foco.

## Testes e scripts

Vitest + jsdom + React Testing Library cobrem progresso SVG, regras de senha e timer regressivo.

```bash
npm run test:run
npm run test:coverage
npm run validate
```

`validate` executa TypeScript, testes e build.

## Prompts de refinamento WCAG

### Contraste completo

> Atue como especialista WCAG 2.2. Analise todos os pares de primeiro plano/fundo deste frontend React + Tailwind CSS v4, incluindo normal, hover, focus, active, disabled, placeholder, erro e texto sobre gradientes. Informe hexadecimais computados, razão, critério 1.4.3/1.4.11, AA/AAA e aprovação. Considere texto normal, texto grande, ícones informativos, bordas e foco. Entregue tabela priorizada e substituições que preservem o tema escuro Level OS.

### Tokens Tailwind

> Revise tokens e cores arbitrárias das classes Tailwind. Agrupe superfície/texto, superfície/borda, botão/rótulo e estado/ícone. Calcule contraste WCAG 2.2 em sRGB sem arredondamento intermediário. Proponha tokens `surface`, `on-surface`, `muted`, `primary`, `error`, `outline` e `focus-ring` que atinjam AA, com patch do tema Tailwind CSS v4 e impactos visuais.

### Matriz de componentes

> Audite `Card`, `Button`, `Input` e `Modal` em tema escuro. Monte matriz componente × variante × estado para texto, ícone, borda, placeholder e foco contra o fundo efetivo. Com transparência, componha alfa sobre o fundo real. Sugira a menor alteração hexadecimal para AA e, quando viável, AAA.

### Automação e limites

> Gere testes a11y com Vitest, React Testing Library e axe-core para todas as variantes. Acrescente testes de uma função de contraste WCAG sRGB. Liste verificações manuais remanescentes: imagens/gradientes, foco visível, zoom, alto contraste e percepção de estados. Não declare conformidade apenas com base no axe.

### Critérios de aceite

> Converta a auditoria Level OS em critérios verificáveis: 4,5:1 para texto normal, 3:1 para texto grande, 3:1 para componentes gráficos/bordas essenciais e foco perceptível. Inclua 200% de zoom, alto contraste, daltonismo simulado e estados interativos. Separe bloqueadores, recomendações AAA e exceções justificadas com evidência.
