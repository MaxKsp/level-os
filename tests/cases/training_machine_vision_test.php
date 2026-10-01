<?php
declare(strict_types=1);
require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Training/TrainingMachineVisionService.php';

return static function (): void {
    $catalog = training_machine_catalog();
    foreach ([
        'leg_press','seated_leg_curl','lying_leg_curl','hack_squat','pendulum_squat',
        'lat_pulldown','plate_loaded_row','chest_press','incline_chest_press','rear_delt_machine',
        'cable_machine','hip_thrust','biceps_curl_machine','treadmill','recumbent_bike','rower',
    ] as $id) {
        test_assert_true(isset($catalog[$id]), 'Core machine taxonomy must contain ' . $id . '.');
        test_assert_true(count($catalog[$id]['tips']) >= 3, 'Every machine needs practical setup guidance.');
        test_assert_true(trim((string)$catalog[$id]['query']) !== '', 'Every machine needs a library query.');
    }
    $signatures = training_machine_visual_signatures();
    test_assert_same(count($catalog), count($signatures), 'Every supported machine must have a visual signature.');
    foreach (array_keys($catalog) as $id) {
        test_assert_true(trim((string)($signatures[$id] ?? '')) !== '', 'Machine visual signature missing for ' . $id . '.');
    }
    $publicCatalog = training_machine_public_catalog();
    test_assert_same(count($catalog), count($publicCatalog), 'Manual confirmation catalog must expose every supported machine.');
    test_assert_true(isset($publicCatalog[0]['id'], $publicCatalog[0]['name'], $publicCatalog[0]['tips']), 'Public machine catalog must preserve safe guidance fields.');

    $parsed = training_machine_parse_model_text(
        'Resultado: {"machineId":"leg_press","confidence":0.87,"alternatives":["hack_squat","smith_machine","invalid"],'
        . '"imageQuality":"good","evidence":["plataforma grande","encosto reclinado"],"retakeReason":""}'
    );
    test_assert_same('leg_press', $parsed['machineId'], 'Known machine classification must be preserved.');
    test_assert_same(0.87, $parsed['confidence'], 'Confidence must be normalized.');
    test_assert_same(['hack_squat','smith_machine'], $parsed['alternatives'], 'Unknown alternatives must be dropped.');
    test_assert_same('good', $parsed['imageQuality'], 'Good image quality must be preserved.');
    test_assert_same(['plataforma grande','encosto reclinado'], $parsed['evidence'], 'Visual evidence must stay bounded and structured.');
    $poor = training_machine_parse_model_text(
        '{"machineId":"leg_press","confidence":0.98,"alternatives":[],"imageQuality":"poor","retakeReason":"aparelho cortado"}'
    );
    test_assert_same(0.49, $poor['confidence'], 'Poor photos must never keep an auto-select confidence.');
    test_assert_same('aparelho cortado', $poor['retakeReason'], 'Retake reason must be preserved.');
    $unsafe = training_machine_parse_model_text('{"machineId":"not_allowed","confidence":4,"alternatives":[]}');
    test_assert_same(null, $unsafe['machineId'], 'Model cannot invent machine IDs.');
    test_assert_same(1.0, $unsafe['confidence'], 'Confidence is clamped even when provider responds badly.');

    $rejected = false;
    try { training_machine_image_data_url('data:text/plain;base64,' . base64_encode('not an image')); }
    catch (InvalidArgumentException) { $rejected = true; }
    test_assert_true($rejected, 'Non-image data URLs must be rejected before reaching a provider.');

    $prompt = training_machine_prompt();
    test_assert_true(str_contains($prompt, 'leg_press=Leg press'), 'Prompt must contain closed machine taxonomy.');
    test_assert_true(str_contains($prompt, 'plataforma grande de pés'), 'Prompt must contain visual disambiguation cues.');
    test_assert_true(str_contains($prompt, 'imageQuality'), 'Prompt must require photo-quality evaluation.');
    test_assert_true(str_contains($prompt, 'Não dê conselhos'), 'Vision model must be restricted to classification.');
};
