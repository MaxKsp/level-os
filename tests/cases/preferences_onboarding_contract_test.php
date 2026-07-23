<?php
declare(strict_types=1);

return static function (): void {
    $source = file_get_contents(dirname(__DIR__, 2) . '/api/prefs.php');
    if (!is_string($source)) {
        throw new RuntimeException('Unable to read api/prefs.php.');
    }
    foreach (['require_login()', 'require_csrf()', "'onboarding_completed'", "'_preferences_v1'"] as $required) {
        if (!str_contains($source, $required)) {
            throw new RuntimeException('Missing onboarding preferences contract: ' . $required);
        }
    }
};
