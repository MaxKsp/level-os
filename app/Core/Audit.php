<?php
declare(strict_types=1);

function audit_request_id(): string {
    try {
        return bin2hex(random_bytes(16));
    } catch (Throwable) {
        return substr(hash('sha256', uniqid('', true)), 0, 32);
    }
}

/**
 * Registra ação sensível na mesma transação do chamador. Metadados nunca
 * recebem payload bruto, secret, QR, token ou dados financeiros completos.
 */
function audit_record(PDO $db, ?int $userId, string $eventType, string $outcome, array $metadata = [], ?string $requestId = null): void {
    if (!preg_match('/\A[a-z0-9_.:-]{3,64}\z/D', $eventType)) throw new InvalidArgumentException('Invalid audit event.');
    if (!in_array($outcome, ['success', 'failure', 'denied'], true)) throw new InvalidArgumentException('Invalid audit outcome.');
    $requestId = $requestId !== null && preg_match('/\A[a-f0-9]{32}\z/D', $requestId) ? $requestId : audit_request_id();
    $ip = isset($_SERVER['REMOTE_ADDR']) && filter_var($_SERVER['REMOTE_ADDR'], FILTER_VALIDATE_IP) ? (string)$_SERVER['REMOTE_ADDR'] : null;
    $agent = isset($_SERVER['HTTP_USER_AGENT']) ? mb_substr((string)$_SERVER['HTTP_USER_AGENT'], 0, 255) : null;
    $encoded = $metadata === [] ? null : json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if ($encoded !== null && strlen($encoded) > 8192) throw new InvalidArgumentException('Audit metadata too large.');

    $stmt = $db->prepare('INSERT INTO audit_events (user_id, event_type, outcome, request_id, ip_address, user_agent, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$userId, $eventType, $outcome, $requestId, $ip, $agent, $encoded]);
}
