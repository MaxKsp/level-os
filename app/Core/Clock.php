<?php
declare(strict_types=1);

const LEVEL_OS_TIMEZONE = 'America/Sao_Paulo';

function level_clock_timezone(): DateTimeZone {
    static $timezone = null;
    return $timezone ??= new DateTimeZone(LEVEL_OS_TIMEZONE);
}

function level_clock_utc_timezone(): DateTimeZone {
    static $timezone = null;
    return $timezone ??= new DateTimeZone('UTC');
}

/** Relógio de negócio único; calendário e streaks usam São Paulo. */
function level_clock_now(?int $epoch = null): DateTimeImmutable {
    $now = $epoch === null ? new DateTimeImmutable('now', level_clock_timezone()) : new DateTimeImmutable('@' . $epoch);
    return $now->setTimezone(level_clock_timezone());
}

function level_clock_epoch(): int {
    return level_clock_now()->getTimestamp();
}

function level_clock_today(?int $epoch = null): DateTimeImmutable {
    return level_clock_now($epoch)->setTime(0, 0);
}

/** Persistência temporal permanece normalizada em UTC. */
function level_clock_utc_sql(?int $epoch = null): string {
    return level_clock_now($epoch)->setTimezone(level_clock_utc_timezone())->format('Y-m-d H:i:s');
}
