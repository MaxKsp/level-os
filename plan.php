<?php
declare(strict_types=1);

/**
 * Controle de acesso por plano de assinatura.
 * REGRA: acesso SEMPRE lido da tabela subscriptions no servidor —
 * nunca do estado da tela/cliente. Plano so muda server-side
 * (futuro webhook do gateway), nunca por request do usuario.
 */

require_once __DIR__ . '/db.php';

const PLAN_RANK = ['free' => 0, 'individual' => 1, 'family' => 2];

/**
 * Plano efetivo do usuario. Retorna 'free' se: sem row, status nao-ativo,
 * ou periodo pago expirado. So retorna plano pago se active E dentro do periodo.
 */
function user_plan(int $uid): string {
    $stmt = get_db()->prepare('SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = ?');
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    if (!$row) return 'free';
    if ($row['status'] !== 'active') return 'free';
    if ($row['current_period_end'] !== null && strtotime($row['current_period_end']) < time()) return 'free';
    $plan = (string)$row['plan'];
    return isset(PLAN_RANK[$plan]) ? $plan : 'free';
}

/** true se o plano do usuario cobre pelo menos $minPlan. */
function plan_allows(int $uid, string $minPlan): bool {
    $need = PLAN_RANK[$minPlan] ?? 99;
    $have = PLAN_RANK[user_plan($uid)] ?? 0;
    return $have >= $need;
}

/**
 * Corta com HTTP 402 (Payment Required) se o usuario nao tem plano suficiente.
 * Use em endpoints de feature paga, depois de require_login().
 */
function require_plan(int $uid, string $minPlan): void {
    if (!plan_allows($uid, $minPlan)) {
        http_response_code(402);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'plan_required',
            'required_plan' => $minPlan,
            'current_plan' => user_plan($uid),
        ]);
        exit;
    }
}
