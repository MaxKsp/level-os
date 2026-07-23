<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/http_smoke_client.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Subscription/SubscriptionRepository.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Subscription/SubscriptionPolicy.php';

/**
 * Fase 5A - Modularizacao de Subscription. Cobre SubscriptionRepository
 * (leitura via PDO, prepared statement, so por user_id), SubscriptionPolicy
 * (decisao pura de plano efetivo/autorizacao, clock injetavel, nunca
 * PDO/get_db/time/strtotime) e a fachada compativel em plan.php + o
 * adapter api/subscription.php (consulta unica, shape preservado).
 *
 * db.php e auth.php nao podem ser alterados nem ter get_db() sobrescrita
 * a partir dos testes (mesma restricao dos testes de Finance), entao a
 * cobertura via HTTP real se limita ao guard de autenticacao (401). A
 * garantia de "consulta unica por chamada" na fachada (plan.php) e no
 * adapter (api/subscription.php) — ambos so chamam get_db() de verdade —
 * e provada por inspecao do codigo-fonte (contagem de chamadas a
 * findByUserId()/get_db() dentro de cada funcao), e nao dinamicamente.
 * Tudo que nao depende de get_db() (SubscriptionRepository,
 * SubscriptionPolicy) e testado chamando as classes direto, com PDO
 * SQLite injetado.
 */

/** Spy de PDO: registra toda query preparada, pra provar prepared statement + consulta unica. */
final class SubSpyPdo extends PDO {
    public array $calls = [];

    public function prepare(string $query, array $options = []): PDOStatement|false {
        $this->calls[] = $query;
        return parent::prepare($query, $options);
    }
}

function sub_make_sqlite(): PDO {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('CREATE TABLE subscriptions (user_id INTEGER PRIMARY KEY, plan TEXT NOT NULL, status TEXT NOT NULL, current_period_end TEXT NULL, trial_ends_at TEXT NULL)');
    return $db;
}

function sub_insert(PDO $db, int $uid, string $plan, string $status, ?string $periodEnd, ?string $trialEnd = null): void {
    $stmt = $db->prepare('INSERT INTO subscriptions (user_id, plan, status, current_period_end, trial_ends_at) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$uid, $plan, $status, $periodEnd, $trialEnd]);
}

/**
 * Remove comentarios (// # /* * / /** *\/) do source PHP, mantendo so o
 * codigo de verdade — as checagens de "nunca referencia X" precisam olhar
 * pro CODIGO, nao pra prosa de docblock que so descreve a regra.
 */
function sub_strip_php_comments(string $source): string {
    $out = '';
    foreach (token_get_all($source) as $token) {
        if (is_array($token) && in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true)) {
            continue;
        }
        $out .= is_array($token) ? $token[1] : $token;
    }
    return $out;
}

/**
 * Extrai o corpo de uma funcao top-level do source (do "function NOME("
 * ate a chave de fechamento correspondente, por contagem de chaves) —
 * usado pra provar que a fachada em plan.php consulta a assinatura
 * exatamente uma vez por chamada, sem precisar executar get_db() de verdade.
 */
function sub_extract_function_body(string $source, string $functionName): string {
    $needle = 'function ' . $functionName . '(';
    $start = strpos($source, $needle);
    if ($start === false) {
        throw new RuntimeException("Function not found in source: $functionName");
    }
    $braceStart = strpos($source, '{', $start);
    if ($braceStart === false) {
        throw new RuntimeException("Function body opening brace not found: $functionName");
    }
    $depth = 0;
    $len = strlen($source);
    for ($i = $braceStart; $i < $len; $i++) {
        if ($source[$i] === '{') $depth++;
        if ($source[$i] === '}') {
            $depth--;
            if ($depth === 0) {
                return substr($source, $braceStart, $i - $braceStart + 1);
            }
        }
    }
    throw new RuntimeException("Unbalanced braces while extracting function body: $functionName");
}

