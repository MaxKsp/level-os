<?php
declare(strict_types=1);

/** @return array{subject:string,text:string,html:string} */
function email_template_verification(string $verifyUrl): array {
    return email_template_wrap(
        'Confirme seu e-mail — Level OS',
        'Confirme seu e-mail',
        'Seu espaço está quase pronto. Confirme o endereço para proteger sua conta.',
        'Confirmar e-mail',
        $verifyUrl,
        'Se você não criou essa conta, ignore esta mensagem.'
    );
}

/** @return array{subject:string,text:string,html:string} */
function email_template_password_reset(string $resetUrl, int $ttlMinutes): array {
    return email_template_wrap(
        'Redefinição de senha — Level OS',
        'Redefina sua senha',
        'Recebemos um pedido para redefinir sua senha. O link expira em ' . $ttlMinutes . ' minutos.',
        'Criar nova senha',
        $resetUrl,
        'Se você não solicitou a redefinição, ignore esta mensagem. Sua senha não foi alterada.'
    );
}

/** @return array{subject:string,text:string,html:string} */
function email_template_password_changed(): array {
    return email_template_wrap(
        'Senha alterada — Level OS',
        'Sua senha foi alterada',
        'A senha da sua conta Level OS foi redefinida com sucesso.',
        null,
        null,
        'Se você não realizou esta alteração, entre em contato com o suporte imediatamente.'
    );
}

function email_format_brl(float $value): string {
    return 'R$ ' . number_format($value, 2, ',', '.');
}

/**
 * @param array{balance:float,invoices:float,income:float,expense:float,routine_count:int,training_count:int} $summary
 * @return array{subject:string,text:string,html:string}
 */
function email_template_monthly_backup(string $username, string $dateLabel, array $summary): array {
    $safeName = trim($username) !== '' ? trim($username) : 'você';
    $balance = email_format_brl($summary['balance']);
    $invoices = email_format_brl($summary['invoices']);
    $income = email_format_brl($summary['income']);
    $expense = email_format_brl($summary['expense']);
    $routineCount = (int)$summary['routine_count'];
    $trainingCount = (int)$summary['training_count'];

    $text = "Olá, {$safeName}!\n\nResumo dos últimos 30 dias:\n"
        . "- Saldo total: {$balance}\n"
        . "- Fatura total: {$invoices}\n"
        . "- Entradas: {$income}\n"
        . "- Saídas: {$expense}\n"
        . "- Rotina: {$routineCount} tarefa(s) concluída(s)\n"
        . "- Treinos: {$trainingCount} treino(s) registrado(s)\n\n"
        . "O backup cifrado dos seus dados está anexado a este e-mail. "
        . "O arquivo só pode ser lido pelo próprio Level OS — guarde-o em local seguro.\n\n"
        . "Para restaurar, use Perfil → Segurança → Restaurar backup e selecione o arquivo anexo.\n\n— Level OS";

    $row = static fn(string $label, string $value): string =>
        '<tr><td style="padding:6px 0;color:#4b5a56">' . email_template_escape($label) . '</td>'
        . '<td style="padding:6px 0;text-align:right;font-weight:700">' . email_template_escape($value) . '</td></tr>';

    $content = '<p style="margin:0 0 18px">Olá, ' . email_template_escape($safeName)
            . '! Aqui está o resumo dos últimos 30 dias.</p>'
        . '<table style="width:100%;border-collapse:collapse;margin:0 0 20px">'
        . $row('Saldo total', $balance)
        . $row('Fatura total', $invoices)
        . $row('Entradas (30 dias)', $income)
        . $row('Saídas (30 dias)', $expense)
        . $row('Rotina concluída', $routineCount . ' tarefa(s)')
        . $row('Treinos registrados', $trainingCount . ' treino(s)')
        . '</table>'
        . '<p style="margin:0 0 8px">O backup cifrado dos seus dados está anexado a este e-mail. '
            . 'O arquivo só pode ser lido pelo próprio Level OS — guarde-o em local seguro.</p>'
        . '<p style="margin:18px 0 0;color:#66736f;font-size:13px">Para restaurar, use Perfil → Segurança → '
            . 'Restaurar backup e selecione o arquivo anexo.</p>';

    return [
        'subject' => 'Level OS — resumo e backup mensal (' . $dateLabel . ')',
        'text' => $text,
        'html' => email_template_html_document('Seu resumo mensal', $content),
    ];
}

/** @param array<int,array{time:string,title:string}> $tasks @return array{subject:string,text:string,html:string} */
function email_template_task_reminder(string $username, array $tasks): array {
    $plainLines = [];
    $htmlLines = [];
    foreach ($tasks as $task) {
        $time = trim((string)$task['time']);
        $title = trim((string)$task['title']);
        $plainLines[] = '- ' . $time . ' — ' . $title;
        $htmlLines[] = '<li style="padding:6px 0"><strong>' . email_template_escape($time)
            . '</strong> — ' . email_template_escape($title) . '</li>';
    }
    $safeName = trim($username) !== '' ? trim($username) : 'você';
    $text = "Olá, {$safeName}!\n\nVocê tem tarefa começando:\n\n"
        . implode("\n", $plainLines) . "\n\n— Level OS";
    $content = '<p style="margin:0 0 18px">Olá, ' . email_template_escape($safeName) . '!</p>'
        . '<p style="margin:0 0 8px">Você tem tarefa começando:</p>'
        . '<ul style="margin:0;padding-left:20px">' . implode('', $htmlLines) . '</ul>';
    return [
        'subject' => 'Level OS — tarefa começando',
        'text' => $text,
        'html' => email_template_html_document('Seu próximo passo', $content),
    ];
}

/** @return array{subject:string,text:string,html:string} */
function email_template_wrap(
    string $subject,
    string $heading,
    string $message,
    ?string $actionLabel,
    ?string $actionUrl,
    string $footer,
): array {
    $text = $heading . "\n\n" . $message;
    $content = '<p style="margin:0 0 18px">' . email_template_escape($message) . '</p>';
    if ($actionLabel !== null && $actionUrl !== null) {
        $text .= "\n\n" . $actionLabel . ': ' . $actionUrl;
        $content .= '<p style="margin:24px 0"><a href="' . email_template_escape($actionUrl)
            . '" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#31E6D4;color:#071311;text-decoration:none;font-weight:700">'
            . email_template_escape($actionLabel) . '</a></p>';
    }
    $text .= "\n\n" . $footer . "\n\n— Level OS";
    $content .= '<p style="margin:18px 0 0;color:#66736f;font-size:13px">' . email_template_escape($footer) . '</p>';
    return [
        'subject' => $subject,
        'text' => $text,
        'html' => email_template_html_document($heading, $content),
    ];
}

function email_template_html_document(string $heading, string $content): string {
    return '<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7f6;color:#10201c;font-family:Arial,sans-serif">'
        . '<div style="display:none;max-height:0;overflow:hidden">Level OS</div>'
        . '<div style="max-width:560px;margin:0 auto;padding:32px 16px">'
        . '<div style="padding:28px;border:1px solid #dce5e2;border-radius:14px;background:#ffffff">'
        . '<div style="margin-bottom:24px;color:#168f83;font-size:14px;font-weight:800;letter-spacing:.08em">LEVEL OS</div>'
        . '<h1 style="margin:0 0 14px;font-size:25px;line-height:1.2">' . email_template_escape($heading) . '</h1>'
        . '<div style="font-size:16px;line-height:1.6">' . $content . '</div>'
        . '</div></div></body></html>';
}

function email_template_escape(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
