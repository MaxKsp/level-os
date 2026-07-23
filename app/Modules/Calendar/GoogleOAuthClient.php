<?php
declare(strict_types=1);

require_once __DIR__ . '/GoogleProviderException.php';
require_once __DIR__ . '/GoogleHttpTransport.php';

final class GoogleOAuthClient {
    private readonly GoogleHttpTransport $transport;

    public function __construct(
        private readonly string $clientId,
        private readonly string $clientSecret,
        ?GoogleHttpTransport $transport = null,
    ) {
        if ($clientId === '' || strlen($clientId) > 1024 || preg_match('/[\r\n]/', $clientId)) {
            throw new RuntimeException('Google OAuth is not configured.');
        }
        if ($clientSecret === '' || strlen($clientSecret) > 1024 || preg_match('/[\r\n]/', $clientSecret)) {
            throw new RuntimeException('Google OAuth is not configured.');
        }
        $this->transport = $transport ?? new GoogleHttpTransport();
    }

    /** @param list<string> $scopes */
    public function authorizationUrl(string $redirectUri, string $state, array $scopes, bool $offline = false, ?string $loginHint = null): string {
        if (!preg_match('#\Ahttps?://[^\s]+/auth-google-callback\.php\z#D', $redirectUri)) throw new InvalidArgumentException('Invalid redirect URI.');
        if (preg_match('/\A[a-f0-9]{64}\z/D', $state) !== 1 || $scopes === []) throw new InvalidArgumentException('Invalid OAuth request.');
        $params = [
            'client_id' => $this->clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', array_values(array_unique($scopes))),
            'state' => $state,
            'prompt' => $offline ? 'consent' : 'select_account',
        ];
        if ($offline) {
            $params['access_type'] = 'offline';
            $params['include_granted_scopes'] = 'true';
        }
        if ($loginHint !== null && filter_var($loginHint, FILTER_VALIDATE_EMAIL) !== false) $params['login_hint'] = $loginHint;
        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }

    /** @return array<string,mixed> */
    public function exchangeCode(string $code, string $redirectUri): array {
        if ($code === '' || strlen($code) > 8192 || preg_match('/[\r\n]/', $code)) throw new InvalidArgumentException('Invalid authorization code.');
        return $this->tokenRequest([
            'code' => $code,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ]);
    }

    /** @return array<string,mixed> */
    public function refreshAccessToken(string $refreshToken): array {
        if ($refreshToken === '' || strlen($refreshToken) > 16384 || preg_match('/[\r\n]/', $refreshToken)) throw new InvalidArgumentException('Invalid refresh token.');
        return $this->tokenRequest([
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token',
        ]);
    }

    /** @return array<string,mixed> */
    public function userInfo(string $accessToken): array {
        $token = $this->validatedToken($accessToken);
        $response = $this->transport->request('GET', 'https://www.googleapis.com/oauth2/v3/userinfo', [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
        ], null, 262144);
        return $this->decodeJsonResponse($response, 'Google user information unavailable.');
    }

    public function revoke(string $token): bool {
        $token = $this->validatedToken($token);
        $response = $this->transport->request('POST', 'https://oauth2.googleapis.com/revoke', [
            'Accept: application/json',
            'Content-Type: application/x-www-form-urlencoded',
        ], http_build_query(['token' => $token], '', '&', PHP_QUERY_RFC3986), 65536);
        return $response['status'] >= 200 && $response['status'] < 300;
    }

    /** @param array<string,string> $fields @return array<string,mixed> */
    private function tokenRequest(array $fields): array {
        $response = $this->transport->request('POST', 'https://oauth2.googleapis.com/token', [
            'Accept: application/json',
            'Content-Type: application/x-www-form-urlencoded',
        ], http_build_query($fields, '', '&', PHP_QUERY_RFC3986), 262144);
        return $this->decodeJsonResponse($response, 'Google token exchange failed.');
    }

    private function validatedToken(string $token): string {
        if ($token === '' || strlen($token) > 16384 || preg_match('/[\r\n]/', $token)) throw new InvalidArgumentException('Invalid Google token.');
        return $token;
    }

    /** @param array{status:int,body:string} $response @return array<string,mixed> */
    private function decodeJsonResponse(array $response, string $fallback): array {
        try {
            $body = json_decode($response['body'], true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new GoogleProviderException($fallback, $response['status']);
        }
        if (!is_array($body)) throw new GoogleProviderException($fallback, $response['status']);
        if ($response['status'] < 200 || $response['status'] >= 300) {
            $code = isset($body['error']) && is_string($body['error']) ? mb_substr($body['error'], 0, 64) : null;
            throw new GoogleProviderException($fallback, $response['status'], $code);
        }
        return $body;
    }
}
