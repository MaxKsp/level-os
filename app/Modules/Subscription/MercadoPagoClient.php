<?php
declare(strict_types=1);

/**
 * Cliente HTTP mínimo para a API do Mercado Pago.
 *
 * O checkout é sempre hospedado pelo provedor. Este cliente nunca recebe nem
 * armazena número de cartão, CVV ou token de cartão no Level OS.
 */
final class MercadoPagoApiException extends RuntimeException {
    public function __construct(
        public readonly int $httpStatus,
        public readonly string $providerCode = ''
    ) {
        parent::__construct('Mercado Pago API request failed.');
    }
}

final class MercadoPagoClient {
    private const BASE_URL = 'https://api.mercadopago.com';

    public function __construct(private readonly string $accessToken) {
        $tokenLength = strlen($accessToken);
        if ($tokenLength < 20 || $tokenLength > 512 || preg_match('/[\r\n]/', $accessToken)) {
            throw new RuntimeException('Mercado Pago is not configured.');
        }
    }

    /** @return array<string,mixed> */
    public function createSubscription(
        int $amountCents,
        string $externalReference,
        string $payerEmail,
        string $backUrl,
        string $idempotencyKey
    ): array {
        if ($amountCents < 100 || $amountCents > 100000000) {
            throw new InvalidArgumentException('Invalid amount.');
        }
        if (!preg_match('/\A[a-zA-Z0-9_-]{8,96}\z/D', $externalReference)) {
            throw new InvalidArgumentException('Invalid external reference.');
        }
        if (filter_var($payerEmail, FILTER_VALIDATE_EMAIL) === false || strlen($payerEmail) > 255) {
            throw new InvalidArgumentException('Invalid payer email.');
        }
        if (!$this->isHttpsUrl($backUrl) || strlen($backUrl) > 2048) {
            throw new InvalidArgumentException('Invalid back URL.');
        }

        return $this->request('POST', '/preapproval', [
            // O Mercado Pago apresenta os meios disponíveis no checkout hospedado.
            'reason' => 'Level OS Individual',
            'external_reference' => $externalReference,
            'payer_email' => $payerEmail,
            'auto_recurring' => [
                'frequency' => 1,
                'frequency_type' => 'months',
                'transaction_amount' => $amountCents / 100,
                'currency_id' => 'BRL',
            ],
            'back_url' => $backUrl,
            'status' => 'pending',
        ], $idempotencyKey);
    }

    /** @return array<string,mixed> */
    public function createPixPayment(
        int $amountCents,
        string $externalReference,
        string $payerEmail,
        string $notificationUrl,
        string $idempotencyKey
    ): array {
        if ($amountCents < 100 || $amountCents > 100000000) {
            throw new InvalidArgumentException('Invalid amount.');
        }
        if (!preg_match('/\A[a-zA-Z0-9_-]{8,96}\z/D', $externalReference)) {
            throw new InvalidArgumentException('Invalid external reference.');
        }
        if (filter_var($payerEmail, FILTER_VALIDATE_EMAIL) === false || strlen($payerEmail) > 255) {
            throw new InvalidArgumentException('Invalid payer email.');
        }
        if (!$this->isHttpsUrl($notificationUrl) || strlen($notificationUrl) > 2048) {
            throw new InvalidArgumentException('Invalid notification URL.');
        }

        return $this->request('POST', '/v1/payments', [
            'transaction_amount' => $amountCents / 100,
            'description' => 'Level OS Individual - 1 mes',
            'payment_method_id' => 'pix',
            'external_reference' => $externalReference,
            'notification_url' => $notificationUrl,
            'payer' => ['email' => $payerEmail],
        ], $idempotencyKey);
    }

    /** @return array<string,mixed> */
    public function getPreapproval(string $id): array {
        return $this->request('GET', '/preapproval/' . rawurlencode($this->providerId($id)));
    }

    /** @return array<string,mixed> */
    public function getAuthorizedPayment(string $id): array {
        return $this->request('GET', '/authorized_payments/' . rawurlencode($this->providerId($id)));
    }

    /** @return array<string,mixed> */
    public function getPayment(string $id): array {
        return $this->request('GET', '/v1/payments/' . rawurlencode($this->providerId($id)));
    }

    private function providerId(string $id): string {
        if (!preg_match('/\A[a-zA-Z0-9._:-]{1,128}\z/D', $id)) {
            throw new InvalidArgumentException('Invalid provider resource id.');
        }
        return $id;
    }

    private function isHttpsUrl(string $value): bool {
        $parts = parse_url($value);
        return is_array($parts)
            && strtolower((string)($parts['scheme'] ?? '')) === 'https'
            && isset($parts['host'])
            && filter_var((string)$parts['host'], FILTER_VALIDATE_IP) === false;
    }

    /**
     * @param array<string,mixed>|null $payload
     * @return array<string,mixed>
     */
    private function request(string $method, string $path, ?array $payload = null, ?string $idempotencyKey = null): array {
        if (!function_exists('curl_init')) {
            throw new RuntimeException('Payment transport unavailable.');
        }
        if ($idempotencyKey !== null && !preg_match('/\A[a-zA-Z0-9._:-]{8,96}\z/D', $idempotencyKey)) {
            throw new InvalidArgumentException('Invalid idempotency key.');
        }

        $curl = curl_init(self::BASE_URL . $path);
        if ($curl === false) {
            throw new RuntimeException('Payment transport unavailable.');
        }
        $headers = [
            'Authorization: Bearer ' . $this->accessToken,
            'Accept: application/json',
            'Content-Type: application/json',
        ];
        if ($idempotencyKey !== null) {
            $headers[] = 'X-Idempotency-Key: ' . $idempotencyKey;
        }
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ];
        if ($payload !== null) {
            $options[CURLOPT_POSTFIELDS] = json_encode(
                $payload,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            );
        }
        curl_setopt_array($curl, $options);

        $raw = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);
        if (!is_string($raw) || $curlError !== '') {
            error_log('Mercado Pago transport failed with HTTP ' . $status);
            throw new RuntimeException('Payment provider unavailable.');
        }
        if ($status < 200 || $status >= 300) {
            $providerCode = '';
            $providerMessage = '';
            try {
                $failure = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
                if (is_array($failure)) {
                    $providerCode = mb_substr((string)($failure['code'] ?? $failure['error'] ?? ''), 0, 80);
                    $providerMessage = mb_substr((string)($failure['message'] ?? ''), 0, 240);
                }
            } catch (JsonException) {
                // Provider outages may return a non-JSON error document.
            }
            error_log(sprintf(
                'Mercado Pago API failed: HTTP %d code=%s message=%s',
                $status,
                $providerCode !== '' ? $providerCode : 'unknown',
                $providerMessage !== '' ? $providerMessage : 'unavailable'
            ));
            throw new MercadoPagoApiException($status, $providerCode);
        }

        try {
            $body = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new RuntimeException('Invalid payment provider response.');
        }
        if (!is_array($body)) {
            throw new RuntimeException('Invalid payment provider response.');
        }
        return $body;
    }
}
