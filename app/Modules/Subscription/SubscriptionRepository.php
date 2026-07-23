<?php
declare(strict_types=1);

/**
 * Fase 5A - Acesso a tabela subscriptions, extraido de plan.php.
 * So leitura, exclusivamente por user_id, prepared statement sempre.
 * Nunca decide autorizacao (isso e SubscriptionPolicy) e nunca chama
 * get_db() internamente — recebe o PDO ja aberto, pra ficar testavel
 * com qualquer driver (SQLite nos testes, MySQL em producao).
 */

/** Snapshot normalizado de uma linha de subscriptions — nunca decide autorizacao. */
final class SubscriptionSnapshot {
    public function __construct(
        public readonly string $plan,
        public readonly string $status,
        public readonly ?string $currentPeriodEnd,
        public readonly ?int $currentPeriodEndEpoch,
        public readonly bool $currentPeriodEndInvalid,
        public readonly ?string $trialEndsAt,
        public readonly ?int $trialEndsAtEpoch,
        public readonly bool $trialEndsAtInvalid,
    ) {
    }
}

final class SubscriptionRepository {
    public function __construct(private readonly PDO $db) {
    }

    /** Le a assinatura do usuario, exclusivamente por user_id. Null se nao houver linha. */
    public function findByUserId(int $userId): ?SubscriptionSnapshot {
        $stmt = $this->db->prepare('SELECT plan, status, current_period_end, trial_ends_at FROM subscriptions WHERE user_id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return self::buildSnapshot(
            (string)$row['plan'],
            (string)$row['status'],
            $row['current_period_end'] !== null ? (string)$row['current_period_end'] : null,
            $row['trial_ends_at'] !== null ? (string)$row['trial_ends_at'] : null
        );
    }

    /**
     * Normaliza os campos brutos da linha num snapshot, resolvendo a data
     * de expiracao pra um epoch comparavel (ou marcando como invalida) —
     * a UNICA conversao de string de data que existe neste modulo. Decidir
     * se isso expira o plano ou nao e responsabilidade exclusiva do
     * SubscriptionPolicy, que recebe o epoch ja pronto e nunca chama
     * strtotime() por conta propria.
     */
    public static function buildSnapshot(string $plan, string $status, ?string $currentPeriodEnd, ?string $trialEndsAt = null): SubscriptionSnapshot {
        [$periodEpoch, $periodInvalid] = self::parseDate($currentPeriodEnd);
        [$trialEpoch, $trialInvalid] = self::parseDate($trialEndsAt);
        return new SubscriptionSnapshot($plan, $status, $currentPeriodEnd, $periodEpoch, $periodInvalid, $trialEndsAt, $trialEpoch, $trialInvalid);
    }

    /** @return array{0:?int,1:bool} */
    private static function parseDate(?string $value): array {
        if ($value === null) return [null, false];
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $value, new DateTimeZone('UTC'));
        $errors = DateTimeImmutable::getLastErrors();
        $invalid = $parsed === false || (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0));
        return $invalid ? [null, true] : [$parsed->getTimestamp(), false];
    }
}
