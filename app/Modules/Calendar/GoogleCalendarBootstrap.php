<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/TokenCrypto.php';
require_once __DIR__ . '/GoogleOAuthClient.php';
require_once __DIR__ . '/GoogleCalendarClient.php';
require_once __DIR__ . '/GoogleCalendarRepository.php';
require_once __DIR__ . '/GoogleCalendarService.php';

function google_oauth_client(): GoogleOAuthClient {
    $clientId = defined('GOOGLE_CLIENT_ID') ? trim((string)GOOGLE_CLIENT_ID) : '';
    $clientSecret = defined('GOOGLE_CLIENT_SECRET') ? trim((string)GOOGLE_CLIENT_SECRET) : '';
    return new GoogleOAuthClient($clientId, $clientSecret);
}

function google_calendar_service(PDO $db): GoogleCalendarService {
    $crypto = TokenCrypto::fromEnvironment('LEVELOS_GOOGLE_TOKEN_KEY');
    return new GoogleCalendarService(
        $db,
        new GoogleCalendarRepository($db, $crypto),
        google_oauth_client(),
        new GoogleCalendarClient(),
        $crypto,
    );
}
