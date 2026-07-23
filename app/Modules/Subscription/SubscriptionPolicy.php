<?php
declare(strict_types=1);

require_once __DIR__ . '/SubscriptionRepository.php';

/**
 * Fase 5A - Decisao pura de plano efetivo e autorizacao, extraida de
 * plan.php. Nunca referencia PDO/get_db e nunca chama time()/strtotime()
 * — so consome um SubscriptionSnapshot ja normalizado (SubscriptionRepository)
 * e um clock injetado no construtor (callable(): int), pra decisao
 * temporal ficar deterministica e testavel sem depender do relogio real
 * nem reabrir conexao com o banco. O clock "de verdade" (time()) e
 * responsabilidade exclusiva de quem monta esta classe (a fachada em
 * plan.php / api/subscription.php), nunca desta classe.
 */

const SUBSCRIPTION_PLAN_RANK = ['free' => 0, 'individual' => 1];

final class SubscriptionPolicy {
    /** @var callable(): int */
    private $clock;

    /** @param callable(): int $clock */
    public function __construct(callable $clock) {
        $this->clock = $clock;
    }

    /**
     * Plano efetivo do usuario. 'free' se: sem snapshot, status != active,
     * data de expiracao invalida (falha fechado), ou epoch de expiracao
     * anterior ao clock atual. Plano desconhecido no snapshot tambem vira
     * 'free'. Data de expiracao igual ao instante atual ainda conta como
     * valida (so expira estritamente ANTES do agora).
     */
    public function effectivePlan(?SubscriptionSnapshot $snapshot): string {
        if ($snapshot === null) {
            return 'free';
        }
        $now = ($this->clock)();
        $paidActive = $this->hasPaidAccessAt($snapshot, $now);
        if ($paidActive) {
            return $snapshot->plan;
        }
        return $this->isInTrialAt($snapshot, $now) ? 'individual' : 'free';
    }

    /** true se o snapshot cobre pelo menos $minPlan. Plano minimo desconhecido nunca e autorizado. */
    public function allows(?SubscriptionSnapshot $snapshot, string $minPlan): bool {
        return $this->allowsPlan($this->effectivePlan($snapshot), $minPlan);
    }

    /**
     * Mesma regra de allows(), mas a partir de um plano efetivo ja
     * calculado — usado pela fachada pra nao recalcular (nem reconsultar)
     * o plano duas vezes numa unica chamada (ex: require_plan()).
     */
    public function allowsPlan(string $currentPlan, string $minPlan): bool {
        $have = SUBSCRIPTION_PLAN_RANK[$currentPlan] ?? 0;
        $need = SUBSCRIPTION_PLAN_RANK[$minPlan] ?? PHP_INT_MAX;
        return $have >= $need;
    }

    /**
     * Shape exato do corpo de GET api/subscription.php: status e
     * current_period_end sempre refletem a row tal como veio (mesmo
     * quando o plano efetivo cai pra 'free' por status/expiracao), e so
     * caem pro fallback legado ('active' / null) quando NAO ha row.
     */
    public function describeForApi(?SubscriptionSnapshot $snapshot): array {
        $now = ($this->clock)();
        $inTrial = $snapshot !== null && !$this->hasPaidAccessAt($snapshot, $now) && $this->isInTrialAt($snapshot, $now);
        $plan = $this->effectivePlan($snapshot);
        return [
            'plan' => $plan,
            'status' => $snapshot->status ?? 'active',
            'current_period_end' => $snapshot->currentPeriodEnd ?? null,
            'in_trial' => $inTrial,
            'trial_ends_at' => $snapshot->trialEndsAt ?? null,
            'trial_days_left' => $inTrial && $snapshot?->trialEndsAtEpoch !== null
                ? (int)ceil(($snapshot->trialEndsAtEpoch - $now) / 86400)
                : 0,
            'access' => $plan !== 'free',
        ];
    }

    private function isInTrialAt(?SubscriptionSnapshot $snapshot, int $now): bool {
        return $snapshot !== null
            && !$snapshot->trialEndsAtInvalid
            && $snapshot->trialEndsAtEpoch !== null
            && $now < $snapshot->trialEndsAtEpoch;
    }

    private function hasPaidAccessAt(SubscriptionSnapshot $snapshot, int $now): bool {
        return $snapshot->status === 'active'
            && !$snapshot->currentPeriodEndInvalid
            && ($snapshot->currentPeriodEndEpoch === null || $snapshot->currentPeriodEndEpoch >= $now)
            && isset(SUBSCRIPTION_PLAN_RANK[$snapshot->plan])
            && $snapshot->plan !== 'free';
    }
}
