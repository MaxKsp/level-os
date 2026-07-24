<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Audit.php';
require_once dirname(__DIR__, 2) . '/Core/Clock.php';
require_once __DIR__ . '/AssistantRouter.php';
require_once __DIR__ . '/AssistantActionExecutor.php';
require_once __DIR__ . '/AssistantRepository.php';

final class AssistantUsageLimitExceeded extends RuntimeException {
}

final class AssistantService {
    private const UNDO_WINDOW_SECONDS = 45;
    private const CONFIRMATION_WINDOW_SECONDS = 300;

    public function __construct(
        private readonly PDO $db,
        private readonly AssistantRepository $repository,
        private readonly AssistantRouter $router,
        private readonly AssistantActionExecutor $executor,
    ) {
    }

    /** @return array<string,mixed> */
    public function handle(int $userId, string $requestId, string $text, ?string $module = null): array {
        $requestId = $this->requestId($requestId);
        $displayText = $this->command($text);
        $reservation = $this->repository->reserve($userId, $requestId);
        $status = (string)($reservation['status'] ?? '');
        if ($status !== 'routing') {
            $stored = $this->repository->responseFromRow($reservation, $userId);
            if ($stored !== null) return $stored + ['idempotent' => true];
            if ($status === 'failed') throw new AssistantProvidersExhausted('A tentativa anterior falhou. Envie um novo comando.');
            throw new RuntimeException('assistant_request_in_progress');
        }

        $provider = null;
        try {
            $agentKey = self::agentKey($module);
            $standaloneAction = AssistantPromptOptimizer::preferredAction($displayText, $module);
            $routingText = $standaloneAction !== null
                ? $displayText
                : $this->repository->continuationText($userId, $agentKey, $displayText);
            $preferredAction = $standaloneAction ?? AssistantPromptOptimizer::preferredAction($routingText, $module);
            $localRoute = AssistantPromptOptimizer::localRoute($routingText, $module);
            $scopeRefusal = AssistantPromptOptimizer::isOutOfScope($displayText, $module);
            $localDecision = $localRoute !== null || $scopeRefusal;
            $this->requireAvailableUsage($userId, $localDecision);
            $context = $this->executor->context(
                $userId,
                $localDecision ? null : $module,
                $preferredAction,
            );
            $routed = $this->router->route($userId, $scopeRefusal ? $displayText : $routingText, $context, $module);
            $provider = (string)$routed['provider'];
            $usage = self::routeUsage($routed);
            $route = $routed['route'];
            if (!is_array($route)) throw new AssistantRouteException('Rota inválida.');

            $accountClarification = $this->financialAccountClarification($userId, $route, $routingText, $context);
            if ($accountClarification !== null) {
                $route = ['clarification' => $accountClarification['fields']]
                    + ['clarificationMessage' => $accountClarification['message']]
                    + ['clarificationData' => $accountClarification['data']];
            }

            if (($route['refusal'] ?? null) === 'out_of_scope') {
                $response = [
                    'ok' => true,
                    'status' => 'refused',
                    'message' => self::scopeMessage($module),
                    'undoAvailable' => false,
                    'provider' => $provider,
                ];
                $this->repository->complete($userId, $requestId, 'refusal', $provider, 'refused', $response, null, null, 'Pedido fora do escopo.');
                $this->repository->saveHistory($userId, $agentKey, $requestId, $displayText, $response, $usage, $routingText);
                audit_record($this->db, $userId, 'assistant.refused', 'denied', [
                    'provider' => $provider,
                    'local_route' => (bool)($routed['local'] ?? false),
                    'usage' => is_array($routed['usage'] ?? null) ? $routed['usage'] : [],
                ]);
                return $response;
            }
            if (is_array($route['clarification'] ?? null)) {
                $fields = array_values(array_filter($route['clarification'], 'is_string'));
                $clarificationData = is_array($route['clarificationData'] ?? null)
                    ? $route['clarificationData']
                    : [];
                $response = [
                    'ok' => true,
                    'status' => 'clarification',
                    'message' => is_string($route['clarificationMessage'] ?? null)
                        ? (string)$route['clarificationMessage']
                        : 'Para continuar, informe: ' . implode(', ', $fields) . '.',
                    'module' => $module,
                    'undoAvailable' => false,
                    'provider' => $provider,
                    'data' => ['missingFields' => $fields] + $clarificationData,
                ];
                $this->repository->complete($userId, $requestId, 'clarification', $provider, 'clarification', $response, null, null, 'Informações adicionais solicitadas.');
                $this->repository->saveHistory($userId, $agentKey, $requestId, $displayText, $response, $usage, $routingText);
                audit_record($this->db, $userId, 'assistant.clarification', 'success', [
                    'provider' => $provider,
                    'fields' => $fields,
                    'local_route' => (bool)($routed['local'] ?? false),
                    'usage' => is_array($routed['usage'] ?? null) ? $routed['usage'] : [],
                ]);
                return $response;
            }

            if ($this->requiresConfirmation($route)) {
                try {
                    $previewData = $this->executor->preview($userId, $route);
                } catch (DietPlanBudgetOutsideTolerance $budgetError) {
                    $correction = self::dietBudgetCorrection($routingText, $budgetError);
                    $routed = $this->router->route(
                        $userId, $correction, $this->executor->context($userId, $module, 'create_diet_plan'), $module,
                    );
                    $provider = (string)$routed['provider'];
                    $usage = self::combineUsage($usage, self::routeUsage($routed));
                    $route = $routed['route'];
                    if (!is_array($route) || ($route['action'] ?? null) !== 'create_diet_plan') {
                        throw new AssistantRouteException('Não foi possível ajustar o plano ao orçamento.');
                    }
                    $previewData = $this->executor->preview($userId, $route);
                }
                $confirmationExpiry = level_clock_utc_sql(level_clock_epoch() + self::CONFIRMATION_WINDOW_SECONDS);
                $response = $this->confirmationResponse($route, $module, (string)$reservation['action_token'], $confirmationExpiry, $previewData);
                $response['provider'] = $provider;
                $pending = [
                    'kind' => 'confirmation',
                    'route' => $route,
                    'module' => self::agentKey($module),
                    'stateHash' => is_string($previewData['stateHash'] ?? null) ? $previewData['stateHash'] : null,
                ];
                $this->repository->complete(
                    $userId,
                    $requestId,
                    (string)($route['action'] ?? 'unknown'),
                    $provider,
                    'confirmation',
                    $response,
                    $pending,
                    $confirmationExpiry,
                    'Aguardando confirmação do usuário.',
                );
                $this->repository->saveHistory($userId, $agentKey, $requestId, $displayText, $response, $usage, $routingText);
                audit_record($this->db, $userId, 'assistant.confirmation_requested', 'success', [
                    'action' => (string)($route['action'] ?? 'unknown'),
                    'provider' => $provider,
                    'usage' => $usage,
                ]);
                return $response;
            }

            $autoCorrectedBudget = false;
            if (!$this->db->inTransaction()) $this->db->beginTransaction();
            $locked = $this->repository->findByRequest($userId, $requestId, true);
            if (!is_array($locked)) throw new RuntimeException('assistant_request_in_progress');
            if ((string)$locked['status'] !== 'routing') {
                $stored = $this->repository->responseFromRow($locked, $userId);
                if ($stored === null) throw new RuntimeException('assistant_request_in_progress');
                $this->db->commit();
                return $stored + ['idempotent' => true];
            }
            try {
                $result = $this->executor->execute($userId, $route, [], $module);
            } catch (DietPlanBudgetOutsideTolerance $budgetError) {
                $this->db->rollBack();
                $correction = self::dietBudgetCorrection($routingText, $budgetError);

                $routed = $this->router->route(
                    $userId,
                    $correction,
                    $this->executor->context($userId, $module, 'create_diet_plan'),
                    $module,
                );
                $provider = (string)$routed['provider'];
                $usage = self::combineUsage($usage, self::routeUsage($routed));
                $route = $routed['route'];
                if (!is_array($route) || ($route['action'] ?? null) !== 'create_diet_plan') {
                    throw new AssistantRouteException('Não foi possível ajustar o plano ao orçamento.');
                }

                $this->db->beginTransaction();
                $locked = $this->repository->findByRequest($userId, $requestId, true);
                if (!is_array($locked) || (string)$locked['status'] !== 'routing') {
                    throw new RuntimeException('assistant_request_in_progress');
                }
                $result = $this->executor->execute($userId, $route, [], $module);
                $autoCorrectedBudget = true;
            }
            $response = $result['response'];
            $undo = $result['undo'];
            $undoExpiry = $undo !== null ? level_clock_utc_sql(level_clock_epoch() + self::UNDO_WINDOW_SECONDS) : null;
            $response['provider'] = $provider;
            $response['actionToken'] = $undo !== null ? (string)$locked['action_token'] : null;
            $response['undoExpiresAt'] = $undoExpiry;
            $this->repository->complete(
                $userId,
                $requestId,
                (string)($route['action'] ?? 'unknown'),
                $provider,
                $undo !== null ? 'applied' : 'answered',
                $response,
                $undo,
                $undoExpiry,
                (string)$result['summary'],
            );
            $this->repository->saveHistory($userId, $agentKey, $requestId, $displayText, $response, $usage, $routingText);
            audit_record($this->db, $userId, 'assistant.action', 'success', [
                'action' => (string)($route['action'] ?? 'unknown'),
                'provider' => $provider,
                'cached_route' => (bool)($routed['cached'] ?? false),
                'local_route' => (bool)($routed['local'] ?? false),
                'budget_auto_corrected' => $autoCorrectedBudget,
                'usage' => $usage,
            ]);
            $this->db->commit();
            return $response;
        } catch (AssistantProvidersExhausted $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            $this->repository->fail($userId, $requestId, $provider, 'Cadeia de provedores indisponível.');
            audit_record($this->db, $userId, 'assistant.providers_exhausted', 'failure', []);
            throw $e;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            $this->repository->fail($userId, $requestId, $provider, 'Ação rejeitada ou inválida.');
            audit_record($this->db, $userId, 'assistant.action', 'failure', ['provider' => $provider, 'type' => get_class($e)]);
            throw $e;
        }
    }

