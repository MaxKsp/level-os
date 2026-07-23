<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Clock.php';
require_once dirname(__DIR__, 2) . '/Core/Audit.php';

function subscription_add_calendar_month_clamped(int $epoch): string {
    $base = level_clock_now($epoch)->setTimezone(level_clock_utc_timezone());
    $year = (int)$base->format('Y');
    $month = (int)$base->format('n') + 1;
    if ($month === 13) {
        $month = 1;
        $year++;
    }
    $firstOfMonth = new DateTimeImmutable(sprintf('%04d-%02d-01 00:00:00', $year, $month), level_clock_utc_timezone());
    $day = min((int)$base->format('j'), (int)$firstOfMonth->format('t'));
    return $firstOfMonth
        ->setDate($year, $month, $day)
        ->setTime((int)$base->format('H'), (int)$base->format('i'), (int)$base->format('s'))
        ->format('Y-m-d H:i:s');
}

function subscription_parse_utc_period(?string $value): ?int {
    if ($value === null || !preg_match('/\A\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\z/D', $value)) return null;
    $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $value, level_clock_utc_timezone());
    return $date === false ? null : $date->getTimestamp();
}

/**
 * Aplica um pagamento aprovado após a consulta autoritativa ao Mercado Pago.
 * Plano, usuário e valor vêm exclusivamente do mapeamento criado pelo servidor.
 *
 * A chave canônica deve ser `mp:payment:{paymentId}:approved`; assim uma mesma
 * cobrança notificada pelos tópicos payment e authorized_payment renova só uma vez.
 *
 * @return array{status:string,user_id?:int,plan?:string,current_period_end?:string}
 */
