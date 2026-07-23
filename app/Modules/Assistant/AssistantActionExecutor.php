<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/finance.php';
require_once dirname(__DIR__) . '/Finance/FinanceAuxiliaryKv.php';
require_once dirname(__DIR__) . '/Routine/RoutineService.php';
require_once dirname(__DIR__) . '/Training/TrainingService.php';
require_once dirname(__DIR__) . '/Nutrition/NutritionPlanService.php';
require_once dirname(__DIR__) . '/Progress/ProgressService.php';
require_once __DIR__ . '/DietPlanCostCalculator.php';

final class AssistantActionExecutor {
    public function __construct(private readonly PDO $db) {
    }

    /**
     * Contexto mínimo enviado ao provedor de IA. No agente global não consulta
     * nenhum dado do usuário: o texto é roteado e toda consulta real permanece
     * no executor. Agentes abertos dentro de Finanças/Treinos recebem apenas os
     * identificadores estritamente necessários para resolver entidades citadas.
     *
     * @return array<string,mixed>
     */
    public function context(int $userId, ?string $module = null, ?string $preferredAction = null): array {
        $context = ['today' => level_clock_today()->format('Y-m-d')];

        $needsAccounts = $preferredAction === null
            || in_array($preferredAction, ['add_expense', 'add_income', 'add_transfer'], true);
        if ($module === 'financeiro' && $needsAccounts) {
            $accounts = finance_load_set($this->db, $userId, 'accounts');
            $context['finance'] = [
                'accounts' => array_map(static fn(array $account): array => [
                    'id' => (string)$account['id'],
                    'label' => (string)$account['label'],
                    'type' => (string)$account['tipo'],
                    'principal' => (bool)($account['principal'] ?? false),
                ], array_slice($accounts, 0, 40)),
            ];
            if ($preferredAction === null || $preferredAction === 'add_expense') {
                $context['finance']['categories'] = ['moradia','alimentacao','transporte','saude','educacao','lazer','assinaturas','outros'];
            }
        }
        $needsWorkoutIds = $preferredAction === null || $preferredAction === 'log_workout_session';
        if ($module === 'treinos' && $needsWorkoutIds) {
            $training = training_snapshot($this->db, $userId);
            $context['training'] = [
                'workouts' => array_map(static fn(array $workout): array => [
                    'id' => $workout['id'], 'name' => $workout['name'],
                ], array_slice($training['workouts'], 0, 40)),
            ];
        }
        return $context;
    }

    /** @param array{action:string,arguments:array<string,mixed>} $route @return array{response:array<string,mixed>,undo:?array<string,mixed>,summary:string,module:string} */
    public function execute(int $userId, array $route, array $approval = []): array {
        $action = $route['action'];
        $args = $route['arguments'];
        return match ($action) {
            'add_expense' => $this->addExpense($userId, $args),
            'add_income' => $this->addIncome($userId, $args),
            'add_transfer' => $this->addTransfer($userId, $args),
            'add_task' => $this->addTask($userId, $args),
            'create_workout' => $this->createWorkout($userId, $args),
            'create_workout_program' => $this->createWorkoutProgram($userId, $args, $approval),
            'log_workout_session' => $this->logWorkoutSession($userId, $args),
            'log_measurement' => $this->logMeasurement($userId, $args),
            'log_cardio' => $this->logCardio($userId, $args),
            'create_diet_plan' => $this->createDietPlan($userId, $args, $approval),
            'query' => $this->query($userId, $args),
            default => throw new AssistantRouteException('Ação fora do catálogo.'),
        };
    }

