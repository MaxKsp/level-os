<?php
declare(strict_types=1);

const GOOGLE_OAUTH_FLOW_TTL_SECONDS = 600;
const GOOGLE_CALENDAR_START_GRANT_TTL_SECONDS = 120;

/** @return array<string,array<string,mixed>> */
function google_oauth_prune_flows(array $flows, int $now, int $ttl): array {
    return array_filter($flows, static function ($flow) use ($now, $ttl): bool {
        return is_array($flow)
            && isset($flow['issued_at'])
            && is_int($flow['issued_at'])
            && $flow['issued_at'] >= $now - $ttl
            && $flow['issued_at'] <= $now + 30;
    });
}

/** Cria state one-shot; múltiplas abas não sobrescrevem o fluxo anterior. */
function google_oauth_begin_flow(string $mode, ?int $userId, int $now = 0): string {
    if (!in_array($mode, ['login', 'calendar'], true)) throw new InvalidArgumentException('Invalid OAuth flow.');
    if ($mode === 'calendar' && ($userId === null || $userId < 1)) throw new InvalidArgumentException('Invalid OAuth user.');
    $now = $now > 0 ? $now : time();
    $state = bin2hex(random_bytes(32));
    $flows = google_oauth_prune_flows((array)($_SESSION['google_oauth_flows'] ?? []), $now, GOOGLE_OAUTH_FLOW_TTL_SECONDS);
    if (count($flows) >= 6) array_shift($flows);
    $flows[hash('sha256', $state)] = ['mode' => $mode, 'user_id' => $userId, 'issued_at' => $now];
    $_SESSION['google_oauth_flows'] = $flows;
    return $state;
}

/** @return array{mode:string,user_id:?int,issued_at:int}|null */
function google_oauth_consume_flow(string $state, int $now = 0): ?array {
    $now = $now > 0 ? $now : time();
    $flows = google_oauth_prune_flows((array)($_SESSION['google_oauth_flows'] ?? []), $now, GOOGLE_OAUTH_FLOW_TTL_SECONDS);
    $_SESSION['google_oauth_flows'] = $flows;
    if (preg_match('/\A[a-f0-9]{64}\z/D', $state) !== 1) return null;
    $key = hash('sha256', $state);
    $flow = $flows[$key] ?? null;
    unset($_SESSION['google_oauth_flows'][$key]);
    if (!is_array($flow) || !isset($flow['mode'], $flow['issued_at'])) return null;
    $mode = (string)$flow['mode'];
    $userId = isset($flow['user_id']) && is_int($flow['user_id']) ? $flow['user_id'] : null;
    if (!in_array($mode, ['login', 'calendar'], true) || ($mode === 'calendar' && ($userId === null || $userId < 1))) return null;
    return ['mode' => $mode, 'user_id' => $userId, 'issued_at' => (int)$flow['issued_at']];
}

function google_calendar_issue_start_grant(int $userId, int $now = 0): string {
    if ($userId < 1) throw new InvalidArgumentException('Invalid OAuth user.');
    $now = $now > 0 ? $now : time();
    $nonce = bin2hex(random_bytes(24));
    $grants = google_oauth_prune_flows((array)($_SESSION['google_calendar_start_grants'] ?? []), $now, GOOGLE_CALENDAR_START_GRANT_TTL_SECONDS);
    if (count($grants) >= 4) array_shift($grants);
    $grants[hash('sha256', $nonce)] = ['user_id' => $userId, 'issued_at' => $now];
    $_SESSION['google_calendar_start_grants'] = $grants;
    return $nonce;
}

function google_calendar_consume_start_grant(string $nonce, int $userId, int $now = 0): bool {
    $now = $now > 0 ? $now : time();
    $grants = google_oauth_prune_flows((array)($_SESSION['google_calendar_start_grants'] ?? []), $now, GOOGLE_CALENDAR_START_GRANT_TTL_SECONDS);
    $_SESSION['google_calendar_start_grants'] = $grants;
    if (preg_match('/\A[a-f0-9]{48}\z/D', $nonce) !== 1) return false;
    $key = hash('sha256', $nonce);
    $grant = $grants[$key] ?? null;
    unset($_SESSION['google_calendar_start_grants'][$key]);
    return is_array($grant) && isset($grant['user_id']) && (int)$grant['user_id'] === $userId;
}
