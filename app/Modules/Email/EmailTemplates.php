<?php
declare(strict_types=1);

/** @return array{subject:string,text:string,html:string} */
function email_template_verification(string $verifyUrl): array {
    $message = 'Seu espaço está quase pronto. Confirme este endereço para ativar sua conta e manter seus dados protegidos.';
    $support = email_template_notice(
        'Este link é exclusivo para você',
        'Ele expira em 48 horas e só pode ser usado uma vez.',
        'security'
    );

    return email_template_wrap(
        'Confirme seu e-mail · Level OS',
        'Confirme seu e-mail',
        $message,
        'Confirmar e-mail',
        $verifyUrl,
        'Se você não criou esta conta, pode ignorar esta mensagem com segurança.',
        'Falta só uma etapa para começar.',
        'ACESSO SEGURO',
        $support,
    );
}

/** @return array{subject:string,text:string,html:string} */
function email_template_password_reset(string $resetUrl, int $ttlMinutes): array {
    $ttlMinutes = max(1, $ttlMinutes);
    $message = 'Recebemos um pedido para criar uma nova senha para sua conta.';
    $support = email_template_notice(
        'Link temporário',
        'Este acesso expira em ' . $ttlMinutes . ' minutos e deixa de funcionar após a alteração.',
        'time'
    );

    return email_template_wrap(
        'Redefina sua senha · Level OS',
        'Crie uma nova senha',
        $message,
        'Redefinir senha',
        $resetUrl,
        'Não solicitou esta alteração? Ignore o e-mail. Sua senha atual continua válida.',
        'Use o acesso seguro antes que ele expire.',
        'SEGURANÇA DA CONTA',
        $support,
    );
}

