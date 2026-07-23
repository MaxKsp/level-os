<?php
declare(strict_types=1);

final class SupabaseAuthException extends RuntimeException {}

final class SupabaseIdentity {
    /** @param array<string,mixed> $metadata */
    public function __construct(
        public readonly string $subject,
        public readonly string $email,
        public readonly bool $emailVerified,
        public readonly int $expiresAt,
        public readonly string $assuranceLevel,
        public readonly array $metadata,
        public readonly bool $hasVerifiedTotp = false,
    ) {}
}

/** Valida access tokens consultando o registro canonico no Supabase Auth. */
final class SupabaseAuthClient {
    private const MAX_RESPONSE_BYTES = 1048576;

    /** @var Closure(string,array<int,string>):array{status:int,body:string}|null */
    private readonly ?Closure $transport;

    public function __construct(
        private readonly string $projectUrl,
        private readonly string $publishableKey,
        ?callable $transport = null,
    ) {
        if (!self::validProjectUrl($projectUrl) || !$this->validKey($publishableKey)) {
            throw new SupabaseAuthException('Supabase Auth is not configured.');
        }
        $this->transport = $transport === null ? null : Closure::fromCallable($transport);
    }

    public function verifyAccessToken(string $accessToken): SupabaseIdentity {
        if (strlen($accessToken) < 20 || strlen($accessToken) > 8192 || preg_match('/[\r\n]/', $accessToken)) {
            throw new SupabaseAuthException('Invalid authentication token.');
        }
        $headers = [
            'Accept: application/json',
            'apikey: ' . $this->publishableKey,
            'Authorization: Bearer ' . $accessToken,
        ];
        $url = rtrim($this->projectUrl, '/') . '/auth/v1/user';
        $response = $this->transport !== null
            ? ($this->transport)($url, $headers)
            : $this->request($url, $headers);
        $status = (int)($response['status'] ?? 0);
        $raw = $response['body'] ?? '';
        if ($status !== 200 || !is_string($raw)) {
            throw new SupabaseAuthException('Authentication token was rejected.');
        }
        try {
            $user = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new SupabaseAuthException('Invalid authentication response.');
        }
        if (!is_array($user)) {
            throw new SupabaseAuthException('Invalid authentication response.');
        }

        $subject = isset($user['id']) ? (string)$user['id'] : '';
        $email = strtolower(trim((string)($user['email'] ?? '')));
        if (!preg_match('/\A[a-zA-Z0-9-]{16,128}\z/D', $subject)
            || filter_var($email, FILTER_VALIDATE_EMAIL) === false || strlen($email) > 255) {
            throw new SupabaseAuthException('Invalid authentication identity.');
        }
        $claims = $this->validatedClaims($accessToken, $subject);
        $verified = !empty($user['email_confirmed_at']) || !empty($user['confirmed_at']);
        $metadata = is_array($user['user_metadata'] ?? null) ? $user['user_metadata'] : [];
        $factors = is_array($user['factors'] ?? null) ? $user['factors'] : [];
        $hasVerifiedTotp = false;
        foreach ($factors as $factor) {
            if (!is_array($factor)) continue;
            $type = $factor['factor_type'] ?? $factor['factorType'] ?? null;
            if ($type === 'totp' && ($factor['status'] ?? null) === 'verified') {
                $hasVerifiedTotp = true;
                break;
            }
        }
        return new SupabaseIdentity(
            $subject,
            $email,
            $verified,
            (int)$claims['exp'],
            is_string($claims['aal'] ?? null) ? (string)$claims['aal'] : 'aal1',
            $metadata,
            $hasVerifiedTotp,
        );
    }

    /** @return array<string,mixed> */
    private function validatedClaims(string $token, string $expectedSubject): array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) throw new SupabaseAuthException('Invalid authentication token.');
        $encoded = strtr($parts[1], '-_', '+/');
        $padding = strlen($encoded) % 4;
        if ($padding !== 0) $encoded .= str_repeat('=', 4 - $padding);
        $json = base64_decode($encoded, true);
        if (!is_string($json)) throw new SupabaseAuthException('Invalid authentication token.');
        try {
            $claims = json_decode($json, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new SupabaseAuthException('Invalid authentication token.');
        }
        if (!is_array($claims)) throw new SupabaseAuthException('Invalid authentication token.');
        $audience = $claims['aud'] ?? null;
        $validAudience = $audience === 'authenticated'
            || (is_array($audience) && in_array('authenticated', $audience, true));
        $issuer = rtrim($this->projectUrl, '/') . '/auth/v1';
        if (($claims['sub'] ?? null) !== $expectedSubject
            || ($claims['iss'] ?? null) !== $issuer
            || !$validAudience
            || !is_int($claims['exp'] ?? null)
            || (int)$claims['exp'] <= time()) {
            throw new SupabaseAuthException('Invalid authentication token claims.');
        }
        return $claims;
    }

    /** @param array<int,string> $headers @return array{status:int,body:string} */
    private function request(string $url, array $headers): array {
        if (!function_exists('curl_init')) throw new SupabaseAuthException('Authentication transport unavailable.');
        $curl = curl_init($url);
        if ($curl === false) throw new SupabaseAuthException('Authentication transport unavailable.');
        $buffer = '';
        $tooLarge = false;
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_HTTPGET => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$buffer, &$tooLarge): int {
                if (strlen($buffer) + strlen($chunk) > self::MAX_RESPONSE_BYTES) {
                    $tooLarge = true;
                    return 0;
                }
                $buffer .= $chunk;
                return strlen($chunk);
            },
        ]);
        $ok = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if ($tooLarge || $ok === false || $error !== '') {
            throw new SupabaseAuthException('Authentication transport unavailable.');
        }
        return ['status' => $status, 'body' => $buffer];
    }

    public static function validProjectUrl(string $url): bool {
        $parts = parse_url(trim($url));
        $host = is_array($parts) ? strtolower((string)($parts['host'] ?? '')) : '';
        return is_array($parts)
            && strtolower((string)($parts['scheme'] ?? '')) === 'https'
            && preg_match('/\A[a-z0-9-]+\.supabase\.co\z/D', $host) === 1
            && in_array((string)($parts['path'] ?? ''), ['', '/'], true)
            && !isset($parts['port'])
            && !isset($parts['user'], $parts['pass'], $parts['query'], $parts['fragment']);
    }

    private function validKey(string $key): bool {
        return strlen($key) >= 20 && strlen($key) <= 2048 && preg_match('/[\r\n]/', $key) !== 1;
    }
}
