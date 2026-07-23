<?php
declare(strict_types=1);

/** Transporte HTTPS mínimo e limitado para os endpoints fixos do Google. */
class GoogleHttpTransport {
    /** @return array{status:int,body:string} */
    public function request(
        string $method,
        string $url,
        array $headers = [],
        ?string $body = null,
        int $maxBytes = 2097152,
    ): array {
        if (!function_exists('curl_init')) {
            throw new GoogleProviderException('Google transport unavailable.');
        }
        $parts = parse_url($url);
        $host = is_array($parts) ? strtolower((string)($parts['host'] ?? '')) : '';
        if (
            !is_array($parts)
            || strtolower((string)($parts['scheme'] ?? '')) !== 'https'
            || !in_array($host, ['accounts.google.com', 'oauth2.googleapis.com', 'www.googleapis.com'], true)
            || $maxBytes < 1024
            || $maxBytes > 8388608
        ) {
            throw new InvalidArgumentException('Invalid Google request.');
        }

        $curl = curl_init($url);
        if ($curl === false) {
            throw new GoogleProviderException('Google transport unavailable.');
        }
        $buffer = '';
        $tooLarge = false;
        $options = [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$buffer, &$tooLarge, $maxBytes): int {
                if (strlen($buffer) + strlen($chunk) > $maxBytes) {
                    $tooLarge = true;
                    return 0;
                }
                $buffer .= $chunk;
                return strlen($chunk);
            },
        ];
        if ($body !== null) $options[CURLOPT_POSTFIELDS] = $body;
        curl_setopt_array($curl, $options);

        $ok = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);
        if ($tooLarge) {
            throw new GoogleProviderException('Google response exceeded the size limit.', $status);
        }
        if ($ok === false || $curlError !== '') {
            throw new GoogleProviderException('Google transport unavailable.', $status);
        }
        return ['status' => $status, 'body' => $buffer];
    }
}
