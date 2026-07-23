<?php
declare(strict_types=1);

/**
 * Controle de acesso por plano de assinatura.
 * REGRA: acesso SEMPRE lido da tabela subscriptions no servidor —
 * nunca do estado da tela/cliente. Plano so muda server-side
 * (futuro webhook do gateway), nunca por request do usuario.
 *
 * Fase 5A - Fachada publica e compativel. A leitura da tabela
 * subscriptions e a decisao de plano efetivo/autorizacao foram extraidas
 * para app/Modules/Subscription/{SubscriptionRepository,SubscriptionPolicy}.php.
 * Este arquivo so faz bootstrap (get_db()), monta repository+policy e
 * delega — nenhum chamador existente precisa mudar.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/app/Core/Clock.php';
require_once __DIR__ . '/app/Modules/Subscription/SubscriptionRepository.php';
require_once __DIR__ . '/app/Modules/Subscription/SubscriptionPolicy.php';

const PLAN_RANK = SUBSCRIPTION_PLAN_RANK;

/** Clock real, usado pela fachada — nunca pela policy pura diretamente. */
function subscription_real_clock(): int {
    return level_clock_epoch();
}

/**
 * Plano efetivo do usuario. Retorna 'free' se: sem row, status nao-ativo,
 * ou periodo pago expirado/invalido. So retorna plano pago se active E
 * dentro do periodo.
 */
function user_plan(int $uid): string {
    $snapshot = (new SubscriptionRepository(get_db()))->findByUserId($uid);
    return (new SubscriptionPolicy(subscription_real_clock(...)))->effectivePlan($snapshot);
}

/** true se o plano do usuario cobre pelo menos $minPlan. */
function plan_allows(int $uid, string $minPlan): bool {
    $snapshot = (new SubscriptionRepository(get_db()))->findByUserId($uid);
    return (new SubscriptionPolicy(subscription_real_clock(...)))->allows($snapshot, $minPlan);
}

/**
 * Corta com HTTP 402 (Payment Required) se o usuario nao tem plano suficiente.
 * Use em endpoints de feature paga, depois de require_login(). Consulta o
 * banco uma UNICA vez por chamada: o plano atual e calculado uma vez e
 * reaproveitado tanto pra decidir quanto pra montar o corpo do erro.
 */
function require_plan(int $uid, string $minPlan): void {
    $policy = new SubscriptionPolicy(subscription_real_clock(...));
    $snapshot = (new SubscriptionRepository(get_db()))->findByUserId($uid);
    $currentPlan = $policy->effectivePlan($snapshot);

    if (!$policy->allowsPlan($currentPlan, $minPlan)) {
        http_response_code(402);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'plan_required',
            'required_plan' => $minPlan,
            'current_plan' => $currentPlan,
        ]);
        exit;
    }
}