/** @return array{subject:string,text:string,html:string} */
function email_template_password_changed(): array {
    $appUrl = email_app_base_url();
    $securityUrl = $appUrl !== null ? $appUrl . '/forgot-password.php' : null;
    $support = email_template_notice(
        'Sessões anteriores encerradas',
        'Por segurança, a alteração invalida outros acessos ativos da conta.',
        'success'
    );

    return email_template_wrap(
        'Senha alterada com sucesso · Level OS',
        'Senha atualizada',
        'A senha da sua conta Level OS foi alterada com sucesso.',
        $securityUrl !== null ? 'Proteger minha conta' : null,
        $securityUrl,
        'Se não foi você, redefina a senha imediatamente e revise a segurança da conta.',
        'Sua conta recebeu uma nova senha.',
        'ALTERAÇÃO CONFIRMADA',
        $support,
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
    $safeName = email_template_display_name($username);
    $balance = email_format_brl($summary['balance']);
    $invoices = email_format_brl($summary['invoices']);
    $income = email_format_brl($summary['income']);
    $expense = email_format_brl($summary['expense']);
    $routineCount = (int)$summary['routine_count'];
    $trainingCount = (int)$summary['training_count'];

    $text = "Olá, {$safeName}!\n\nSeu resumo dos últimos 30 dias:\n"
        . "- Saldo total: {$balance}\n"
        . "- Fatura total: {$invoices}\n"
        . "- Entradas: {$income}\n"
        . "- Saídas: {$expense}\n"
        . "- Rotina: {$routineCount} tarefa(s) concluída(s)\n"
        . "- Treinos: {$trainingCount} treino(s) registrado(s)\n\n"
        . "Seu backup criptografado está anexado. Guarde o arquivo em um local seguro. "
        . "Para restaurar, acesse Perfil > Segurança > Restaurar backup.\n\n— Level OS";

    $metrics = email_template_metrics_grid([
        ['label' => 'Saldo total', 'value' => $balance, 'tone' => 'primary'],
        ['label' => 'Fatura total', 'value' => $invoices, 'tone' => 'neutral'],
        ['label' => 'Entradas · 30 dias', 'value' => $income, 'tone' => 'positive'],
        ['label' => 'Saídas · 30 dias', 'value' => $expense, 'tone' => 'negative'],
        ['label' => 'Rotina concluída', 'value' => $routineCount . ' tarefa(s)', 'tone' => 'neutral'],
        ['label' => 'Treinos registrados', 'value' => $trainingCount . ' treino(s)', 'tone' => 'neutral'],
    ]);
    $content = '<p style="margin:0 0 22px;color:#b8c6c2;font-size:16px;line-height:1.7">Olá, '
        . email_template_escape($safeName) . '. Este é o retrato dos seus últimos 30 dias.</p>'
        . $metrics
        . email_template_notice(
            'Backup protegido em anexo',
            'O arquivo .lvbk é criptografado e só pode ser restaurado pelo Level OS. Guarde-o em um local seguro.',
            'security'
        )
        . '<p style="margin:18px 0 0;color:#7f918b;font-size:13px;line-height:1.6">Para restaurar: Perfil → Segurança → Restaurar backup.</p>';

    return [
        'subject' => 'Seu mês no Level OS · ' . $dateLabel,
        'text' => $text,
        'html' => email_template_html_document(
            'Seu mês, em contexto',
            $content,
            'Resumo de finanças, rotina e treinos com seu backup criptografado.',
            'RESUMO MENSAL'
        ),
    ];
}

/** @param array<int,array{time:string,title:string}> $tasks @return array{subject:string,text:string,html:string} */
function email_template_task_reminder(string $username, array $tasks): array {
    $plainLines = [];
    $rows = [];
    foreach ($tasks as $task) {
        $time = trim((string)$task['time']);
        $title = trim((string)$task['title']);
        if ($time === '' || $title === '') continue;
        $plainLines[] = '- ' . $time . ' — ' . $title;
        $rows[] = '<tr><td style="padding:0 0 10px">'
            . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:#0b1210;border:1px solid #1c2a26;border-radius:12px">'
            . '<tr><td width="78" style="padding:16px;color:#31e6d4;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:800;vertical-align:top">'
            . email_template_escape($time) . '</td>'
            . '<td style="padding:16px 16px 16px 0;color:#edf5f2;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.45">'
            . email_template_escape($title) . '</td></tr></table></td></tr>';
    }

    $safeName = email_template_display_name($username);
    $count = count($plainLines);
    $taskLabel = $count === 1 ? 'uma tarefa se aproximando' : $count . ' tarefas se aproximando';
    $agendaUrl = email_app_base_url();
    $agendaUrl = $agendaUrl !== null ? $agendaUrl . '/agenda' : null;
    $text = "Olá, {$safeName}!\n\nVocê tem {$taskLabel}:\n\n"
        . implode("\n", $plainLines);
    if ($agendaUrl !== null) {
        $text .= "\n\nAbrir rotina: " . $agendaUrl;
    }
    $text .= "\n\n— Level OS";
    $content = '<p style="margin:0 0 20px;color:#b8c6c2;font-size:16px;line-height:1.7">Olá, '
        . email_template_escape($safeName) . '. Organize o próximo passo sem perder o ritmo.</p>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">'
        . implode('', $rows) . '</table>';
    if ($agendaUrl !== null) {
        $content .= email_template_button('Abrir rotina', $agendaUrl);
    }

    return [
        'subject' => $count === 1 ? 'Sua próxima tarefa · Level OS' : $count . ' tarefas próximas · Level OS',
        'text' => $text,
        'html' => email_template_html_document(
            'Seu próximo passo',
            $content,
            'Você tem ' . $taskLabel . '.',
            'ROTINA'
        ),
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
    string $preheader = 'Uma atualização importante da sua conta Level OS.',
    string $eyebrow = 'LEVEL OS',
    string $supportContent = '',
): array {
    $text = $heading . "\n\n" . $message;
    $content = '<p style="margin:0;color:#b8c6c2;font-size:16px;line-height:1.7">'
        . email_template_escape($message) . '</p>';
    if ($supportContent !== '') {
        $content .= $supportContent;
        $plainSupport = email_template_plain_text($supportContent);
        if ($plainSupport !== '') {
            $text .= "\n\n" . $plainSupport;
        }
    }
    if ($actionLabel !== null && $actionUrl !== null) {
        $text .= "\n\n" . $actionLabel . ': ' . $actionUrl;
        $content .= email_template_button($actionLabel, $actionUrl);
    }
    $text .= "\n\n" . $footer . "\n\n— Level OS";
    $content .= '<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #1c2a26;color:#7f918b;font-size:13px;line-height:1.65">'
        . email_template_escape($footer) . '</p>';

    return [
        'subject' => $subject,
        'text' => $text,
        'html' => email_template_html_document($heading, $content, $preheader, $eyebrow),
    ];
}

function email_template_html_document(
    string $heading,
    string $content,
    string $preheader = 'Level OS',
    string $eyebrow = 'LEVEL OS',
): string {
    $safeHeading = email_template_escape($heading);
    $safePreheader = email_template_escape($preheader);
    $safeEyebrow = email_template_escape($eyebrow);
    $appUrl = email_app_base_url();
    $brandMark = '';
    $footerOrigin = '';
    if ($appUrl !== null) {
        $logoUrl = email_template_escape($appUrl . '/assets/icon-192.png');
        $safeAppUrl = email_template_escape($appUrl);
        $appHost = parse_url($appUrl, PHP_URL_HOST);
        $appLabel = is_string($appHost) && $appHost !== '' ? $appHost : $appUrl;
        $brandMark = '<td style="padding-right:12px;vertical-align:middle"><img src="' . $logoUrl
            . '" width="34" height="34" alt="" style="display:block;width:34px;height:34px;border:0;border-radius:8px"></td>';
        $footerOrigin = '<br><a href="' . $safeAppUrl
            . '" style="color:#8fa29c;text-decoration:underline">' . email_template_escape($appLabel) . '</a>';
    }

    return '<!doctype html><html lang="pt-BR"><head>'
        . '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">'
        . '<title>' . $safeHeading . '</title>'
        . '<style>@media only screen and (max-width:620px){.email-shell{padding:18px 10px!important}.email-card{padding:28px 22px!important}.email-heading{font-size:29px!important}.metric-cell{display:block!important;width:auto!important}.metric-spacer{display:none!important}}a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}</style>'
        . '</head><body style="margin:0;padding:0;background:#020504;color:#edf5f2;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%">'
        . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">'
        . $safePreheader . '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#020504" style="width:100%;border-collapse:collapse;background:#020504">'
        . '<tr><td align="center" class="email-shell" style="padding:38px 16px">'
        . '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-collapse:collapse">'
        . '<tr><td style="padding:0 4px 20px">'
        . '<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>'
        . $brandMark
        . '<td style="vertical-align:middle;color:#edf5f2;font-size:14px;font-weight:800;letter-spacing:3px">LEVEL OS</td>'
        . '</tr></table></td></tr>'
        . '<tr><td class="email-card" style="padding:40px;background:#07100d;border:1px solid #1b2925;border-top:2px solid #31e6d4;border-radius:18px">'
        . '<div style="margin:0 0 14px;color:#31e6d4;font-size:11px;font-weight:800;letter-spacing:2.2px;line-height:1.4">' . $safeEyebrow . '</div>'
        . '<h1 class="email-heading" style="margin:0 0 20px;color:#f2f8f6;font-size:34px;line-height:1.16;letter-spacing:-1px;font-weight:750">' . $safeHeading . '</h1>'
        . '<div style="color:#b8c6c2;font-size:16px;line-height:1.7">' . $content . '</div>'
        . '</td></tr>'
        . '<tr><td style="padding:22px 6px 0;color:#61736d;font-size:12px;line-height:1.65;text-align:center">'
        . 'Seu sistema pessoal para finanças, rotina, treinos e evolução.' . $footerOrigin
        . '</td></tr></table></td></tr></table></body></html>';
}

function email_template_button(string $label, string $url): string {
    return '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 2px;border-collapse:separate">'
        . '<tr><td bgcolor="#31e6d4" style="border-radius:10px;background:#31e6d4">'
        . '<a href="' . email_template_escape($url) . '" style="display:inline-block;padding:14px 22px;color:#03100d;font-size:14px;font-weight:800;line-height:1;text-decoration:none;border-radius:10px">'
        . email_template_escape($label) . '</a></td></tr></table>';
}

function email_template_notice(string $title, string $message, string $tone = 'neutral'): string {
    $colors = match ($tone) {
        'success' => ['#0b1b16', '#1f7d63', '#70e3b8'],
        'time' => ['#1a160a', '#6d5921', '#f2cf67'],
        'security' => ['#081816', '#17645c', '#69e9db'],
        default => ['#0b1210', '#273630', '#a8bab4'],
    };

    return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border-collapse:separate;background:' . $colors[0] . ';border:1px solid ' . $colors[1] . ';border-radius:12px">'
        . '<tr><td style="padding:16px 18px">'
        . '<div style="margin:0 0 4px;color:' . $colors[2] . ';font-size:13px;font-weight:800;line-height:1.4">' . email_template_escape($title) . '</div>'
        . '<div style="color:#94a69f;font-size:13px;line-height:1.6">' . email_template_escape($message) . '</div>'
        . '</td></tr></table>';
}

/** @param array<int,array{label:string,value:string,tone:string}> $metrics */
function email_template_metrics_grid(array $metrics): string {
    $rows = [];
    foreach (array_chunk($metrics, 2) as $pair) {
        $cells = [];
        foreach ($pair as $metric) {
            $valueColor = match ($metric['tone']) {
                'primary' => '#31e6d4',
                'positive' => '#70e3b8',
                'negative' => '#ff8f8f',
                default => '#edf5f2',
            };
            $cells[] = '<td class="metric-cell" width="49%" style="width:49%;padding:16px;background:#0b1210;border:1px solid #1c2a26;border-radius:12px;vertical-align:top">'
                . '<div style="margin:0 0 7px;color:#71847d;font-size:11px;line-height:1.4;text-transform:uppercase;letter-spacing:.8px">'
                . email_template_escape($metric['label']) . '</div>'
                . '<div style="color:' . $valueColor . ';font-size:19px;font-weight:800;line-height:1.25">'
                . email_template_escape($metric['value']) . '</div></td>';
        }
        if (count($cells) === 1) {
            $cells[] = '<td class="metric-cell" width="49%" style="width:49%"></td>';
        }
        $rows[] = '<tr>' . $cells[0] . '<td class="metric-spacer" width="2%" style="width:2%;font-size:0">&nbsp;</td>' . $cells[1] . '</tr>'
            . '<tr><td colspan="3" height="10" style="height:10px;font-size:0">&nbsp;</td></tr>';
    }

    return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;border-collapse:separate">'
        . implode('', $rows) . '</table>';
}

function email_template_display_name(string $username): string {
    $name = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $username) ?? '');
    return $name !== '' ? $name : 'você';
}

function email_template_escape(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function email_template_plain_text(string $html): string {
    $withBreaks = str_replace(
        ['</div>', '</td>', '</tr>', '<br>', '<br/>', '<br />'],
        "\n",
        $html,
    );
    $text = html_entity_decode(strip_tags($withBreaks), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/[\t ]+/u', ' ', $text) ?? $text;
    $text = preg_replace('/\s*\R\s*/u', "\n", $text) ?? $text;
    $text = preg_replace('/\n{3,}/u', "\n\n", $text) ?? $text;

    return trim($text);
}
