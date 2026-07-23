<?php
declare(strict_types=1);

return static function (): void {
    $authView = file_get_contents(dirname(__DIR__, 2) . '/app/Shared/AuthView.php');
    if (!is_string($authView)
        || !str_contains($authView, 'rel="icon"')
        || !str_contains($authView, '/assets/level-os-icon.svg')
        || !str_contains($authView, 'rel="apple-touch-icon"')) {
        throw new RuntimeException('Authentication pages must expose the Level OS browser icons.');
    }

    $css = file_get_contents(dirname(__DIR__, 2) . '/assets/auth.css');
    if (!is_string($css)) {
        throw new RuntimeException('Unable to read assets/auth.css.');
    }

    preg_match_all('/([^{}]+)\{([^{}]*)\}/', $css, $blocks, PREG_SET_ORDER);
    $scopedRuleFound = false;
    foreach ($blocks as $block) {
        $selector = trim((string)$block[1]);
        $declarations = (string)$block[2];
        if (!str_contains($selector, '#auth-intro-title') || !preg_match('/position\s*:\s*absolute/', $declarations)) {
            continue;
        }
        if (!str_contains($selector, '.auth-intro-title-stack')) {
            throw new RuntimeException('Animated title positioning leaked outside the login stack.');
        }
        $scopedRuleFound = true;
    }

    if (!$scopedRuleFound) {
        throw new RuntimeException('Scoped animated login title rule is missing.');
    }
};
