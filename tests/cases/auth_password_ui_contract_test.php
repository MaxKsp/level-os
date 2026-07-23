<?php
declare(strict_types=1);

return static function (): void {
    $root = dirname(__DIR__, 2);
    $view = (string)file_get_contents($root . '/app/Shared/AuthView.php');
    $script = (string)file_get_contents($root . '/assets/auth-password.js');
    $css = (string)file_get_contents($root . '/assets/auth.css');

    test_assert_true(str_contains($view, 'assets/auth-password.js'), 'Every auth page must load the password controls.');
    foreach (['Mostrar senha', 'Ocultar senha', 'aria-pressed', 'new-password', 'Força da senha'] as $contract) {
        test_assert_true(str_contains($script, $contract), 'The password control must include ' . $contract);
    }
    foreach (['length', 'case', 'number', 'symbol'] as $rule) {
        test_assert_true(str_contains($script, 'data-password-rule="' . $rule . '"'), 'The strength meter must expose the ' . $rule . ' rule.');
    }
    test_assert_true(str_contains($css, '.password-toggle'), 'The password toggle must have a shared visual style.');
    test_assert_true(str_contains($css, 'width: 44px') && str_contains($css, 'height: 44px'), 'The password toggle must preserve a 44px touch target.');
};
