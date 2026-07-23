<?php
declare(strict_types=1);

final class EmailDeliveryException extends RuntimeException {}

/** Cliente HTTPS pequeno para e-mails transacionais via Resend. */
final class ResendMailer {
    private const ENDPOINT = 'https://api.resend.com/emails';
    private const MAX_RESPONSE_BYTES = 1048576;

    /** @var Closure(string,array<int,string>,string):array{status:int,body:string}|null */
    private readonly ?Closure $transport;

    public function __construct(
        private readonly string $apiKey,
        private readonly string $fromEmail,
        private readonly string $fromName = 'Level OS',
        private readonly string $replyTo = '',
        ?callable $transport = null,
    ) {
        if (!$this->validSecret($apiKey)) {
            throw new EmailDeliveryException('E-mail provider is not configured.');
        }
        if (!$this->validEmail($fromEmail)) {
            throw new EmailDeliveryException('E-mail sender is not configured.');
        }
        if ($fromName === '' || strlen($fromName) > 80 || preg_match('/[\r\n<>]/', $fromName)) {
            throw new EmailDeliveryException('E-mail sender is not configured.');
        }
        if ($replyTo !== '' && !$this->validEmail($replyTo)) {
            throw new EmailDeliveryException('E-mail reply address is not configured.');
        }
        $this->transport = $transport === null ? null : Closure::fromCallable($transport);
    }

    /**
     * @param array<int,array{filename:string,content:string}> $attachments content em base64
     * @return string ID opaco devolvido pelo provedor
     */
    public function send(
        string $to,
        string $subject,
        string $text,
        string $html,
        string $idempotencyKey,
        array $attachments = [],
    ): string {
        if (!$this->validEmail($to)) {
            throw new InvalidArgumentException('Invalid recipient address.');
        }
        if ($subject === '' || strlen($subject) > 200 || preg_match('/[\r\n]/', $subject)) {
            throw new InvalidArgumentException('Invalid e-mail subject.');
        }
        if ($text === '' || $html === '' || strlen($text) > 262144 || strlen($html) > 524288) {
            throw new InvalidArgumentException('Invalid e-mail content.');
        }
        if (preg_match('/\A[a-zA-Z0-9._:-]{8,256}\z/D', $idempotencyKey) !== 1) {
            throw new InvalidArgumentException('Invalid e-mail idempotency key.');
        }
        $attachmentBytes = 0;
        foreach ($attachments as $attachment) {
            $filename = (string)($attachment['filename'] ?? '');
            $content = (string)($attachment['content'] ?? '');
            if (preg_match('/\A[a-zA-Z0-9._-]{1,120}\z/D', $filename) !== 1) {
                throw new InvalidArgumentException('Invalid e-mail attachment filename.');
            }
            if ($content === '' || base64_decode($content, true) === false) {
                throw new InvalidArgumentException('Invalid e-mail attachment content.');
            }
            $attachmentBytes += strlen($content);
        }
        if ($attachmentBytes > 20 * 1024 * 1024) {
            throw new InvalidArgumentException('E-mail attachments exceed the size limit.');
        }

        $payload = [
            'from' => $this->fromName . ' <' . $this->fromEmail . '>',
            'to' => [$to],
            'subject' => $subject,
            'text' => $text,
            'html' => $html,
        ];
        if ($this->replyTo !== '') {
            $payload['reply_to'] = $this->replyTo;
        }
        if ($attachments !== []) {
            $payload['attachments'] = array_map(static fn(array $a): array => [
                'filename' => (string)$a['filename'],
                'content' => (string)$a['content'],
            ], $attachments);
        }

        $body = json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Accept: application/json',
            'Content-Type: application/json',
            'Idempotency-Key: ' . $idempotencyKey,
        ];
        $response = $this->transport !== null
            ? ($this->transport)(self::ENDPOINT, $headers, $body)
            : $this->request($headers, $body);

        $status = (int)($response['status'] ?? 0);
        $raw = $response['body'] ?? '';
        if ($status < 200 || $status >= 300 || !is_string($raw)) {
            error_log('Resend request failed with HTTP ' . $status . '.');
            throw new EmailDeliveryException('E-mail provider unavailable.');
        }

        try {
            $decoded = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new EmailDeliveryException('Invalid e-mail provider response.');
        }
        $providerId = is_array($decoded) ? ($decoded['id'] ?? null) : null;
        if (!is_string($providerId) || preg_match('/\A[a-zA-Z0-9._:-]{1,128}\z/D', $providerId) !== 1) {
            throw new EmailDeliveryException('Invalid e-mail provider response.');
        }
        return $providerId;
    }

    /** @param array<int,string> $headers @return array{status:int,body:string} */
    private function request(array $headers, string $body): array {
        if (!function_exists('curl_init')) {
            throw new EmailDeliveryException('E-mail transport unavailable.');
        }
        $curl = curl_init(self::ENDPOINT);
        if ($curl === false) {
            throw new EmailDeliveryException('E-mail transport unavailable.');
        }

        $buffer = '';
        $tooLarge = false;
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 10,
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
        $curlError = curl_error($curl);
        curl_close($curl);
        if ($tooLarge) {
            throw new EmailDeliveryException('E-mail provider response exceeded the size limit.');
        }
        if ($ok === false || $curlError !== '') {
            error_log('Resend request failed with a transport error.');
            throw new EmailDeliveryException('E-mail transport unavailable.');
        }
        return ['status' => $status, 'body' => $buffer];
    }

    private function validSecret(string $value): bool {
        return strlen($value) >= 20 && strlen($value) <= 512 && preg_match('/[\r\n]/', $value) !== 1;
    }

    private function validEmail(string $value): bool {
        return strlen($value) <= 254
            && preg_match('/[\r\n]/', $value) !== 1
            && filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
    }
}
