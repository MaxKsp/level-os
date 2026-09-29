<?php
declare(strict_types=1);
/** GS1 modulo-10; this is format validation, not a product-identity guarantee. */
function nutrition_valid_barcode(mixed $raw): bool {
    if (!is_string($raw) || preg_match('/\A(?:[0-9]{8}|[0-9]{12,14})\z/D', $raw) !== 1) return false;
    $sum = 0;
    for ($i = strlen($raw) - 2, $position = 0; $i >= 0; $i--, $position++) {
        $sum += (int)$raw[$i] * ($position % 2 === 0 ? 3 : 1);
    }
    return ((10 - ($sum % 10)) % 10) === (int)$raw[strlen($raw) - 1];
}
function nutrition_barcode_numeric(mixed $value, float $max): ?float {
    if ((!is_float($value) && !is_int($value)) || !is_finite((float)$value) || $value < 0 || $value > $max) return null;
    return round((float)$value, 2);
}
