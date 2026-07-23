<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/DashboardView.php';

$userId = require_login_page();
dashboard_view_render(__DIR__, csrf_token(), $userId);