return function (): void {
    $repoRoot = test_repo_root();
    $fixedNow = 1_800_000_000; // instante fixo qualquer, usado como "agora" nos testes de policy

    // ==== A: SubscriptionPolicy::effectivePlan() — matriz completa ====

    $clock = static fn(): int => $fixedNow;
    $policy = new SubscriptionPolicy($clock);

    test_assert_same('free', $policy->effectivePlan(null), 'Sem snapshot (sem row) deve ser free.');

    foreach (['active', 'canceled', 'past_due', 'unknown_status'] as $status) {
        $snapshot = SubscriptionRepository::buildSnapshot('individual', $status, null);
        $expected = $status === 'active' ? 'individual' : 'free';
        test_assert_same($expected, $policy->effectivePlan($snapshot), "Status '$status' com current_period_end nulo deve resultar em '$expected'.");
    }

    // current_period_end null (sem expiracao) com status active: nunca expira.
    $neverExpires = SubscriptionRepository::buildSnapshot('individual', 'active', null);
    test_assert_same('individual', $policy->effectivePlan($neverExpires), 'current_period_end null com status active nunca expira.');

    // data anterior ao instante atual: expirado -> free.
    $expiredSnapshot = SubscriptionRepository::buildSnapshot('individual', 'active', gmdate('Y-m-d H:i:s', $fixedNow - 1));
    test_assert_same('free', $policy->effectivePlan($expiredSnapshot), 'Data de expiracao ANTES do clock atual deve resultar em free.');

    // data exatamente igual ao instante atual: ainda valida (so expira estritamente antes do agora).
    $exactSnapshot = SubscriptionRepository::buildSnapshot('individual', 'active', gmdate('Y-m-d H:i:s', $fixedNow));
    test_assert_same('individual', $policy->effectivePlan($exactSnapshot), 'Data de expiracao IGUAL ao clock atual ainda deve ser valida.');

    // data posterior ao instante atual: valida.
    $futureSnapshot = SubscriptionRepository::buildSnapshot('individual', 'active', gmdate('Y-m-d H:i:s', $fixedNow + 1));
    test_assert_same('individual', $policy->effectivePlan($futureSnapshot), 'Data de expiracao DEPOIS do clock atual deve resultar no plano pago.');

    // data invalida: falha fechado como free, mesmo com status active.
    $invalidDateSnapshot = SubscriptionRepository::buildSnapshot('individual', 'active', 'not-a-real-date');
    test_assert_true($invalidDateSnapshot->currentPeriodEndInvalid, 'Test setup sanity: uma string de data invalida deve ser marcada como invalida pelo repository.');
    test_assert_same('free', $policy->effectivePlan($invalidDateSnapshot), 'Data de expiracao invalida deve falhar fechado como free, mesmo com status active.');

    // plano desconhecido no snapshot vira free.
    $unknownPlanSnapshot = SubscriptionRepository::buildSnapshot('enterprise', 'active', null);
    test_assert_same('free', $policy->effectivePlan($unknownPlanSnapshot), 'Plano desconhecido no snapshot deve resultar em free.');

    $trialEnd = gmdate('Y-m-d H:i:s', $fixedNow + 86401);
    $trialSnapshot = SubscriptionRepository::buildSnapshot('free', 'active', null, $trialEnd);
    test_assert_same('individual', $policy->effectivePlan($trialSnapshot), 'Trial vigente deve liberar o nível individual sem alterar o plano armazenado.');
    test_assert_true($policy->allows($trialSnapshot, 'individual'), 'Trial vigente deve ser honrado por require_plan/allows.');
    $expiredTrial = SubscriptionRepository::buildSnapshot('free', 'active', null, gmdate('Y-m-d H:i:s', $fixedNow));
    test_assert_same('free', $policy->effectivePlan($expiredTrial), 'Trial expira exatamente no instante trial_ends_at.');

    // clock injetavel: o MESMO snapshot expirado sob o clock fixo vira valido sob um clock "mais cedo" — prova que a decisao usa o clock injetado, nao o relogio real.
    $earlierPolicy = new SubscriptionPolicy(static fn(): int => $fixedNow - 10);
    test_assert_same('individual', $earlierPolicy->effectivePlan($expiredSnapshot), 'O mesmo snapshot deve ser valido sob um clock injetado ANTES da expiracao.');

    // ==== B: allows()/allowsPlan() — minPlan desconhecido nunca autoriza ====

    test_assert_true($policy->allows(null, 'free'), 'Sem snapshot, minPlan free deve ser permitido (free cobre free).');
    test_assert_true(!$policy->allows(null, 'individual'), 'Sem snapshot, minPlan individual deve ser negado.');
    test_assert_true($policy->allows($neverExpires, 'individual'), 'individual deve cobrir individual.');
    test_assert_true(!$policy->allows($expiredSnapshot, 'individual'), 'Snapshot expirado nao deve cobrir individual.');
    test_assert_true(!$policy->allowsPlan('individual', 'plano_desconhecido_xyz'), 'minPlan desconhecido nunca deve ser autorizado pelo plano individual.');
    test_assert_true(!$policy->allowsPlan('family', 'individual'), 'Plano family legado deve falhar fechado depois da migração para o plano único.');
    test_assert_true($policy->allowsPlan('individual', 'individual'), 'Test setup sanity: individual deve cobrir individual.');

    // ==== C: SubscriptionRepository — prepared statement, so por user_id, consulta unica ====

    $spy = new SubSpyPdo('sqlite::memory:');
    $spy->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $spy->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $spy->exec('CREATE TABLE subscriptions (user_id INTEGER PRIMARY KEY, plan TEXT NOT NULL, status TEXT NOT NULL, current_period_end TEXT NULL, trial_ends_at TEXT NULL)');
    sub_insert($spy, 7, 'individual', 'active', null);
    sub_insert($spy, 8, 'individual', 'canceled', '2020-01-01 00:00:00');
    $spy->calls = []; // reset: so quer capturar o que o repository faz a partir daqui

    $repository = new SubscriptionRepository($spy);
    $foundSnapshot = $repository->findByUserId(7);
    test_assert_same(1, count($spy->calls), 'findByUserId() deve emitir exatamente uma query preparada.');
    test_assert_same('SELECT plan, status, current_period_end, trial_ends_at FROM subscriptions WHERE user_id = ?', $spy->calls[0], 'A query deve ser exatamente esta, filtrando exclusivamente por user_id.');
    test_assert_true($foundSnapshot !== null && $foundSnapshot->plan === 'individual', 'findByUserId() deve retornar o snapshot correto pro usuario existente.');

    $spy->calls = [];
    $missingSnapshot = $repository->findByUserId(999);
    test_assert_same(1, count($spy->calls), 'findByUserId() pra um usuario ausente ainda deve emitir exatamente uma query preparada.');
    test_assert_true($missingSnapshot === null, 'findByUserId() deve retornar null quando nao ha row pro usuario.');

    $inactiveSnapshot = $repository->findByUserId(8);
    test_assert_true($inactiveSnapshot !== null && $inactiveSnapshot->status === 'canceled' && $inactiveSnapshot->currentPeriodEnd === '2020-01-01 00:00:00', 'findByUserId() deve normalizar status/current_period_end tal como armazenados, sem decidir autorizacao.');

    // ==== D: SubscriptionPolicy.php nunca referencia PDO/get_db/time/strtotime ====

    $policyCode = sub_strip_php_comments((string)file_get_contents($repoRoot . '/app/Modules/Subscription/SubscriptionPolicy.php'));
    test_assert_true(!str_contains($policyCode, 'PDO'), 'SubscriptionPolicy.php (codigo, fora de comentarios) nunca deve referenciar PDO.');
    test_assert_true(!str_contains($policyCode, 'get_db('), 'SubscriptionPolicy.php (codigo, fora de comentarios) nunca deve chamar get_db().');
    test_assert_true(!preg_match('/(?<![a-zA-Z_])time\(/', $policyCode), 'SubscriptionPolicy.php (codigo, fora de comentarios) nunca deve chamar time() diretamente.');
    test_assert_true(!str_contains($policyCode, 'strtotime('), 'SubscriptionPolicy.php (codigo, fora de comentarios) nunca deve chamar strtotime().');

    // ==== E: plan.php — cada funcao publica consulta a assinatura exatamente uma vez ====

    $planSource = (string)file_get_contents($repoRoot . '/plan.php');
    test_assert_true(str_contains($planSource, "const PLAN_RANK = SUBSCRIPTION_PLAN_RANK;"), 'PLAN_RANK deve continuar publica em plan.php (fachada compativel).');
    foreach (['user_plan', 'plan_allows', 'require_plan'] as $fn) {
        $body = sub_extract_function_body($planSource, $fn);
        $count = substr_count($body, 'findByUserId(');
        test_assert_same(1, $count, "$fn() deve consultar a assinatura exatamente uma vez (findByUserId) dentro do proprio corpo — encontrado: $count.");
    }

    // ==== F: describeForApi() — shape exato do endpoint ====

    test_assert_same(
        ['plan' => 'free', 'status' => 'active', 'current_period_end' => null, 'in_trial' => false, 'trial_ends_at' => null, 'trial_days_left' => 0, 'access' => false],
        $policy->describeForApi(null),
        'Sem row: plan=free, status=active (fallback legado), current_period_end=null.'
    );

    $inactiveExpired = SubscriptionRepository::buildSnapshot('individual', 'canceled', '2020-01-01 00:00:00');
    test_assert_same(
        ['plan' => 'free', 'status' => 'canceled', 'current_period_end' => '2020-01-01 00:00:00', 'in_trial' => false, 'trial_ends_at' => null, 'trial_days_left' => 0, 'access' => false],
        $policy->describeForApi($inactiveExpired),
        'Row inativa: plan cai pra free, mas status e current_period_end continuam refletindo a row.'
    );

    $activeButExpiredPeriod = gmdate('Y-m-d H:i:s', $fixedNow - 100);
    $activeButExpired = SubscriptionRepository::buildSnapshot('individual', 'active', $activeButExpiredPeriod);
    test_assert_same(
        ['plan' => 'free', 'status' => 'active', 'current_period_end' => $activeButExpiredPeriod, 'in_trial' => false, 'trial_ends_at' => null, 'trial_days_left' => 0, 'access' => false],
        $policy->describeForApi($activeButExpired),
        'Row ativa mas expirada: plan cai pra free, status/current_period_end continuam refletindo a row (nunca viram active/null so por conta da expiracao).'
    );

    $activeValid = SubscriptionRepository::buildSnapshot('individual', 'active', null);
    test_assert_same(
        ['plan' => 'individual', 'status' => 'active', 'current_period_end' => null, 'in_trial' => false, 'trial_ends_at' => null, 'trial_days_left' => 0, 'access' => true],
        $policy->describeForApi($activeValid),
        'Row ativa e valida: plan reflete o plano real.'
    );

    test_assert_same(
        ['plan' => 'individual', 'status' => 'active', 'current_period_end' => null, 'in_trial' => true, 'trial_ends_at' => $trialEnd, 'trial_days_left' => 2, 'access' => true],
        $policy->describeForApi($trialSnapshot),
        'Trial vigente deve expor prazo e acesso calculados somente pelo relógio do servidor.'
    );

    // ==== F2: api/subscription.php — consulta unica, contrato preservado ====

    $apiSource = (string)file_get_contents($repoRoot . '/api/subscription.php');
    test_assert_same(1, substr_count($apiSource, 'findByUserId('), 'api/subscription.php deve consultar a assinatura exatamente uma vez.');
    test_assert_same(1, substr_count($apiSource, 'get_db('), 'api/subscription.php deve chamar get_db() exatamente uma vez (uma unica conexao/consulta por request).');
    test_assert_true(str_contains($apiSource, 'require_login()'), 'Test setup sanity: autenticacao deve continuar presente em api/subscription.php.');
    test_assert_true(str_contains($apiSource, "require_rate_limit('subscription'"), 'Test setup sanity: rate limit deve continuar presente em api/subscription.php.');
    test_assert_true(str_contains($apiSource, 'session_write_close()'), 'Test setup sanity: session_write_close() deve continuar presente em api/subscription.php.');

    // ==== G: guard de autenticacao via HTTP real (sem sessao -> 401 antes de tocar o banco) ====

    $r = fapi_run_isolated_request($repoRoot, '/api/subscription.php', 'GET', '', []);
    test_assert_same(401, $r['status'], 'api/subscription.php sem sessao deve retornar 401.');
};
