<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/DashboardView.php';

$userId = current_user_id();
if ($userId === null) {
    $landingPath = __DIR__ . '/frontend/dist/landing.html';
    if (is_file($landingPath)) {
        readfile($landingPath);
        exit;
    }

    header('Location: login.php');
    exit;
}
dashboard_view_render(__DIR__, csrf_token(), $userId);