    /** @param array{action:string,arguments:array<string,mixed>} $route @return array<string,mixed> */
    public function preview(int $userId, array $route): array {
        $action = (string)($route['action'] ?? '');
        $args = is_array($route['arguments'] ?? null) ? $route['arguments'] : [];
        if ($action === 'create_diet_plan') {
            $active = nutrition_active_plan($this->db, $userId);
            return ['plan'=>$this->dietPlanDraft($args), 'hasActivePlan'=>$active !== null,
                'stateHash'=>hash('sha256', json_encode($active, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES))];
        }
        if ($action === 'create_workout_program') {
            $snapshot = training_snapshot($this->db, $userId);
            $currentWorkouts = array_map(static fn(array $workout): array => [
                'id'=>(string)$workout['id'], 'name'=>(string)$workout['name'], 'focus'=>(string)($workout['focus'] ?? ''),
            ], $snapshot['workouts']);
            return [
                'focus'=>(string)($args['focus'] ?? ''), 'daysPerWeek'=>(int)($args['daysPerWeek'] ?? 0),
                'location'=>(string)($args['location'] ?? ''), 'workouts'=>is_array($args['workouts'] ?? null) ? $args['workouts'] : [],
                'currentWorkouts'=>$currentWorkouts,
                'hasActiveProgram'=>($snapshot['programs'] ?? []) !== [],
                'stateHash'=>hash('sha256', json_encode([$currentWorkouts, $snapshot['programs'] ?? []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)),
            ];
        }
        if ($action === 'create_workout') {
            $current = training_snapshot($this->db, $userId)['workouts'];
            return ['workout'=>$args, 'currentWorkouts'=>$current,
                'stateHash'=>hash('sha256', json_encode($current, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES))];
        }
        return $args;
    }

    /** @param array<string,mixed> $undo */
    public function undo(int $userId, array $undo): string {
        $kind = (string)($undo['kind'] ?? '');
        if ($kind === 'finance_item') {
            $set = (string)($undo['set'] ?? '');
            $id = (string)($undo['id'] ?? '');
            if (!in_array($set, ['expense', 'income', 'transfers'], true) || $id === '') {
                throw new RuntimeException('Undo financeiro inválido.');
            }
            $items = $this->loadFinanceUndoSet($userId, $set);
            $matches = array_values(array_filter($items, static fn(array $item): bool => (string)($item['id'] ?? '') === $id));
            if (count($matches) !== 1 || !hash_equals((string)($undo['itemHash'] ?? ''), $this->itemHash($matches[0]))) {
                throw new RuntimeException('undo_conflict');
            }
            $accounts = finance_load_set($this->db, $userId, 'accounts');
            $accountChanges = is_array($undo['accounts'] ?? null) ? $undo['accounts'] : [];
            foreach ($accountChanges as $change) {
                if (!is_array($change) || !is_array($change['before'] ?? null) || !is_array($change['after'] ?? null)) {
                    throw new RuntimeException('Undo financeiro inválido.');
                }
                $current = $this->findItem($accounts, (string)($change['after']['id'] ?? ''));
                if ($current === null || !hash_equals($this->itemHash($change['after']), $this->itemHash($current))) {
                    throw new RuntimeException('undo_conflict');
                }
            }
            $nextItems = array_values(array_filter($items, static fn(array $item): bool => (string)($item['id'] ?? '') !== $id));
            foreach ($accountChanges as $change) {
                $before = $change['before'];
                $accounts = array_map(static fn(array $item): array =>
                    (string)($item['id'] ?? '') === (string)($before['id'] ?? '') ? $before : $item, $accounts);
            }
            if ($accountChanges !== []) finance_save_set($this->db, $userId, 'accounts', $accounts, false);
            $this->restoreFinanceSet($userId, $set, $nextItems);
            if (is_string($undo['xpRef'] ?? null)) progress_revoke_event($this->db, $userId, $undo['xpRef']);
            return 'Lançamento financeiro desfeito.';
        }
        if ($kind === 'task') {
            if (!routine_delete_task($this->db, $userId, (string)($undo['id'] ?? ''))) throw new RuntimeException('undo_conflict');
            return 'Tarefa removida.';
        }
        if ($kind === 'workout') {
            if (!training_delete_workout($this->db, $userId, (string)($undo['id'] ?? ''))) throw new RuntimeException('undo_conflict');
            return 'Treino removido.';
        }
        if ($kind === 'diet_plan_version') {
            nutrition_undo_activation($this->db, $userId, $undo);
            return 'Plano alimentar desfeito.';
        }
        if ($kind === 'training_program_version') {
            training_undo_program_activation($this->db, $userId, $undo);
            return 'Programa anterior restaurado.';
        }
        if ($kind === 'measurement') {
            if (!training_delete_measurement($this->db, $userId, (string)($undo['id'] ?? ''))) throw new RuntimeException('undo_conflict');
            return 'Medida removida.';
        }
        if ($kind === 'session') {
            if (!training_delete_session($this->db, $userId, (string)($undo['id'] ?? ''), true)) throw new RuntimeException('undo_conflict');
            return 'Sessão removida.';
        }
        throw new RuntimeException('Undo não suportado.');
    }

    /** @param array<string,mixed> $args @return array<string,mixed> */
    private function addExpense(int $uid, array $args): array {
        $valueCents = $this->positiveMoney($args['value'] ?? null);
        $date = training_date($args['date'] ?? null);
        $description = $this->text($args['description'] ?? null, 255);
        $category = $this->text($args['category'] ?? null, 48);
        $accounts = finance_load_set($this->db, $uid, 'accounts');
        $expenses = finance_load_set($this->db, $uid, 'expense');
        $account = $this->resolveAccount($accounts, $args['account'] ?? null);
        $id = 'as_exp_' . substr(bin2hex(random_bytes(12)), 0, 24);
        $expense = ['id'=>$id,'label'=>$description,'value'=>fin_cents_to_number($valueCents),'date'=>$date,'time'=>null,
            'recorrencia'=>'none','categoria'=>$category,'method'=>null,'bank'=>$account['bank'] ?? null,
            'accountId'=>$account['id'],'parcelas'=>null,'createdAt'=>level_clock_epoch() * 1000];
        $nextAccounts = array_map(static function(array $item) use ($account, $valueCents): array {
            if ((string)$item['id'] !== (string)$account['id']) return $item;
            if ((string)$item['tipo'] === 'cartao') $item['fatura'] = fin_cents_to_number(fin_money_to_cents($item['fatura'] ?? 0) + $valueCents);
            else $item['saldo'] = fin_cents_to_number(fin_money_to_cents($item['saldo'] ?? 0) - $valueCents);
            return $item;
        }, $accounts);
        $nextExpenses = [...$expenses, $expense];
        finance_save_set($this->db, $uid, 'accounts', $nextAccounts, false);
        finance_save_set($this->db, $uid, 'expense', $nextExpenses, true);
        $xpRef = 'financeiro:expense:' . $id;
        $message = 'Despesa de R$ ' . number_format(fin_cents_to_number($valueCents), 2, ',', '.')
            . ' registrada em ' . (string)$account['label'] . '.';
        return $this->mutationResult('add_expense', $message, 'financeiro', [
            'kind'=>'finance_item','set'=>'expense','id'=>$id,'itemHash'=>$this->itemHash($expense),
            'accounts'=>[['before'=>$account,'after'=>$this->findItem($nextAccounts, (string)$account['id'])]],'xpRef'=>$xpRef,
        ], ['id'=>$id,'value'=>fin_cents_to_number($valueCents),'date'=>$date,'description'=>$description,
            'category'=>$category,'account'=>(string)$account['label']]);
    }

    /** @param array<string,mixed> $args @return array<string,mixed> */
    private function addIncome(int $uid, array $args): array {
        $valueCents = $this->positiveMoney($args['value'] ?? null);
        $date = training_date($args['date'] ?? null);
        $type = is_string($args['type'] ?? null) ? $args['type'] : '';
        if (!in_array($type, ['fixa','variavel','momentanea','avulso'], true)) throw new InvalidArgumentException('Tipo de renda inválido.');
        $accounts = finance_load_set($this->db, $uid, 'accounts');
        $account = $this->resolveAccount($accounts, $args['account'] ?? null);
        $income = finance_load_set($this->db, $uid, 'income');
        $id = 'as_inc_' . substr(bin2hex(random_bytes(12)), 0, 24);
        $payday = isset($args['payday']) && $args['payday'] !== null ? (int)$args['payday'] : (int)substr($date, 8, 2);
        if ($payday < 1 || $payday > 31) throw new InvalidArgumentException('Dia de pagamento inválido.');
        $row = ['id'=>$id,'label'=>'Renda pelo assistente','value'=>fin_cents_to_number($valueCents),'type'=>$type,
            'date'=>$date,'endDate'=>null,'payday'=>$payday,'accountId'=>$account['id'],'createdAt'=>level_clock_epoch() * 1000];
        $next = [...$income, $row];
        finance_save_set($this->db, $uid, 'income', $next, true);
        $xpRef = 'financeiro:income:' . $id;
        $message = 'Renda de R$ ' . number_format(fin_cents_to_number($valueCents), 2, ',', '.')
            . ' registrada em ' . (string)$account['label'] . '.';
        return $this->mutationResult('add_income', $message, 'financeiro', [
            'kind'=>'finance_item','set'=>'income','id'=>$id,'itemHash'=>$this->itemHash($row),'accounts'=>[],'xpRef'=>$xpRef,
        ], ['id'=>$id,'value'=>fin_cents_to_number($valueCents),'date'=>$date,'type'=>$type,
            'account'=>(string)$account['label']]);
    }

    /** @param array<string,mixed> $args @return array<string,mixed> */
    private function addTransfer(int $uid, array $args): array {
        $valueCents = $this->positiveMoney($args['value'] ?? null);
        $date = training_date($args['date'] ?? null);
        $accounts = finance_load_set($this->db, $uid, 'accounts');
        $from = $this->resolveAccount($accounts, $args['from'] ?? null);
        $to = $this->resolveAccount($accounts, $args['to'] ?? null);
        if ((string)$from['id'] === (string)$to['id']) throw new InvalidArgumentException('Contas de origem e destino devem ser diferentes.');
        $available = fin_money_to_cents($from['saldo'] ?? 0) + fin_money_to_cents($from['chequeEspecial'] ?? 0);
        if ($available < $valueCents) throw new InvalidArgumentException('Saldo insuficiente para a transferência.');
        $transfers = $this->loadKvArray($uid, 'transfers');
        $id = 'as_tr_' . substr(bin2hex(random_bytes(12)), 0, 24);
        $transfer = ['id'=>$id,'value'=>fin_cents_to_number($valueCents),'date'=>$date,'from'=>$from['id'],'to'=>$to['id']];
        $nextAccounts = array_map(static function(array $item) use ($from, $to, $valueCents): array {
            if ((string)$item['id'] === (string)$from['id']) $item['saldo'] = fin_cents_to_number(fin_money_to_cents($item['saldo'] ?? 0) - $valueCents);
            if ((string)$item['id'] === (string)$to['id']) $item['saldo'] = fin_cents_to_number(fin_money_to_cents($item['saldo'] ?? 0) + $valueCents);
            return $item;
        }, $accounts);
        $nextTransfers = [...$transfers, $transfer];
        finance_save_set($this->db, $uid, 'accounts', $nextAccounts, false);
        finance_auxiliary_kv_save($this->db, $uid, 'transfers', $nextTransfers);
        $xpRef = 'financeiro:transfer:' . $id;
        progress_award_event($this->db, $uid, 'financeiro', $xpRef);
        $message = 'Transferência de R$ ' . number_format(fin_cents_to_number($valueCents), 2, ',', '.')
            . ' de ' . (string)$from['label'] . ' para ' . (string)$to['label'] . ' registrada.';
        return $this->mutationResult('add_transfer', $message, 'financeiro', [
            'kind'=>'finance_item','set'=>'transfers','id'=>$id,'itemHash'=>$this->itemHash($transfer),
            'accounts'=>[
                ['before'=>$from,'after'=>$this->findItem($nextAccounts, (string)$from['id'])],
                ['before'=>$to,'after'=>$this->findItem($nextAccounts, (string)$to['id'])],
            ],'xpRef'=>$xpRef,
        ], ['id'=>$id,'value'=>fin_cents_to_number($valueCents),'date'=>$date,
            'from'=>(string)$from['label'],'to'=>(string)$to['label']]);
    }

    private function addTask(int $uid, array $args): array {
        $task = routine_add_task($this->db, $uid, $args, 'assistant');
        $message = 'Tarefa “' . (string)$task['title'] . '” criada para ' . $this->datePtBr((string)$task['date'])
            . ' às ' . (string)$task['time'] . '.';
        return $this->mutationResult('add_task', $message, 'agenda', ['kind'=>'task','id'=>$task['id']], ['task'=>$task]);
    }

    private function createWorkout(int $uid, array $args): array {
        $workout = training_save_workout($this->db, $uid, $args + ['id'=>'as_wo_' . substr(bin2hex(random_bytes(12)), 0, 24)], 'assistant');
        $message = 'Treino “' . (string)$workout['name'] . '” criado com ' . count((array)$workout['exercises']) . ' exercício(s).';
        return $this->mutationResult('create_workout', $message, 'treinos', ['kind'=>'workout','id'=>$workout['id']], ['workout'=>$workout]);
    }

    /** @param array<string,mixed> $args @return array<string,mixed> */
    private function createWorkoutProgram(int $uid, array $args, array $approval = []): array {
        $daysPerWeek = (int)($args['daysPerWeek'] ?? 0);
        $location = is_string($args['location'] ?? null) ? $args['location'] : '';
        if ($daysPerWeek < 1 || $daysPerWeek > 7) throw new InvalidArgumentException('Dias por semana inválido.');
        if (!in_array($location, ['casa', 'academia'], true)) throw new InvalidArgumentException('Local de treino inválido.');
        $planned = $args['workouts'] ?? null;
        if (!is_array($planned) || $planned === [] || count($planned) > 7) throw new InvalidArgumentException('Programa precisa de 1 a 7 treinos.');

        $activated = training_activate_program($this->db, $uid, $args, $approval);
        $workouts = $activated['workouts'];
        $message = 'Programa aprovado: ' . count($workouts) . ' nova(s) ficha(s), ' . $daysPerWeek . ' dia(s) por semana (' . $location . ').';
        return $this->mutationResult('create_workout_program', $message, 'treinos', [
            'kind'=>'training_program_version', 'newProgramId'=>$activated['newProgramId'],
            'previousProgramIds'=>$activated['previousProgramIds'],
        ], [
            'daysPerWeek'=>$daysPerWeek, 'location'=>$location, 'workouts'=>$workouts, 'program'=>$activated['program'],
        ]);
    }

    private function logWorkoutSession(int $uid, array $args): array {
        $session = training_log_session($this->db, $uid, $args + ['id'=>'as_ts_' . substr(bin2hex(random_bytes(12)), 0, 24), 'date'=>level_clock_today()->format('Y-m-d')], 'assistant', true);
        $message = 'Sessão “' . (string)$session['name'] . '” registrada com ' . count((array)$session['exercises']) . ' exercício(s).';
        return $this->mutationResult('log_workout_session', $message, 'treinos', ['kind'=>'session','id'=>$session['id']], ['session'=>$session]);
    }

    private function logMeasurement(int $uid, array $args): array {
        $measurement = training_log_measurement($this->db, $uid, $args + ['id'=>'as_bm_' . substr(bin2hex(random_bytes(12)), 0, 24)], 'assistant');
        $message = 'Medida ' . (string)$measurement['type'] . ': ' . number_format((float)$measurement['value'], 2, ',', '.')
            . ' ' . (string)$measurement['unit'] . ' registrada.';
        return $this->mutationResult('log_measurement', $message, 'treinos', ['kind'=>'measurement','id'=>$measurement['id']], ['measurement'=>$measurement]);
    }

    private function logCardio(int $uid, array $args): array {
        $label = $this->text($args['modality'] ?? null, 32);
        $session = training_log_session($this->db, $uid, [
            'id'=>'as_cd_' . substr(bin2hex(random_bytes(12)), 0, 24), 'name'=>ucfirst($label), 'modality'=>'cardio',
            'date'=>level_clock_today()->format('Y-m-d'), 'durationSec'=>$args['durationSec'] ?? null,
            'exercises'=>[['name'=>ucfirst($label),'modality'=>'cardio','distanceKm'=>$args['distanceKm'] ?? null,
                'durationSec'=>$args['durationSec'] ?? null,'avgHr'=>$args['avgHr'] ?? null]],
        ], 'assistant', true);
        $message = ucfirst($label) . ' de ' . number_format((float)($args['distanceKm'] ?? 0), 2, ',', '.') . ' km registrado.';
        return $this->mutationResult('log_cardio', $message, 'treinos', ['kind'=>'session','id'=>$session['id']], ['session'=>$session]);
    }

    /** @param array<string,mixed> $args @return array<string,mixed> */
    private function createDietPlan(int $uid, array $args, array $approval = []): array {
        $plan = $this->dietPlanDraft($args);
        $goal = (string)$plan['goal'];
        $periodDays = (int)$plan['periodDays'];
        $budgetCents = (int)round((float)$plan['budgetBRL'] * 100);
        $estimatedCents = (int)round((float)$plan['estimatedCostBRL'] * 100);
        $activated = nutrition_activate_plan($this->db, $uid, $plan, 'assistant');
        $plan = $activated['plan'];
        $message = 'Plano alimentar aprovado: ' . $goal . ', ' . $periodDays . ' dia(s), custo estimado de R$ '
            . number_format(fin_cents_to_number($estimatedCents), 2, ',', '.') . ' (orçamento R$ '
            . number_format(fin_cents_to_number($budgetCents), 2, ',', '.') . ').';
        return $this->mutationResult('create_diet_plan', $message, 'alimentacao', [
            'kind'=>'diet_plan_version', 'activatedId'=>$activated['activatedId'],
            'previousId'=>$activated['previousId'], 'previousLegacy'=>$activated['previousLegacy'],
        ], ['plan' => $plan]);
    }

    /** @param array<string,mixed> $args @return array<string,mixed> */
    private function dietPlanDraft(array $args): array {
        $goal = is_string($args['goal'] ?? null) ? $args['goal'] : '';
        if (!in_array($goal, ['emagrecimento', 'hipertrofia', 'manutencao'], true)) throw new InvalidArgumentException('Objetivo inválido.');
        $periodDays = (int)($args['periodDays'] ?? 0);
        if ($periodDays < 1 || $periodDays > 30) throw new InvalidArgumentException('Período inválido.');
        $budgetCents = $this->positiveMoney($args['budgetBRL'] ?? null);
        $days = $args['days'] ?? null;
        if (!is_array($days) || $days === [] || count($days) > 30) throw new InvalidArgumentException('Plano precisa de 1 a 30 dias.');

        $normalizedDays = [];
        $dailyCostsCents = [];
        foreach (array_values($days) as $day) {
            if (!is_array($day) || !is_array($day['meals'] ?? null)) throw new InvalidArgumentException('Dia do plano inválido.');
            $meals = [];
            $dayCostCents = 0;
            foreach (array_values($day['meals']) as $meal) {
                if (!is_array($meal)) throw new InvalidArgumentException('Refeição inválida.');
                $mealCostCents = $this->positiveMoney($meal['estimatedCostBRL'] ?? null);
                $dayCostCents += $mealCostCents;
                $meals[] = [
                    'name' => $this->text($meal['name'] ?? null, 64),
                    'description' => $this->text($meal['description'] ?? null, 500),
                    'estimatedCostBRL' => fin_cents_to_number($mealCostCents),
                ];
            }
            $normalizedDays[] = ['day' => (int)($day['day'] ?? 0), 'meals' => $meals];
            $dailyCostsCents[] = $dayCostCents;
        }

        $estimatedCents = DietPlanCostCalculator::totalForPeriod($dailyCostsCents, $periodDays);
        if ($estimatedCents > $budgetCents) throw new DietPlanBudgetExceeded($estimatedCents, $budgetCents);

        $plan = [
            'goal' => $goal,
            'periodDays' => $periodDays,
            'budgetBRL' => fin_cents_to_number($budgetCents),
            'estimatedCostBRL' => fin_cents_to_number($estimatedCents),
            'days' => $normalizedDays,
            'createdAt' => level_clock_now()->format(DATE_ATOM),
            'source' => 'assistant',
        ];
        return $plan;
    }

    private function query(int $uid, array $args): array {
        $question = mb_strtolower($this->text($args['question'] ?? null, 500), 'UTF-8');
        if (str_contains($question, 'gastando')
            || str_contains($question, 'gastei')
            || str_contains($question, 'despesa')
            || str_contains($question, 'dren')
            || (str_contains($question, 'gasto') && (str_contains($question, 'maior') || str_contains($question, 'categoria') || str_contains($question, 'mais')))
        ) {
            $message = $this->spendingAnalysis($uid);
        } elseif (str_contains($question, 'saldo') || str_contains($question, 'patrim')) {
            $accounts = finance_load_set($this->db, $uid, 'accounts');
            $balanceCents = 0;
            foreach ($accounts as $account) {
                $balanceCents += fin_money_to_cents($account['saldo'] ?? 0) - fin_money_to_cents($account['fatura'] ?? 0);
            }
            $message = 'Saldo líquido resumido: ' . number_format(fin_cents_to_number($balanceCents), 2, ',', '.') . ' BRL em ' . count($accounts) . ' conta(s).';
        } elseif (str_contains($question, 'produtividade')) {
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM xp_events WHERE user_id = ? AND type = 'rotina' AND created_at >= ?");
            $stmt->execute([$uid, level_clock_now()->modify('-7 days')->format('Y-m-d H:i:s')]);
            $completedWeek = (int)$stmt->fetchColumn();
            $tasks = routine_load_tasks($this->db, $uid);
            $pending = count(array_filter($tasks, static fn(array $task): bool => !($task['completed'] ?? false)));
            $message = 'Produtividade dos últimos 7 dias: ' . $completedWeek . ' tarefa(s) concluída(s). Hoje: '
                . $pending . ' pendente(s) de ' . count($tasks) . ' no total.';
        } elseif (str_contains($question, 'tarefa') || str_contains($question, 'rotina')) {
            $tasks = routine_load_tasks($this->db, $uid);
            $pending = count(array_filter($tasks, static fn(array $task): bool => !($task['completed'] ?? false)));
            $message = $pending . ' tarefa(s) pendente(s) de ' . count($tasks) . ' no total.';
        } elseif (str_contains($question, 'treino') || str_contains($question, 'cardio')) {
            $training = training_snapshot($this->db, $uid);
            $message = count($training['workouts']) . ' treino(s) e ' . count($training['sessions']) . ' sessão(ões) registradas.';
        } elseif (str_contains($question, 'imc') || str_contains($question, 'peso') || str_contains($question, 'medida')) {
            $latest = [];
            foreach (training_snapshot($this->db, $uid)['measurements'] as $measurement) {
                $type = (string)$measurement['type'];
                if (!isset($latest[$type])) $latest[$type] = $measurement;
            }
            $latest = array_values($latest);
            if ($latest === []) {
                $message = 'Ainda não há medidas corporais registradas.';
            } else {
                $message = 'Últimas medidas: ' . implode(', ', array_map(static fn(array $m): string => $m['type'] . ' ' . number_format((float)$m['value'], 2, ',', '.') . $m['unit'], array_slice($latest, 0, 5))) . '.';
                $byType = [];
                foreach ($latest as $m) $byType[(string)$m['type']] = (float)$m['value'];
                if (isset($byType['peso'], $byType['altura']) && $byType['altura'] > 0) {
                    $heightM = $byType['altura'] / 100;
                    $bmi = $byType['peso'] / ($heightM * $heightM);
                    $message .= ' IMC: ' . number_format($bmi, 1, ',', '.') . ' (' . $this->bmiLabel($bmi) . ').';
                }
            }
        } elseif (str_contains($question, 'aliment') || str_contains($question, 'dieta')
            || str_contains($question, 'cardápio') || str_contains($question, 'cardapio') || str_contains($question, 'refeição')) {
            $plan = $this->loadKvJson($uid, 'nutrition_plan_v1');
            if ($plan === null) {
                $message = 'Você ainda não possui um plano alimentar ativo. Posso montar um informando objetivo, período e orçamento.';
            } else {
                $goalLabels = ['emagrecimento' => 'emagrecimento', 'hipertrofia' => 'hipertrofia', 'manutencao' => 'manutenção'];
                $goal = $goalLabels[(string)($plan['goal'] ?? '')] ?? (string)($plan['goal'] ?? 'personalizado');
                $message = 'Seu plano de ' . $goal . ' cobre ' . (int)($plan['periodDays'] ?? 0)
                    . ' dia(s), com custo estimado de R$ ' . number_format((float)($plan['estimatedCostBRL'] ?? 0), 2, ',', '.')
                    . ' dentro do orçamento de R$ ' . number_format((float)($plan['budgetBRL'] ?? 0), 2, ',', '.') . '.';
            }
        } else {
            $message = 'Posso consultar saldos, análise de gastos, tarefas, produtividade, treinos, medidas, IMC e seu plano alimentar.';
        }
        return ['response'=>['ok'=>true,'status'=>'query','action'=>'query','message'=>$message,'module'=>null,'undoAvailable'=>false],
            'undo'=>null,'summary'=>'Consulta respondida.','module'=>'query'];
    }

    private function spendingAnalysis(int $uid): string {
        $monthStart = level_clock_today()->format('Y-m-01');
        $stmt = $this->db->prepare("SELECT COALESCE(category, 'sem categoria') AS category, COALESCE(SUM(value_cents), 0) AS total
            FROM transactions WHERE user_id = ? AND kind = 'expense' AND tx_date >= ?
            GROUP BY category ORDER BY total DESC LIMIT 5");
        $stmt->execute([$uid, $monthStart]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if ($rows === []) return 'Nenhuma despesa registrada neste mês ainda.';
        $totalCents = array_sum(array_map(static fn(array $r): int => (int)$r['total'], $rows));
        $parts = array_map(static function (array $r) use ($totalCents): string {
            $cents = (int)$r['total'];
            $pct = $totalCents > 0 ? round($cents * 100 / $totalCents) : 0;
            return $r['category'] . ' R$ ' . number_format($cents / 100, 2, ',', '.') . ' (' . $pct . '%)';
        }, array_slice($rows, 0, 3));
        return 'Maiores gastos do mês: ' . implode(' · ', $parts) . '. Total do mês: R$ ' . number_format($totalCents / 100, 2, ',', '.') . '.';
    }

    private function bmiLabel(float $bmi): string {
        return match (true) {
            $bmi < 18.5 => 'abaixo do peso',
            $bmi < 25 => 'peso normal',
            $bmi < 30 => 'sobrepeso',
            $bmi < 35 => 'obesidade grau I',
            $bmi < 40 => 'obesidade grau II',
            default => 'obesidade grau III',
        };
    }

    /** @return array<string,mixed> */
    private function mutationResult(string $action, string $message, string $module, array $undo, array $data): array {
        return ['response'=>['ok'=>true,'status'=>'applied','action'=>$action,'message'=>$message,'module'=>$module,'undoAvailable'=>true,'data'=>$data],
            'undo'=>$undo,'summary'=>$message,'module'=>$module];
    }

    /** @param list<array<string,mixed>> $accounts @return array<string,mixed> */
    private function resolveAccount(array $accounts, mixed $needle): array {
        $value = is_string($needle) ? trim($needle) : '';
        if ($value === '') throw new InvalidArgumentException('Conta obrigatória.');
        $normalized = $this->normalize($value);
        $matches = array_values(array_filter($accounts, fn(array $account): bool =>
            (string)($account['id'] ?? '') === $value || $this->normalize((string)($account['label'] ?? '')) === $normalized));
        if (count($matches) !== 1) throw new InvalidArgumentException(count($matches) ? 'Conta ambígua.' : 'Conta não encontrada.');
        return $matches[0];
    }

    private function positiveMoney(mixed $value): int {
        $cents = fin_money_to_cents($value);
        if ($cents <= 0 || $cents > 100_000_000_000) throw new InvalidArgumentException('Valor financeiro inválido.');
        return $cents;
    }

    private function text(mixed $value, int $max): string {
        if (!is_string($value)) throw new InvalidArgumentException('Texto inválido.');
        $clean = trim((string)preg_replace('/[\x00-\x1F\x7F]/u', '', $value));
        if ($clean === '' || mb_strlen($clean) > $max) throw new InvalidArgumentException('Texto inválido.');
        return $clean;
    }

    private function normalize(string $value): string {
        $value = mb_strtolower(trim($value), 'UTF-8');
        return preg_replace('/[^a-z0-9]/', '', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value) ?? '';
    }

    private function datePtBr(string $value): string {
        $parts = explode('-', $value);
        return count($parts) === 3 ? $parts[2] . '/' . $parts[1] . '/' . $parts[0] : $value;
    }

    /** @return array<string,mixed>|null */
    private function loadKvJson(int $uid, string $key): ?array {
        $stmt = $this->db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1');
        $stmt->execute([$uid, $key]);
        $value = $stmt->fetchColumn();
        $decoded = is_string($value) ? json_decode($value, true) : null;
        return is_array($decoded) ? $decoded : null;
    }

    private function saveKvJson(int $uid, string $key, ?array $value): void {
        if ($value === null) {
            $this->db->prepare('DELETE FROM kv_store WHERE user_id = ? AND data_key = ?')->execute([$uid, $key]);
            return;
        }
        $this->db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)')
            ->execute([$uid, $key, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]);
    }

    /** @return list<array<string,mixed>> */
    private function loadKvArray(int $uid, string $key): array {
        $stmt = $this->db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1');
        $stmt->execute([$uid, $key]);
        $value = $stmt->fetchColumn();
        $decoded = is_string($value) ? json_decode($value, true) : null;
        return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
    }

    /** @return list<array<string,mixed>> */
    private function loadFinanceUndoSet(int $uid, string $set): array {
        return match ($set) {
            'accounts','expense','income','income_var' => finance_load_set($this->db, $uid, $set),
            'transfers' => $this->loadKvArray($uid, 'transfers'),
            default => throw new RuntimeException('Undo financeiro inválido.'),
        };
    }

    private function restoreFinanceSet(int $uid, string $set, array $value): void {
        if ($set === 'transfers') finance_auxiliary_kv_save($this->db, $uid, 'transfers', $value);
        else finance_save_set($this->db, $uid, $set, $value, false);
    }

    /** @param list<array<string,mixed>> $items @return array<string,mixed>|null */
    private function findItem(array $items, string $id): ?array {
        foreach ($items as $item) if ((string)($item['id'] ?? '') === $id) return $item;
        return null;
    }

    /** @param array<string,mixed> $value */
    private function itemHash(array $value): string {
        ksort($value);
        return hash('sha256', json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }
}