function subscription_apply_paid_event(
    PDO $db,
    string $eventId,
    string $providerPaymentId,
    ?string $externalId,
    ?string $externalReference,
    int $amountCents,
    string $method,
    ?int $now = null,
    ?string $providerPeriodEnd = null,
    ?int $approvedAt = null
): array {
    if (!preg_match('/\A[a-zA-Z0-9._:-]{3,96}\z/D', $eventId)) return ['status' => 'invalid'];
    if (!preg_match('/\A[a-zA-Z0-9._:-]{1,96}\z/D', $providerPaymentId)) return ['status' => 'invalid'];
    if ($externalId !== null && !preg_match('/\A[a-zA-Z0-9._:-]{1,128}\z/D', $externalId)) return ['status' => 'invalid'];
    if ($externalReference !== null && !preg_match('/\A[a-zA-Z0-9_-]{8,96}\z/D', $externalReference)) return ['status' => 'invalid'];
    if ($externalId === null && $externalReference === null) return ['status' => 'invalid'];
    if ($amountCents < 1 || !in_array($method, ['pix', 'card'], true)) return ['status' => 'invalid'];

    $timestamp = $now ?? level_clock_epoch();
    $ownTransaction = !$db->inTransaction();
    if ($ownTransaction) $db->beginTransaction();

    try {
        $suffix = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        if ($externalId !== null) {
            $paymentStmt = $db->prepare(
                "SELECT id, user_id, plan, amount_cents, external_id, external_reference, status
                 FROM subscription_payments
                 WHERE provider = 'mercadopago' AND external_id = ?
                 LIMIT 1" . $suffix
            );
            $paymentStmt->execute([$externalId]);
        } else {
            $paymentStmt = $db->prepare(
                "SELECT id, user_id, plan, amount_cents, external_id, external_reference, status
                 FROM subscription_payments
                 WHERE provider = 'mercadopago' AND external_reference = ?
                 LIMIT 1" . $suffix
            );
            $paymentStmt->execute([$externalReference]);
        }
        $payment = $paymentStmt->fetch(PDO::FETCH_ASSOC);
        if ($payment === false) {
            if ($ownTransaction) $db->commit();
            return ['status' => 'not_found'];
        }
        if ($externalId !== null && !hash_equals((string)$payment['external_id'], $externalId)) {
            if ($ownTransaction) $db->commit();
            return ['status' => 'not_found'];
        }
        if ($externalReference !== null && !hash_equals((string)$payment['external_reference'], $externalReference)) {
            if ($ownTransaction) $db->commit();
            return ['status' => 'not_found'];
        }
        if ((int)$payment['amount_cents'] !== $amountCents || (string)$payment['plan'] !== 'individual') {
            if ($ownTransaction) $db->commit();
            return ['status' => 'mismatch'];
        }

        $seen = $db->prepare('SELECT id FROM subscription_events WHERE provider_event_id = ? OR provider_payment_id = ? LIMIT 1');
        $seen->execute([$eventId, $providerPaymentId]);
        if ($seen->fetchColumn() !== false) {
            if ($ownTransaction) $db->commit();
            return ['status' => 'duplicate'];
        }

        $userId = (int)$payment['user_id'];
        $periodStmt = $db->prepare('SELECT current_period_end FROM subscriptions WHERE user_id = ? LIMIT 1' . $suffix);
        $periodStmt->execute([$userId]);
        $currentPeriod = $periodStmt->fetchColumn();
        $subscriptionRowExists = $currentPeriod !== false;
        $currentEpoch = is_string($currentPeriod) ? subscription_parse_utc_period($currentPeriod) : null;
        $approvedEpoch = $approvedAt !== null
            && $approvedAt <= $timestamp + 300
            && $approvedAt >= $timestamp - (86400 * 366 * 5)
                ? $approvedAt
                : $timestamp;
        $baseEpoch = $currentEpoch !== null && $currentEpoch > $approvedEpoch ? $currentEpoch : $approvedEpoch;
        $providerEpoch = subscription_parse_utc_period($providerPeriodEnd);
        $periodEnd = $providerEpoch !== null
            && $providerEpoch > $baseEpoch
            && $providerEpoch <= $baseEpoch + (86400 * 62)
                ? level_clock_utc_sql($providerEpoch)
                : subscription_add_calendar_month_clamped($baseEpoch);

        $event = $db->prepare(
            'INSERT INTO subscription_events (user_id, provider_event_id, provider_payment_id, event, detail)
             VALUES (?, ?, ?, ?, ?)'
        );
        $event->execute([$userId, $eventId, $providerPaymentId, 'payment_confirmed', 'Mercado Pago payment approved']);
        $db->prepare(
            "UPDATE subscription_payments
             SET method = ?, provider_status = 'approved', status = 'paid', paid_at = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?"
        )->execute([$method, level_clock_utc_sql($timestamp), (int)$payment['id']]);

        $updated = $db->prepare(
            "UPDATE subscriptions
             SET plan = 'individual', status = 'active', current_period_end = ?
             WHERE user_id = ?"
        );
        $updated->execute([$periodEnd, $userId]);
        if ($updated->rowCount() === 0 && !$subscriptionRowExists) {
            $insert = $db->prepare(
                "INSERT INTO subscriptions (user_id, plan, status, current_period_end, trial_ends_at)
                 VALUES (?, 'individual', 'active', ?, NULL)"
            );
            $insert->execute([$userId, $periodEnd]);
        }

        audit_record($db, $userId, 'subscription.plan_changed', 'success', [
            'provider' => 'mercadopago',
            'provider_event_id' => $eventId,
            'provider_payment_id' => $providerPaymentId,
            'plan' => 'individual',
            'current_period_end' => $periodEnd,
        ]);
        if ($ownTransaction) $db->commit();
        return [
            'status' => 'processed',
            'user_id' => $userId,
            'plan' => 'individual',
            'current_period_end' => $periodEnd,
        ];
    } catch (PDOException $e) {
        if ($ownTransaction && $db->inTransaction()) $db->rollBack();
        if (in_array((string)$e->getCode(), ['23000', '19'], true)) return ['status' => 'duplicate'];
        throw $e;
    } catch (Throwable $e) {
        if ($ownTransaction && $db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/** Registra mudanças de estado do mandato sem promover plano. */
function subscription_record_provider_status(PDO $db, string $externalId, string $providerStatus): bool {
    if (!preg_match('/\A[a-zA-Z0-9._:-]{1,128}\z/D', $externalId)) return false;
    if (!preg_match('/\A[a-zA-Z0-9._ -]{1,32}\z/D', $providerStatus)) return false;
    $terminal = in_array(strtolower($providerStatus), ['cancelled', 'canceled'], true);
    $stmt = $terminal
        ? $db->prepare(
            "UPDATE subscription_payments
             SET provider_status = ?,
                 status = CASE WHEN status = 'pending' THEN 'cancelled' ELSE status END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE provider = 'mercadopago' AND external_id = ?"
        )
        : $db->prepare(
            "UPDATE subscription_payments
             SET provider_status = ?, updated_at = CURRENT_TIMESTAMP
             WHERE provider = 'mercadopago' AND external_id = ?"
        );
    $stmt->execute([$providerStatus, $externalId]);
    return $stmt->rowCount() > 0;
}
