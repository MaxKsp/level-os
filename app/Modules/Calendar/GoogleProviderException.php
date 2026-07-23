<?php
declare(strict_types=1);

final class GoogleProviderException extends RuntimeException {
    public function __construct(
        string $message,
        public readonly int $httpStatus = 0,
        public readonly ?string $providerCode = null,
    ) {
        parent::__construct($message);
    }

    public function requiresReconnect(): bool {
        return $this->providerCode === 'invalid_grant';
    }
}
