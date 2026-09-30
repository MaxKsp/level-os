<?php
declare(strict_types=1);
require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Training/TrainingMachineVisionService.php';

return static function (): void {
    $catalog = training_machine_catalog();
    foreach (['leg_press','lat_pulldown','chest_press','cable_machine','treadmill','rower'] as $id) {
        test_assert_true(isset($catalog[$id]), 'Core machine taxonomy must contain ' . $id . '.');
        test_assert_true(count($catalog[$id]['tips']) >= 3, 'Every machine needs practical setup guidance.');
        test_assert_true(trim((string)$catalog[$id]['query']) !== '', 'Every machine needs a library query.');
    }

    $parsed = training_machine_parse_model_text(
        'Resultado: {"machineId":"leg_press","confidence":0.87,"alternatives":["hack_squat","smith_machine","invalid"]}'
    );
    test_assert_same('leg_press', $parsed['machineId'], 'Known machine classification must be preserved.');
    test_assert_same(0.87, $parsed['confidence'], 'Confidence must be normalized.');
    test_assert_same(['hack_squat','smith_machine'], $parsed['alternatives'], 'Unknown alternatives must be dropped.');
    $unsafe = training_machine_parse_model_text('{"machineId":"not_allowed","confidence":4,"alternatives":[]}');
    test_assert_same(null, $unsafe['machineId'], 'Model cannot invent machine IDs.');
    test_assert_same(1.0, $unsafe['confidence'], 'Confidence is clamped even when provider responds badly.');

    $rejected = false;
    try { training_machine_image_data_url('data:text/plain;base64,' . base64_encode('not an image')); }
    catch (InvalidArgumentException) { $rejected = true; }
    test_assert_true($rejected, 'Non-image data URLs must be rejected before reaching a provider.');

    $prompt = training_machine_prompt();
    test_assert_true(str_contains($prompt, 'leg_press=Leg press'), 'Prompt must contain closed machine taxonomy.');
    test_assert_true(str_contains($prompt, 'Não dê conselhos'), 'Vision model must be restricted to classification.');
};
