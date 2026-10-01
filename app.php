<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/DashboardView.php';

$userId = current_user_id();
if ($userId === null) {
    header('Location: login.php?source=pwa');
    exit;
}

dashboard_view_render(__DIR__, csrf_token(), $userId);
