<?php
declare(strict_types=1);

require_once __DIR__ . '/GoogleProviderException.php';
require_once __DIR__ . '/GoogleHttpTransport.php';

final class GoogleCalendarClient {
    private readonly GoogleHttpTransport $transport;

    public function __construct(?GoogleHttpTransport $transport = null) {
        $this->transport = $transport ?? new GoogleHttpTransport();
    }

    /**
     * @param array<string,string|int|bool> $query
     * @return array<string,mixed>
     */
    public function listPrimaryEvents(string $accessToken, array $query): array {
        if ($accessToken === '' || strlen($accessToken) > 16384 || preg_match('/[\r\n]/', $accessToken)) {
            throw new InvalidArgumentException('Invalid access token.');
        }
        $allowed = ['singleEvents', 'orderBy', 'timeMin', 'timeMax', 'showDeleted', 'maxResults', 'pageToken', 'syncToken', 'fields'];
        foreach (array_keys($query) as $key) {
            if (!in_array($key, $allowed, true)) throw new InvalidArgumentException('Invalid Calendar query.');
        }
        $url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?'
            . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
        $response = $this->transport->request('GET', $url, [
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/json',
        ], null, 2097152);
        try {
            $body = json_decode($response['body'], true, 96, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new GoogleProviderException('Google Calendar returned an invalid response.', $response['status']);
        }
        if (!is_array($body)) throw new GoogleProviderException('Google Calendar returned an invalid response.', $response['status']);
        if ($response['status'] < 200 || $response['status'] >= 300) {
            $code = null;
            if (isset($body['error']['status']) && is_string($body['error']['status'])) $code = mb_substr($body['error']['status'], 0, 64);
            throw new GoogleProviderException('Google Calendar unavailable.', $response['status'], $code);
        }
        return $body;
    }
}
