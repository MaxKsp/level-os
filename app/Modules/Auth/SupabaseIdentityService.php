<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/Audit.php';
require_once __DIR__ . '/SupabaseAuthClient.php';

final class SupabaseAccountLinkRequiredException extends RuntimeException {}
final class SupabaseAccountConflictException extends RuntimeException {}

final class SupabaseIdentityService {
    public function __construct(private readonly PDO $db) {}

    /** @return array{user_id:int,session_version:int,totp_enabled:bool,created:bool} */
    public function resolve(SupabaseIdentity $identity): array {
        if (!$identity->emailVerified) {
            throw new SupabaseAuthException('A verified e-mail is required.');
        }
        $this->db->beginTransaction();
        try {
            $linked = $this->findBySubject($identity->subject);
            if ($linked !== null) {
                $this->syncProfile($linked, $identity);
                $this->db->commit();
                return $this->result($linked, false);
            }

            $byEmail = $this->findByEmail($identity->email);
            if ($byEmail !== null) {
                $this->db->rollBack();
                throw new SupabaseAccountLinkRequiredException('Existing account confirmation is required.');
            }

            $username = $this->availableUsername($identity);
            $avatar = $this->safeAvatar($identity->metadata['avatar_url'] ?? $identity->metadata['picture'] ?? null);
            $insert = $this->db->prepare("INSERT INTO users
                (username, password_hash, email, email_verified_at, auth_provider, auth_subject, auth_linked_at, avatar)
                VALUES (?, NULL, ?, CURRENT_TIMESTAMP, 'supabase', ?, CURRENT_TIMESTAMP, ?)");
            $insert->execute([$username, $identity->email, $identity->subject, $avatar]);
            $userId = (int)$this->db->lastInsertId();
            $subscription = $this->db->prepare("INSERT INTO subscriptions
                (user_id, plan, status, current_period_end, trial_ends_at)
                VALUES (?, 'free', 'active', NULL, ?)");
            $subscription->execute([$userId, gmdate('Y-m-d H:i:s', time() + 30 * 86400)]);
            audit_record($this->db, $userId, 'auth.account_created', 'success', ['provider' => 'supabase']);
            $this->db->commit();
            return ['user_id' => $userId, 'session_version' => 1, 'totp_enabled' => false, 'created' => true];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function linkExisting(int $userId, SupabaseIdentity $identity): void {
        if ($userId < 1 || !$identity->emailVerified) throw new SupabaseAccountConflictException('Identity cannot be linked.');
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT id, email, auth_provider, auth_subject FROM users WHERE id = ?' . $this->forUpdate());
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            if (!$user || strtolower((string)$user['email']) !== $identity->email) {
                throw new SupabaseAccountConflictException('Identity does not match the local account.');
            }
            $subjectOwner = $this->findBySubject($identity->subject);
            if ($subjectOwner !== null && (int)$subjectOwner['id'] !== $userId) {
                throw new SupabaseAccountConflictException('Identity is already linked.');
            }
            if (!empty($user['auth_subject']) && (string)$user['auth_subject'] !== $identity->subject) {
                throw new SupabaseAccountConflictException('Local account already has another identity.');
            }
            $update = $this->db->prepare("UPDATE users SET auth_provider = 'supabase', auth_subject = ?,
                auth_linked_at = CURRENT_TIMESTAMP, email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
                WHERE id = ?");
            $update->execute([$identity->subject, $userId]);
            audit_record($this->db, $userId, 'auth.identity_linked', 'success', ['provider' => 'supabase']);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    /** Substitui o fator local somente depois de o Supabase confirmar AAL2. */
    public function retireLegacyTotp(int $userId): void {
        if ($userId < 1) throw new InvalidArgumentException('Invalid user.');
        $this->db->beginTransaction();
        try {
            $update = $this->db->prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ? AND totp_enabled = 1');
            $update->execute([$userId]);
            if ($update->rowCount() > 0) {
                $delete = $this->db->prepare('DELETE FROM totp_backup_codes WHERE user_id = ?');
                $delete->execute([$userId]);
                audit_record($this->db, $userId, 'auth.legacy_totp_retired', 'success', ['replacement' => 'supabase_totp']);
            }
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    /** @return array<string,mixed>|null */
    private function findBySubject(string $subject): ?array {
        $stmt = $this->db->prepare("SELECT id, username, email, avatar, session_version, totp_enabled
            FROM users WHERE auth_provider = 'supabase' AND auth_subject = ? LIMIT 1" . $this->forUpdate());
        $stmt->execute([$subject]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    /** @return array<string,mixed>|null */
    private function findByEmail(string $email): ?array {
        $stmt = $this->db->prepare('SELECT id, username, email, avatar, session_version, totp_enabled
            FROM users WHERE email = ? LIMIT 1' . $this->forUpdate());
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    /** @param array<string,mixed> $row @return array{user_id:int,session_version:int,totp_enabled:bool,created:bool} */
    private function result(array $row, bool $created): array {
        return [
            'user_id' => (int)$row['id'],
            'session_version' => max(1, (int)$row['session_version']),
            'totp_enabled' => (int)$row['totp_enabled'] === 1,
            'created' => $created,
        ];
    }

    /** @param array<string,mixed> $row */
    private function syncProfile(array $row, SupabaseIdentity $identity): void {
        $avatar = $this->safeAvatar($identity->metadata['avatar_url'] ?? $identity->metadata['picture'] ?? null);
        if ($avatar !== null && empty($row['avatar'])) {
            $stmt = $this->db->prepare('UPDATE users SET avatar = ? WHERE id = ? AND avatar IS NULL');
            $stmt->execute([$avatar, (int)$row['id']]);
        }
    }

    private function availableUsername(SupabaseIdentity $identity): string {
        $rawCandidate = $identity->metadata['username'] ?? $identity->metadata['user_name'] ?? '';
        $candidate = is_string($rawCandidate) ? $rawCandidate : '';
        $candidate = strtolower((string)preg_replace('/[^a-z0-9._-]/', '', $candidate));
        if (strlen($candidate) < 3) {
            $candidate = strtolower((string)preg_replace('/[^a-z0-9._-]/', '', explode('@', $identity->email)[0]));
        }
        if (strlen($candidate) < 3) $candidate = 'usuario';
        $base = mb_substr($candidate, 0, 54);
        $username = $base;
        $check = $this->db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        for ($suffix = 0; $suffix < 10000; $suffix++) {
            $check->execute([$username]);
            if (!$check->fetch()) return $username;
            $tail = (string)($suffix + 1);
            $username = mb_substr($base, 0, max(3, 64 - strlen($tail))) . $tail;
        }
        throw new RuntimeException('Unable to allocate a username.');
    }

    private function safeAvatar(mixed $value): ?string {
        if (!is_string($value) || strlen($value) > 2048) return null;
        if (preg_match('#\Ahttps://lh3\.googleusercontent\.com/#D', $value) === 1) return $value;
        if (preg_match('#\Ahttps://avatars\.githubusercontent\.com/#D', $value) === 1) return $value;
        return null;
    }

    private function forUpdate(): string {
        return $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
    }
}
