<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';

return function (): void {
    test_assert_same(0, progress_level_threshold(1), 'Level 1 starts at zero XP.');
    test_assert_same(120, progress_level_threshold(2), 'Level curve must use the documented base formula.');
    test_assert_same(2, progress_level_from_xp(120), 'XP at the threshold must advance the level.');

    $balancedMeta = progress_achievement_meta('equilibrio_10', [
        'rotina' => 10, 'financeiro' => 10, 'treino' => 9,
    ], 0, 1, 0);
    test_assert_same('geral', $balancedMeta['category'], 'Balanced achievement must belong to the general track.');
    test_assert_same(2, $balancedMeta['current'], 'Balanced achievement must count completed module goals.');
    test_assert_same(3, $balancedMeta['goal'], 'Balanced achievement must require all three modules.');

    // Tabelas de progressão já vêm do helper compartilhado (make_sqlite_finance_db).
    $db = make_sqlite_finance_db();
    $db->exec("INSERT INTO achievements (code,title,description,xp_bonus,icon) VALUES
        ('primeiro_passo','Primeiro passo','Conclua uma tarefa',40,'task_alt'),
        ('primeiro_treino','Corpo em movimento','Conclua um treino',80,'fitness_center'),
        ('controle_financeiro','No controle','Registre um lançamento',30,'payments'),
        ('rotina_10','Dez em dia','Conclua dez tarefas',80,'checklist')");

    $uid = 77;
    $routine = progress_award_event($db, $uid, 'rotina', 'rotina:2026-07-17:task-1');
    test_assert_same(60, $routine['delta'], 'Routine XP must include the first-task achievement bonus.');
    test_assert_same(60, $routine['state']['xp'], 'Server state must reflect event plus achievement.');
    test_assert_same(1, count($routine['unlocked']), 'First routine event must unlock exactly one achievement.');
    $firstRoutine = array_values(array_filter($routine['state']['achievements'], static fn(array $item): bool => $item['code'] === 'primeiro_passo'))[0];
    test_assert_same('rotina', $firstRoutine['category'], 'Achievement state must expose its module category.');
    test_assert_same(1, $firstRoutine['current'], 'Achievement state must expose current progress.');
    test_assert_same(1, $firstRoutine['goal'], 'Achievement state must expose its goal.');

    $workout = progress_award_event($db, $uid, 'treino', 'treino:2026-07-17:superior-a');
    test_assert_same(160, $workout['delta'], 'First workout must include the fixed event XP and achievement bonus.');
    test_assert_true($workout['level_up'], 'Crossing the documented threshold must report a level-up.');
    test_assert_same(2, $workout['state']['level'], 'Server level must be derived from accumulated XP.');

    $duplicate = progress_award_event($db, $uid, 'rotina', 'rotina:2026-07-17:task-1');
    test_assert_true($duplicate['duplicate'], 'Retrying the same ref must be idempotent.');
    test_assert_same(0, $duplicate['delta'], 'Duplicate refs must never award XP again.');
    test_assert_same(220, $duplicate['state']['xp'], 'Duplicate refs must preserve total XP.');

    $tenthRoutine = null;
    for ($task = 2; $task <= 10; $task++) {
        $tenthRoutine = progress_award_event($db, $uid, 'rotina', 'rotina:2026-07-17:task-' . $task);
    }
    test_assert_true(is_array($tenthRoutine), 'Routine milestone result must be available.');
    test_assert_true(in_array('rotina_10', array_column($tenthRoutine['unlocked'], 'code'), true), 'The tenth completed task must unlock its routine milestone.');
    $routineMilestone = array_values(array_filter($tenthRoutine['state']['achievements'], static fn(array $item): bool => $item['code'] === 'rotina_10'))[0];
    test_assert_same(10, $routineMilestone['current'], 'Routine milestone must report ten completed tasks.');
    test_assert_true($routineMilestone['unlocked'], 'Routine milestone must be persisted as unlocked.');

    $isolated = progress_get_state($db, 78);
    test_assert_same(0, $isolated['xp'], 'A second user must never inherit another user\'s XP.');
    test_assert_same(0, count(array_filter($isolated['achievements'], static fn(array $item): bool => $item['unlocked'])), 'Achievements must also remain isolated by user.');

    $legacyUid = 79;
    progress_ensure_user($db, $legacyUid);
    $db->prepare('UPDATE user_progress SET xp = 200 WHERE user_id = ?')->execute([$legacyUid]);
    $legacyEvent = $db->prepare("INSERT INTO xp_events (user_id,type,amount,ref) VALUES (?, 'rotina', 20, ?)");
    for ($task = 1; $task <= 10; $task++) $legacyEvent->execute([$legacyUid, 'legacy:task-' . $task]);
    $reconciled = progress_reconcile_user($db, $legacyUid);
    test_assert_true(in_array('rotina_10', array_column($reconciled, 'code'), true), 'Existing users must receive newly seeded achievements during reconciliation.');
    test_assert_same([], progress_reconcile_user($db, $legacyUid), 'Achievement reconciliation must be idempotent.');

    finance_save_set($db, $uid, 'expense', [[
        'id' => 'expense-xp-1', 'label' => 'Mercado', 'value' => 42.50,
        'date' => '2026-07-17',
    ]], true);
    $financeEvents = (int)$db->query("SELECT COUNT(*) FROM xp_events WHERE type = 'financeiro'")->fetchColumn();
    test_assert_same(1, $financeEvents, 'A new persisted finance row must award one server-side event.');

    finance_save_set($db, $uid, 'expense', [[
        'id' => 'expense-xp-1', 'label' => 'Mercado', 'value' => 42.50,
        'date' => '2026-07-17',
    ]], true);
    $financeEventsAfterRetry = (int)$db->query("SELECT COUNT(*) FROM xp_events WHERE type = 'financeiro'")->fetchColumn();
    test_assert_same(1, $financeEventsAfterRetry, 'Replacing the same finance set must not duplicate XP.');
};