    /** @return array<string,mixed> */
    public function resolveConfirmation(int $userId, string $actionToken, string $decision, array $approval = []): array {
        if (preg_match('/\A[a-f0-9]{32}\z/D', $actionToken) !== 1) throw new InvalidArgumentException('Token de confirmação inválido.');
        if (!in_array($decision, ['confirm', 'cancel'], true)) throw new InvalidArgumentException('Decisão inválida.');
        if (!$this->db->inTransaction()) $this->db->beginTransaction();
        try {
            $row = $this->repository->findByToken($userId, $actionToken, true);
            if (!is_array($row) || (string)$row['status'] !== 'confirmation') throw new RuntimeException('confirmation_unavailable');
            $expires = strtotime((string)($row['undo_expires_at'] ?? '') . ' UTC');
            if ($expires === false || $expires < level_clock_epoch()) throw new RuntimeException('confirmation_expired');
            $pending = $this->repository->undoFromRow($row, $userId);
            if (!is_array($pending) || ($pending['kind'] ?? null) !== 'confirmation' || !is_array($pending['route'] ?? null)) {
                throw new RuntimeException('confirmation_unavailable');
            }
            if ($decision === 'cancel') {
                $response = [
                    'ok'=>true, 'status'=>'cancelled', 'message'=>'Ação cancelada. Nenhum dado foi alterado.',
                    'module'=>self::responseModule($pending['module'] ?? null), 'undoAvailable'=>false,
                    'confirmationRequired'=>false, 'actionToken'=>$actionToken,
                ];
                $this->repository->resolveConfirmation($userId, $actionToken, 'cancelled', $response, null, null, 'Ação cancelada pelo usuário.');
                $this->repository->updateHistoryResponse($userId, (string)$row['request_id'], $response);
                audit_record($this->db, $userId, 'assistant.confirmation_cancelled', 'success', ['action'=>(string)$row['action_type']]);
                $this->db->commit();
                return $response;
            }

            $expectedStateHash = is_string($pending['stateHash'] ?? null) ? $pending['stateHash'] : null;
            if ($expectedStateHash !== null) {
                $currentPreview = $this->executor->preview($userId, $pending['route']);
                $currentStateHash = is_string($currentPreview['stateHash'] ?? null) ? $currentPreview['stateHash'] : null;
                if ($currentStateHash === null || !hash_equals($expectedStateHash, $currentStateHash)) {
                    throw new RuntimeException('confirmation_conflict');
                }
            }

            $approvedRoute = $pending['route'];
            if (is_array($approval['draft'] ?? null)
                && in_array((string)($approvedRoute['action'] ?? ''), ['create_diet_plan','create_workout','create_workout_program'], true)) {
                $approvedRoute['arguments'] = $approval['draft'];
                $this->executor->preview($userId, $approvedRoute);
            }
            $result = $this->executor->execute(
                $userId,
                $approvedRoute,
                $approval,
                self::responseModule($pending['module'] ?? null),
            );
            $response = $result['response'];
            $undo = $result['undo'];
            $undoExpiry = $undo !== null ? level_clock_utc_sql(level_clock_epoch() + self::UNDO_WINDOW_SECONDS) : null;
            $response['provider'] = is_string($row['provider'] ?? null) ? $row['provider'] : null;
            $response['actionToken'] = $undo !== null ? $actionToken : null;
            $response['undoExpiresAt'] = $undoExpiry;
            $response['confirmationRequired'] = false;
            $this->repository->resolveConfirmation(
                $userId,
                $actionToken,
                $undo !== null ? 'applied' : 'answered',
                $response,
                $undo,
                $undoExpiry,
                (string)$result['summary'],
            );
            $this->repository->updateHistoryResponse($userId, (string)$row['request_id'], $response);
            audit_record($this->db, $userId, 'assistant.confirmation_applied', 'success', ['action'=>(string)$row['action_type']]);
            $this->db->commit();
            return $response;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    /** @return array<string,mixed> */
    public function undo(int $userId, string $actionToken): array {
        if (preg_match('/\A[a-f0-9]{32}\z/D', $actionToken) !== 1) throw new InvalidArgumentException('Token de ação inválido.');
        if (!$this->db->inTransaction()) $this->db->beginTransaction();
        try {
            $row = $this->repository->findByToken($userId, $actionToken, true);
            if (!is_array($row) || (string)$row['status'] !== 'applied') throw new RuntimeException('undo_unavailable');
            $expires = strtotime((string)($row['undo_expires_at'] ?? '') . ' UTC');
            if ($expires === false || $expires < level_clock_epoch()) throw new RuntimeException('undo_expired');
            $undo = $this->repository->undoFromRow($row, $userId);
            if ($undo === null) throw new RuntimeException('undo_unavailable');
            $message = $this->executor->undo($userId, $undo);
            $response = ['ok'=>true, 'status'=>'undone', 'message'=>$message, 'undoAvailable'=>false, 'actionToken'=>$actionToken];
            $this->repository->markUndone($userId, $actionToken, $response);
            audit_record($this->db, $userId, 'assistant.undo', 'success', ['action' => (string)$row['action_type']]);
            $this->db->commit();
            return $response;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    private function requestId(string $value): string {
        $value = trim($value);
        if (preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/D', $value) !== 1) throw new InvalidArgumentException('requestId inválido.');
        return $value;
    }

    /**
     * Impede o provedor de escolher uma conta que o usuário não citou ou que
     * não existe. A lista vem do servidor e permanece isolada por user_id.
     *
     * @param array<string,mixed> $route
     * @param array<string,mixed> $context
     * @return array{fields:list<string>,message:string,data:array<string,mixed>}|null
     */
    private function financialAccountClarification(int $userId, array $route, string $routingText, array $context): ?array {
        $action = (string)($route['action'] ?? '');
        if (!in_array($action, ['add_expense', 'add_income', 'add_transfer'], true)) return null;

        $financeContext = $context['finance'] ?? null;
        if (!is_array($financeContext)) {
            $financeContext = $this->executor->context($userId, 'financeiro', $action)['finance'] ?? null;
        }
        $accounts = is_array($financeContext) && is_array($financeContext['accounts'] ?? null)
            ? array_values(array_filter($financeContext['accounts'], 'is_array'))
            : [];
        $fields = $action === 'add_transfer' ? ['conta de origem', 'conta de destino'] : ['conta'];
        if ($accounts === []) {
            return [
                'fields' => $fields,
                'message' => 'Você ainda não possui uma conta cadastrada. Cadastre uma conta em Finanças > Contas antes de fazer este lançamento.',
                'data' => ['availableAccounts' => [], 'requiresAccountSetup' => true],
            ];
        }
        if ($action === 'add_transfer' && count($accounts) < 2) {
            return [
                'fields' => $fields,
                'message' => 'Uma transferência precisa de duas contas cadastradas. Cadastre a conta de origem e a conta de destino em Finanças > Contas.',
                'data' => ['availableAccounts' => $this->accountOptions($accounts), 'requiresAccountSetup' => true],
            ];
        }

        $arguments = is_array($route['arguments'] ?? null) ? $route['arguments'] : [];
        $needles = $action === 'add_transfer'
            ? ['conta de origem' => $arguments['from'] ?? null, 'conta de destino' => $arguments['to'] ?? null]
            : ['conta' => $arguments['account'] ?? null];
        $missing = [];
        foreach ($needles as $field => $needle) {
            $account = $this->findContextAccount($accounts, $needle);
            if ($account === null || !$this->routingTextMentionsAccount($routingText, $account, $accounts)) {
                $missing[] = $field;
            }
        }
        if ($missing === []) return null;

        $labels = array_column($this->accountOptions($accounts), 'label');
        return [
            'fields' => $missing,
            'message' => 'Escolha ' . implode(' e ', $missing) . '. Contas disponíveis: ' . implode(', ', $labels) . '.',
            'data' => ['availableAccounts' => $this->accountOptions($accounts), 'requiresAccountSetup' => false],
        ];
    }

    /** @param list<array<string,mixed>> $accounts @return list<array{id:string,label:string,type:string}> */
    private function accountOptions(array $accounts): array {
        return array_map(static fn(array $account): array => [
            'id' => (string)($account['id'] ?? ''),
            'label' => (string)($account['label'] ?? ''),
            'type' => (string)($account['type'] ?? ''),
        ], array_slice($accounts, 0, 20));
    }

    /** @param list<array<string,mixed>> $accounts @return array<string,mixed>|null */
    private function findContextAccount(array $accounts, mixed $needle): ?array {
        if (!is_string($needle) || trim($needle) === '') return null;
        $normalized = self::normalizeAccountText($needle);
        $matches = array_values(array_filter($accounts, static fn(array $account): bool =>
            (string)($account['id'] ?? '') === trim($needle)
            || self::normalizeAccountText((string)($account['label'] ?? '')) === $normalized));
        return count($matches) === 1 ? $matches[0] : null;
    }

    /** @param array<string,mixed> $account @param list<array<string,mixed>> $accounts */
    private function routingTextMentionsAccount(string $routingText, array $account, array $accounts): bool {
        if (count($accounts) === 1) return true;
        $text = self::normalizeAccountText($routingText);
        $id = self::normalizeAccountText((string)($account['id'] ?? ''));
        $label = self::normalizeAccountText((string)($account['label'] ?? ''));
        if (($id !== '' && str_contains($text, $id)) || ($label !== '' && str_contains($text, $label))) return true;

        if (($account['principal'] ?? false) === true && str_contains($text, 'principal')) {
            return count(array_filter($accounts, static fn(array $item): bool => ($item['principal'] ?? false) === true)) === 1;
        }
        return false;
    }

    private static function normalizeAccountText(string $value): string {
        $value = mb_strtolower(trim($value), 'UTF-8');
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        return preg_replace('/[^a-z0-9]/', '', is_string($ascii) ? $ascii : $value) ?? '';
    }

    private function command(string $value): string {
        $value = trim($value);
        if ($value === '' || mb_strlen($value) > 2000 || str_contains($value, "\0")) throw new InvalidArgumentException('Comando inválido.');
        return $value;
    }

    /** @param array<string,mixed> $route */
    private function requiresConfirmation(array $route): bool {
        $action = (string)($route['action'] ?? '');
        if (in_array($action, ['create_diet_plan', 'create_workout', 'create_workout_program'], true)) return true;
        if ($action === 'add_transfer') return true;
        if ($action !== 'add_expense') return false;
        $configured = getenv('LEVELOS_ASSISTANT_EXPENSE_CONFIRM_CENTS');
        $threshold = $configured === false || trim($configured) === '' ? 50000 : (int)$configured;
        if ($threshold <= 0) return false;
        $arguments = is_array($route['arguments'] ?? null) ? $route['arguments'] : [];
        $valueCents = is_numeric($arguments['value'] ?? null) ? (int)round((float)$arguments['value'] * 100) : 0;
        return $valueCents >= max(100, min(100000000, $threshold));
    }

    private static function dietBudgetCorrection(
        string $routingText,
        DietPlanBudgetOutsideTolerance $budgetError,
    ): string {
        $direction = $budgetError->isBelowTarget() ? 'muito abaixo' : 'muito acima';

        return $routingText . "\n\nCORREÇÃO OBRIGATÓRIA: o cardápio calculado somou R$ "
            . number_format($budgetError->estimatedCents / 100, 2, ',', '.')
            . ', valor ' . $direction . ' da meta de R$ '
            . number_format($budgetError->budgetCents / 100, 2, ',', '.')
            . '. Recrie quantidades, alimentos e custos individuais para que a soma real de todas as refeições do período fique entre R$ '
            . number_format($budgetError->minimumCents / 100, 2, ',', '.')
            . ' e R$ ' . number_format($budgetError->maximumCents / 100, 2, ',', '.')
            . ', preferencialmente próxima da meta. Não altere apenas estimatedCostBRL: os custos individuais das refeições precisam fechar a soma.';
    }

    /** @param array<string,mixed> $route @return array<string,mixed> */
    private function confirmationResponse(array $route, ?string $module, string $actionToken, string $expiresAt, ?array $previewData = null): array {
        $action = (string)($route['action'] ?? '');
        $arguments = is_array($route['arguments'] ?? null) ? $route['arguments'] : [];
        $value = is_numeric($arguments['value'] ?? null) ? (float)$arguments['value'] : 0.0;
        $formatted = number_format($value, 2, ',', '.');
        if ($action === 'create_diet_plan') {
            $message = 'Revise o cardápio antes de aprovar. Nenhum plano foi alterado ainda.';
            $data = $previewData ?? ['plan'=>$arguments];
        } elseif ($action === 'create_workout_program') {
            $message = 'Revise o programa antes de aprovar. Nenhuma ficha foi alterada ainda.';
            $data = $previewData ?? $arguments;
        } elseif ($action === 'create_workout') {
            $message = 'Revise a ficha antes de aprovar. Nenhum treino foi alterado ainda.';
            $data = $previewData ?? ['workout'=>$arguments];
        } elseif ($action === 'add_transfer') {
            $message = 'Confirme a transferência de R$ ' . $formatted . ' antes de alterar os saldos.';
            $data = [
                'value'=>$value, 'from'=>(string)($arguments['from'] ?? ''),
                'to'=>(string)($arguments['to'] ?? ''), 'date'=>(string)($arguments['date'] ?? ''),
            ];
        } else {
            $message = 'Confirme a despesa de R$ ' . $formatted . ' antes de registrá-la.';
            $data = [
                'value'=>$value, 'description'=>(string)($arguments['description'] ?? ''),
                'category'=>(string)($arguments['category'] ?? ''), 'account'=>(string)($arguments['account'] ?? ''),
                'date'=>(string)($arguments['date'] ?? ''),
            ];
        }
        return [
            'ok'=>true, 'status'=>'confirmation', 'action'=>$action, 'message'=>$message,
            'module'=>self::responseModule($module), 'undoAvailable'=>false,
            'confirmationRequired'=>true, 'confirmationExpiresAt'=>$expiresAt,
            'actionToken'=>$actionToken, 'data'=>$data,
        ];
    }

    private function requireAvailableUsage(int $userId, bool $localRoute): void {
        if ($localRoute) return;
        $configured = getenv('LEVELOS_ASSISTANT_DAILY_TOKEN_LIMIT');
        $limit = $configured === false || trim($configured) === '' ? 100000 : (int)$configured;
        if ($limit <= 0) return;
        $limit = max(1000, min(10000000, $limit));
        if ($this->repository->dailyTokenUsage($userId) >= $limit) {
            throw new AssistantUsageLimitExceeded('assistant_daily_limit');
        }
    }

    private static function agentKey(?string $module): string {
        return in_array($module, ['financeiro', 'agenda', 'treinos', 'alimentacao'], true) ? (string)$module : 'geral';
    }

    private static function scopeMessage(?string $module): string {
        return match ($module) {
            'financeiro' => 'O Assessor Fin ajuda apenas com suas finanças no Level OS.',
            'agenda' => 'A Secretária Nina ajuda apenas com rotina, agenda, tarefas e produtividade.',
            'treinos' => 'O Personal Léo ajuda apenas com treinos, cardio e medidas corporais.',
            'alimentacao' => 'A Chef Rita ajuda apenas com alimentação, receitas, cardápios e planos alimentares.',
            default => 'Posso ajudar apenas com finanças, rotina, treinos, alimentação e consultas dos seus dados no Level OS.',
        };
    }

    private static function responseModule(mixed $module): ?string {
        return in_array($module, ['financeiro', 'agenda', 'treinos', 'alimentacao'], true) ? (string)$module : null;
    }

    /** @param array<string,mixed> $routed @return array{prompt_tokens:int,completion_tokens:int,total_tokens:int} */
    private static function routeUsage(array $routed): array {
        $usage = is_array($routed['usage'] ?? null) ? $routed['usage'] : [];
        $prompt = max(0, (int)($usage['prompt_tokens'] ?? 0));
        $completion = max(0, (int)($usage['completion_tokens'] ?? 0));
        return [
            'prompt_tokens' => $prompt,
            'completion_tokens' => $completion,
            'total_tokens' => max($prompt + $completion, (int)($usage['total_tokens'] ?? 0)),
        ];
    }

    /** @param array{prompt_tokens:int,completion_tokens:int,total_tokens:int} $left @param array{prompt_tokens:int,completion_tokens:int,total_tokens:int} $right */
    private static function combineUsage(array $left, array $right): array {
        return [
            'prompt_tokens' => $left['prompt_tokens'] + $right['prompt_tokens'],
            'completion_tokens' => $left['completion_tokens'] + $right['completion_tokens'],
            'total_tokens' => $left['total_tokens'] + $right['total_tokens'],
        ];
    }
}
