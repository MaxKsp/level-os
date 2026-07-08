<?php
require_once __DIR__ . '/auth.php';
require_login_page();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orby</title>
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#050507">
<link rel="apple-touch-icon" href="assets/icon-192.png">
<script>window.CSRF_TOKEN = "<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>";</script>
<script>
/* aplica o tema salvo antes do CSS renderizar, pra não piscar */
try{ const p = JSON.parse(localStorage.getItem('pm_prefs')||'{}');
  if(p.theme) document.documentElement.dataset.theme = p.theme;
  if(p.bg) document.documentElement.dataset.bg = p.bg;
}catch(e){}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/app.css?v=<?= @filemtime(__DIR__.'/assets/app.css') ?>">
</head>
<body>

<div class="wrap">
  <div class="topbar">
    <div class="brand">
      <svg class="orbymark" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="obg" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
        <g transform="rotate(-18 24 24)"><path d="M3 24a21 7.5 0 0 1 42 0" stroke="url(#obg)" stroke-width="3.4" stroke-linecap="round"/></g>
        <circle cx="24" cy="24" r="12.5" stroke="var(--text)" stroke-width="7"/>
        <g transform="rotate(-18 24 24)"><path d="M45 24a21 7.5 0 0 1 -42 0" stroke="url(#obg)" stroke-width="3.4" stroke-linecap="round"/></g>
        <circle cx="40" cy="7.5" r="3.1" fill="#2DD4BF"/>
      </svg>
      <div class="wordmark">Orby</div>
    </div>
    <div class="sectiontabs" id="sectiontabs">
      <div class="sectiontab active" data-page="agenda" title="Agenda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
      </div>
      <div class="sectiontab" data-page="financeiro" title="Financeiro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.9 2.5 2c0 2.5-5 1.7-5 4.2 0 1.1 1.1 2 2.5 2s2.5-.8 2.5-2"/></svg>
      </div>
      <div class="sectiontab" data-page="treinos" title="Treinos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M4 8v8M8 4v16M16 4v16M20 8v8M2 12h2M20 12h2"/></svg>
      </div>
      <div class="sectiontab" data-page="perfil" title="Perfil" id="tabPerfil">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
      </div>
    </div>
  </div>

  <div class="page active" id="page-agenda">
    <div class="instrument" id="hero">
      <div class="instrument-head"><span class="eyebrow" id="heroLabel">Agora</span></div>
      <div class="instrument-body">
        <div class="now-title" id="heroTitle">Carregando...</div>
        <div class="readouts">
          <div class="readout"><div class="rv" id="nextIn">--:--</div><div class="rl">Próxima parada</div></div>
          <div class="readout"><div class="rv sage" id="doneCount">0/0</div><div class="rl">Cumpridas hoje</div></div>
          <div class="readout"><div class="rv" id="notifStatus" style="font-size:14px;">Ativo</div><div class="rl">Alarme</div></div>
        </div>
      </div>
    </div>

    <div class="agenda-subnav" id="agendaSubnav">
      <div class="apill active" data-asub="inicio">Início</div>
      <div class="apill" data-asub="calendario">Calendário</div>
    </div>

    <div class="apage active" id="apage-inicio">
      <div class="finrow3" id="agendaStatRow"></div>
      <div class="dashgrid">
        <div class="dashcard">
          <div class="dashcard-title">Conclusão por dia</div>
          <div class="dashcard-sub">Quanto mais escuro, mais tarefas cumpridas naquele dia. Mês atual.</div>
          <div id="wrapTaskHeat"></div>
        </div>
        <div class="dashcard">
          <div class="dashcard-title">Taxa de conclusão — últimos 30 dias</div>
          <div class="dashcard-sub">Percentual de tarefas cumpridas por dia.</div>
          <div class="dashcanvas-wrap" id="wrapTaskLine"><canvas id="chartTaskLine"></canvas></div>
        </div>
        <div class="dashcard" style="grid-column:1 / -1;">
          <div class="dashcard-title">Conclusão por categoria</div>
          <div class="dashcard-sub">Percentual cumprido em cada tipo de tarefa, últimos 30 dias.</div>
          <div class="dashcanvas-wrap" id="wrapTaskCat"><canvas id="chartTaskCat"></canvas></div>
        </div>
      </div>
    </div>

    <div class="apage" id="apage-calendario">
      <div class="agenda-subnav" id="calSubnav">
        <div class="apill active" data-view="day">Dia</div>
        <div class="apill" data-view="week">Semana</div>
        <div class="apill" data-view="month">Mês</div>
        <div class="apill" data-view="year">Ano</div>
      </div>

      <div class="agenda-header">
        <div class="agenda-title-wrap">
          <div>
            <div class="agenda-title" id="agendaTitle">-</div>
            <div class="agenda-sub" id="agendaSub"></div>
          </div>
        </div>
        <div class="agenda-actions">
          <button class="iconbtn" id="btnPrev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button>
          <button class="iconbtn" id="btnToday"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="3"/><circle cx="12" cy="14" r="2.3" fill="currentColor" stroke="none"/></svg></button>
          <button class="iconbtn" id="btnNext"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button>
          <button class="addbtn" id="btnNewTask">+</button>
        </div>
      </div>

      <div id="calBody"></div>

      <div class="agenda-label" id="agendaListLabel">Hoje</div>
      <div id="agendaList"></div>
    </div>
  </div>

  <div class="page" id="page-financeiro">
    <div class="fin-subnav" id="finSubnav">
      <div class="fsub active" data-fsub="inicio">Visão geral</div>
      <div class="fsub" data-fsub="extrato">Extrato</div>
      <div class="fsub" data-fsub="analises">Análises</div>
      <div class="fsub" data-fsub="metas">Metas</div>
    </div>

    <div class="fpage active" id="fpage-inicio">
      <div class="fpage-head"><h2 style="margin:0;">Minhas contas</h2>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="eyebtn" id="btnEyeVals" title="Ocultar/mostrar valores">
            <svg id="eyeOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>
            <svg id="eyeClosed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="display:none;"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><path d="M4 4l16 16"/></svg>
          </button>
          <button class="btn-ghost" id="btnTransfer" style="padding:5px 12px;font-size:12px;">⇄ Transferir</button>
          <button class="addbtn-sm" id="btnOpenAccModal">+</button>
        </div>
      </div>
      <div id="accSummary" class="acc-summary"></div>
      <div id="accProjection"></div>
      <div id="accFaturaAlert"></div>
      <div id="accOverdraftAlert"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <div class="fin-period" id="accTipoFilter" style="margin-bottom:12px;">
          <div class="perpill active" data-acctipo="all">Tudo</div>
          <div class="perpill" data-acctipo="conta">Contas</div>
          <div class="perpill" data-acctipo="poupanca">Poupança</div>
          <div class="perpill" data-acctipo="cartao">Cartões</div>
        </div>
        <div id="accViewToggle" class="acc-viewtoggle" style="display:none;">
          <button data-accview="conta" class="active">Por conta</button>
          <button data-accview="banco">Por banco</button>
        </div>
      </div>
      <div id="accountLines"></div>
    </div>

    <div class="fpage" id="fpage-analises">
      <div class="fpage-head"><h2 style="margin:0;">Análises</h2></div>
      <div class="fin-period" id="finPeriodNav" style="margin-top:10px;">
        <div class="perpill" data-period="day">Dia</div>
        <div class="perpill" data-period="week">Semana</div>
        <div class="perpill active" data-period="month">Mês</div>
        <div class="perpill" data-period="year">Ano</div>
      </div>

      <div class="finhead"><div class="big" id="finSaldoBig">R$ 0,00</div><div class="lbl" id="finSaldoLbl">Saldo do mês</div></div>
      <div class="finrow3" id="finRow3"></div>

      <div class="dashgrid">
        <div class="dashcard">
          <div class="dashcard-title" id="heatTitle">Despesas por dia</div>
          <div class="dashcard-sub" id="heatSub">Quanto mais escuro, mais foi gasto naquele dia. Mês atual.</div>
          <div id="wrapHeat"></div>
        </div>
        <div class="dashcard">
          <div class="dashcard-title">Despesas por banco</div>
          <div class="dashcard-sub">Para onde vai cada saída cadastrada.</div>
          <div class="dashcanvas-wrap" id="wrapBank"><canvas id="chartBank"></canvas></div>
        </div>
        <div class="dashcard">
          <div class="dashcard-title">Despesas por forma de pagamento</div>
          <div class="dashcard-sub">Pix, débito, crédito ou TED.</div>
          <div class="dashcanvas-wrap" id="wrapMethod"><canvas id="chartMethod"></canvas></div>
        </div>
        <div class="dashcard">
          <div class="dashcard-title">Despesas por categoria</div>
          <div class="dashcard-sub">Onde o dinheiro mais sai — moradia, alimentação, lazer etc.</div>
          <div class="dashcanvas-wrap" id="wrapCategoria"><canvas id="chartCategoria"></canvas></div>
        </div>
        <div class="dashcard">
          <div class="dashcard-title">Histórico mensal</div>
          <div class="dashcard-sub">Entradas × saídas dos últimos 6 meses, calculado dos seus lançamentos.</div>
          <div class="dashcanvas-wrap" id="wrapHistory"><canvas id="chartHistory"></canvas></div>
        </div>
        <div class="dashcard" id="cardLine" style="display:none;">
          <div class="dashcard-title">Renda variável ao longo do tempo</div>
          <div class="dashcard-sub" id="lineSub">Ganhos lançados por dia, últimos 30 dias.</div>
          <div class="dashcanvas-wrap" id="wrapLine"><canvas id="chartLine"></canvas></div>
        </div>
      </div>
    </div>

    <div class="fpage" id="fpage-extrato">
      <div class="fpage-head"><h2 style="margin:0;">Extrato</h2></div>
      <div class="fin-period" id="extratoFilter" style="margin-bottom:12px;">
        <div class="perpill active" data-extf="all">Tudo</div>
        <div class="perpill" data-extf="in">Entradas</div>
        <div class="perpill" data-extf="out">Saídas</div>
      </div>
      <input type="search" id="extSearch" placeholder="Buscar lançamento por nome, categoria ou banco..." style="width:100%;margin-bottom:10px;">
      <div id="extActions" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <button class="btn-ghost" id="btnImportOfx" style="flex:1;min-width:150px;">Importar extrato (OFX)</button>
        <button class="btn-ghost" id="btnQuickIfood" style="flex:1;min-width:150px;">+ Renda variável (iFood)</button>
      </div>
      <input type="file" id="ofxFile" accept=".ofx,application/x-ofx,text/plain" style="display:none;">
      <div id="ifoodQuickForm" style="display:none;margin-bottom:12px;">
        <div class="form-row">
          <input type="date" id="ifoodDate">
          <input type="number" id="ifoodValor" placeholder="Valor (R$)" step="0.01" style="width:130px;">
          <input type="number" id="ifoodKm" placeholder="Km" style="width:80px;">
          <button class="action" id="btnAddIfood">Lançar</button>
        </div>
      </div>
      <div id="anomalyBox"></div>
      <div id="extratoList"></div>
      <button id="btnOpenIncModal" style="display:none;"></button>
      <button id="btnOpenExpModal" style="display:none;"></button>
      <div id="ifoodList" style="display:none;"></div>
    </div>

    <div class="fpage" id="fpage-metas">
      <div class="fpage-head"><h2 style="margin:0;">Metas do mês</h2><button class="addbtn-sm" id="btnEditGoals" title="Editar metas">✎</button></div>
      <div class="dashcard-sub" style="margin:2px 0 10px;">Limite de gasto por categoria. A barra mostra quanto do limite já foi usado neste mês — âmbar a partir de 80%, vermelho ao estourar.</div>
      <div id="goalsList"></div>
    </div>
  </div>

  <div class="page" id="page-treinos">
    <div class="agenda-subnav" id="treinosSubnav">
      <div class="tsub active" data-tsub="hoje">Hoje</div>
      <div class="tsub" data-tsub="treinos">Treinos</div>
      <div class="tsub" data-tsub="medidas">Medidas</div>
    </div>

    <div class="tpage active" id="tpage-hoje">
      <div class="instrument" id="workoutHero">
        <div class="instrument-head"><span class="eyebrow">Treino de hoje</span></div>
        <div class="instrument-body">
          <div class="field" style="margin-bottom:0;">
            <label>Qual treino você vai fazer hoje?</label>
            <select id="todayWorkout"><option value="">— escolher treino —</option></select>
          </div>
          <div id="todayExercises" style="margin-top:14px;"></div>
        </div>
      </div>
      <div class="finrow3" id="workoutStatRow"></div>
      <div class="dashgrid" style="margin-top:18px;">
        <div class="dashcard">
          <div class="dashcard-title">Dias treinados</div>
          <div class="dashcard-sub">Cada dia com treino concluído fica marcado. Mês atual.</div>
          <div id="wrapWorkoutHeat"></div>
        </div>
      </div>
    </div>

    <div class="tpage" id="tpage-treinos">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        <button class="btn-primary" id="btnGenWorkout" style="flex:1;min-width:180px;">⚡ Gerar treino automático</button>
        <button class="btn-ghost" id="btnNewWorkout" style="flex:1;min-width:150px;">+ Criar treino manual</button>
      </div>
      <div class="dashcard-sub" style="margin:0 0 10px;">Seus modelos de treino. Toque pra editar os exercícios.</div>
      <div id="workoutList"></div>
    </div>

    <div class="tpage" id="tpage-medidas">
      <div id="bmiCard"></div>
      <div class="fpage-head"><h2 style="margin:22px 0 0;">Evolução do peso</h2></div>
      <div class="dashcard" style="margin-top:10px;"><div class="dashcanvas-wrap" id="wrapWeight"><canvas id="chartWeight"></canvas></div></div>
      <div class="fpage-head"><h2 style="margin:22px 0 0;">Histórico de medidas</h2><button class="addbtn-sm" id="btnNewMeasure">+</button></div>
      <div class="dashcard-sub" style="margin:2px 0 10px;">Registre peso e circunferências pra acompanhar a evolução.</div>
      <div id="measureList"></div>
    </div>
  </div>

  <div class="page" id="page-perfil">
    <h2 style="margin:18px 0 4px;">Perfil</h2>
    <p class="footnote" style="margin-bottom:16px;">Sua conta, aparência do painel, notificações e segurança.</p>

    <div class="profilecard">
      <div class="profilecard-title">Conta</div>
      <div class="profile-account">
        <button type="button" class="avatar" id="pfAvatar" title="Alterar foto">?</button>
        <div class="info">
          <div class="ttl" id="pfUsername">—</div>
          <div class="sub" id="pfEmail">—</div>
          <button type="button" class="avatarlink" id="btnChangeAvatar">Alterar foto</button>
        </div>
      </div>
      <input type="file" id="avatarFile" accept="image/jpeg,image/png,image/webp" style="display:none;">
    </div>

    <div class="profilecard">
      <div class="profilecard-title">Ordem das seções</div>
      <div class="profilecard-sub" style="margin-bottom:10px;">Defina a ordem do menu principal. O Perfil fica sempre por último.</div>
      <div id="sectionOrderList"></div>
    </div>

    <div class="profilecard">
      <div class="profilecard-title">Aparência</div>
      <div class="profilecard-sub">Cor de destaque</div>
      <div class="themegrid" id="themeGrid">
        <button class="themedot" data-t="" style="--dot1:#4F8DF9;--dot2:#8B5CF6;" title="Azul"></button>
        <button class="themedot" data-t="violeta" style="--dot1:#8B5CF6;--dot2:#D946EF;" title="Violeta"></button>
        <button class="themedot" data-t="verde" style="--dot1:#10B981;--dot2:#4F8DF9;" title="Verde"></button>
        <button class="themedot" data-t="ambar" style="--dot1:#F59E0B;--dot2:#EF4444;" title="Âmbar"></button>
        <button class="themedot" data-t="rosa" style="--dot1:#EC4899;--dot2:#8B5CF6;" title="Rosa"></button>
      </div>
      <div class="profilecard-sub" style="margin-top:14px;">Fundo</div>
      <div class="bgpick" id="bgPick">
        <button class="bgopt" data-b="">Grafite</button>
        <button class="bgopt" data-b="preto">Preto puro</button>
        <button class="bgopt" data-b="claro">Claro</button>
      </div>
    </div>

    <div class="profilecard">
      <div class="profilecard-title">Notificações</div>
      <label class="switchrow">
        <div><div class="sr-ttl">Notificações do navegador</div><div class="sr-sub" id="notifBrowserSub">Avisa quando uma tarefa da agenda começa (com o app aberto ou instalado).</div></div>
        <input type="checkbox" id="tglNotifBrowser">
      </label>
      <label class="switchrow">
        <div><div class="sr-ttl">Receber por e-mail</div><div class="sr-sub">Envia um e-mail quando uma tarefa está pra começar, mesmo com o app fechado.</div></div>
        <input type="checkbox" id="tglNotifEmail">
      </label>
    </div>

    <div class="profilecard">
      <div class="profilecard-title">Segurança</div>
      <div id="totpStatus" style="font-size:13px;color:var(--text-2);margin-bottom:10px;">Carregando...</div>
      <button class="btn-ghost" id="btnEnable2fa" style="width:100%;display:none;">Ativar verificação em duas etapas</button>
      <div id="totpEnrollBox" style="display:none;">
        <div id="totpQr" style="display:flex;justify-content:center;margin:12px 0;"></div>
        <div style="font-size:12px;color:var(--text-2);text-align:center;margin-bottom:12px;word-break:break-all;">Chave manual: <code id="totpManualKey"></code></div>
        <input type="text" id="totpCode" placeholder="Código de 6 dígitos" inputmode="numeric" style="margin-bottom:8px;width:100%;">
        <button class="btn-primary" id="btnConfirm2fa" style="width:100%;">Confirmar ativação</button>
      </div>
      <div id="totpBackupCodesBox" style="display:none;">
        <div style="font-size:12px;color:var(--text-2);margin:10px 0 8px;">Guarde esses códigos — cada um só funciona uma vez, caso você perca acesso ao app autenticador:</div>
        <div id="totpBackupCodesList" style="font-family:'IBM Plex Mono',monospace;font-size:13px;line-height:1.8;"></div>
      </div>
      <button class="btn-ghost" id="btnDisable2fa" style="width:100%;display:none;color:var(--brick);border-color:var(--brick);">Desativar 2FA</button>
      <div id="totpDisableBox" style="display:none;margin-top:8px;">
        <input type="password" id="totpDisablePassword" placeholder="Confirme sua senha" style="margin-bottom:8px;width:100%;">
        <button class="btn-ghost" id="btnConfirmDisable2fa" style="width:100%;color:var(--brick);border-color:var(--brick);">Confirmar desativação</button>
      </div>
    </div>

    <div class="profilecard">
      <div class="profilecard-title">Backup</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-ghost" id="btnExportBackup" style="flex:1;min-width:160px;">Baixar backup (.json)</button>
        <button class="btn-ghost" id="btnImportBackup" style="flex:1;min-width:160px;">Restaurar backup</button>
        <button class="btn-ghost" id="btnExportCsv" style="flex:1;min-width:160px;">Exportar CSV (planilha)</button>
        <button class="btn-ghost" id="btnIrReport" style="flex:1;min-width:160px;">Relatório anual (IR) — PDF</button>
      </div>
      <input type="file" id="importBackupFile" accept="application/json" style="display:none;">
    </div>

    <div id="settingsMsg" style="display:none;font-size:12.5px;margin:2px 0 12px;color:var(--sage);"></div>

    <button class="btn-ghost" id="btnLogout" style="width:100%;color:var(--brick);border-color:var(--brick);margin-bottom:24px;">Sair da conta</button>
  </div>
</div>

<div class="modal-overlay" id="modalOverlay">
  <div class="modal">
    <h3>Nova tarefa</h3>
    <div class="field"><label>Título</label><input type="text" id="mTitle" placeholder="Ex: Revisar pneu da moto"></div>
    <div class="field-row">
      <div class="field"><label>Data</label><input type="date" id="mDate"></div>
      <div class="field"><label>Hora</label><input type="time" id="mTime"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Categoria</label>
        <select id="mCat">
          <option value="treino">Treino</option>
          <option value="trabalho">Trabalho</option>
          <option value="estudo">Estudo</option>
          <option value="ifood">iFood</option>
          <option value="descanso">Descanso</option>
          <option value="deslocamento">Deslocamento</option>
        </select>
      </div>
      <div class="field"><label>Duração (min)</label><input type="number" id="mDuration" value="30" step="5" min="5"></div>
    </div>
    <div class="field"><label>Repetição</label>
      <select id="mRepeat">
        <option value="none">Não repete</option>
        <option value="weekly">Semanalmente</option>
        <option value="yearly">Anualmente</option>
      </select>
    </div>
    <div class="field" id="mWeeksField">
      <label>Por quantas semanas (0 = sem fim)</label>
      <input type="number" id="mWeeks" value="12" min="0">
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="btnCancelModal">Cancelar</button>
      <button class="btn-primary" id="btnSaveModal">Salvar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="incomeModalOverlay">
  <div class="modal">
    <h3 id="incomeModalTitle">Nova renda</h3>
    <div class="field"><label>Nome</label><input type="text" id="imLabel" placeholder="Ex: Salário, PJ EZ Soft"></div>
    <div class="field-row">
      <div class="field"><label>Regime</label>
        <select id="imRegime">
          <option value="nenhum">Outro / valor fixo</option>
          <option value="clt">CLT (calcular líquido)</option>
          <option value="pj">PJ (calcular líquido)</option>
        </select>
      </div>
      <div class="field"><label>Tipo</label>
        <select id="imType">
          <option value="fixa">Fixa</option>
          <option value="variavel">Variável</option>
          <option value="temporaria">Temporária</option>
        </select>
      </div>
    </div>

    <div id="imCltPanel" style="display:none;">
      <div class="field-row">
        <div class="field"><label>Salário bruto (R$)</label><input type="number" id="imBruto" step="0.01" placeholder="0"></div>
        <div class="field"><label>Dependentes</label><input type="number" id="imDeps" min="0" step="1" placeholder="0"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Horas extras 50%</label><input type="number" id="imHe50" min="0" step="0.5" placeholder="0"></div>
        <div class="field"><label>Horas extras 100%</label><input type="number" id="imHe100" min="0" step="0.5" placeholder="0"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Convênio médico (R$)</label><input type="number" id="imConvMed" step="0.01" placeholder="0"></div>
        <div class="field"><label>Convênio odontológico (R$)</label><input type="number" id="imConvOdo" step="0.01" placeholder="0"></div>
      </div>
      <div class="field"><label>Outros descontos (R$)</label><input type="number" id="imOutros" step="0.01" placeholder="0"></div>
      <div id="imCltResult" class="clt-result"></div>
    </div>

    <div id="imPjPanel" style="display:none;">
      <div class="field-row">
        <div class="field"><label>Valor bruto (R$)</label><input type="number" id="imPjBruto" step="0.01" placeholder="0"></div>
        <div class="field"><label>Impostos (%)</label><input type="number" id="imPjImposto" step="0.01" placeholder="Ex: 6"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Convênio/plano (R$)</label><input type="number" id="imPjConv" step="0.01" placeholder="0"></div>
        <div class="field"><label>Outros descontos (R$)</label><input type="number" id="imPjOutros" step="0.01" placeholder="0"></div>
      </div>
      <div id="imPjResult" class="clt-result"></div>
    </div>

    <div class="field-row">
      <div class="field"><label id="imValueLbl">Valor mensal líquido (R$)</label><input type="number" id="imValue" step="0.01"></div>
      <div class="field" id="imPaydayField"><label>Dia do pagamento</label><input type="number" id="imPayday" min="1" max="31" placeholder="Ex: 5"></div>
    </div>
    <div class="field" id="imEndField" style="display:none;"><label>Válida até</label><input type="date" id="imEnd"></div>
    <div class="field"><label>Conta de recebimento (opcional)</label>
      <select id="imAccount"><option value="">Não vincular a uma conta</option></select>
    </div>
    <div class="footnote" style="margin-bottom:6px;">CLT/PJ calculam uma estimativa do líquido. Se um mês vier diferente (bônus, hora extra, desconto), ajuste o valor mensal na mão.</div>
    <div class="modal-actions">
      <button class="btn-ghost" id="imDelete" style="display:none;margin-right:auto;color:var(--brick);border-color:var(--brick);">Excluir</button>
      <button class="btn-ghost" id="imCancel">Cancelar</button>
      <button class="btn-primary" id="imSave">Salvar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="expenseModalOverlay">
  <div class="modal">
    <h3 id="expenseModalTitle">Nova despesa</h3>
    <div class="field"><label>Nome</label><input type="text" id="emLabel" placeholder="Ex: Financiamento do apê"></div>
    <div class="field-row">
      <div class="field"><label>Valor mensal (R$)</label><input type="number" id="emValue" step="0.01"></div>
      <div class="field"><label>Dia do gasto</label><input type="date" id="emDate"></div>
    </div>
    <div class="field"><label>Horário do gasto</label><input type="time" id="emTime"></div>
    <div class="field" style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" id="emRecorrente" style="width:auto;">
      <label style="margin:0;text-transform:none;font-family:'Archivo',sans-serif;font-size:13px;color:var(--text);">Repete todo mês (mesmo dia)</label>
    </div>
    <div class="field">
      <label>Movimentar conta (opcional)</label>
      <select id="emAccount"><option value="">Não movimentar nenhuma conta</option></select>
      <div id="emAccountHint" style="font-size:11.5px;color:var(--text-3);margin-top:4px;">Conta: desconta do saldo · Cartão: soma na fatura. Indisponível pra despesa recorrente.</div>
    </div>
    <div class="field"><label>Categoria</label>
      <select id="emCategoria">
        <option value="moradia">Moradia</option>
        <option value="transporte">Transporte</option>
        <option value="alimentacao">Alimentação</option>
        <option value="lazer">Lazer</option>
        <option value="saude">Saúde</option>
        <option value="educacao">Educação</option>
        <option value="assinaturas">Assinaturas</option>
        <option value="financiamento">Financiamento</option>
        <option value="outros">Outros</option>
      </select>
    </div>
    <div class="field">
      <label>Forma de pagamento</label>
      <input type="hidden" id="emMethod">
      <div class="methodpicker" id="emMethodPicker"></div>
    </div>
    <div class="field">
      <label>Banco</label>
      <input type="hidden" id="emBank">
      <div class="bankpicker" id="emBankPicker"></div>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="emDelete" style="display:none;margin-right:auto;color:var(--brick);border-color:var(--brick);">Excluir</button>
      <button class="btn-ghost" id="emCancel">Cancelar</button>
      <button class="btn-primary" id="emSave">Salvar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="accountDetailOverlay">
  <div class="modal" style="max-width:520px;">
    <div id="adHeader"></div>
    <div id="adBody" style="max-height:52vh;overflow-y:auto;margin-top:12px;"></div>
    <div class="modal-actions">
      <button class="btn-ghost" id="adClose">Fechar</button>
      <button class="btn-primary" id="adEdit">Editar conta</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="transferModalOverlay">
  <div class="modal">
    <h3>Transferência</h3>
    <p style="font-size:12.5px;color:var(--text-2);margin:0 0 12px;">Move saldo entre contas, ou paga a fatura de um cartão com uma conta. Ajusta os saldos e aparece nos dois extratos.</p>
    <div class="field"><label>De (conta)</label><select id="trFrom"></select></div>
    <div class="field"><label>Para (conta ou cartão)</label><select id="trTo"></select></div>
    <div class="field-row">
      <div class="field"><label>Valor (R$)</label><input type="number" id="trValue" step="0.01"></div>
      <div class="field"><label>Data</label><input type="date" id="trDate"></div>
    </div>
    <div id="trHint" style="font-size:11.5px;color:var(--text-3);margin-bottom:6px;"></div>
    <div class="modal-actions">
      <button class="btn-ghost" id="trCancel">Cancelar</button>
      <button class="btn-primary" id="trSave">Transferir</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="vaultModalOverlay">
  <div class="modal">
    <h3 id="vaultModalTitle">Novo cofrinho</h3>
    <div class="field"><label>Nome</label><input type="text" id="vkName" placeholder="Ex: Viagem, Reserva de emergência"></div>
    <div class="field"><label>Meta (R$, opcional)</label><input type="number" id="vkGoal" step="0.01" placeholder="0"></div>
    <div class="modal-actions">
      <button class="btn-ghost" id="vkDelete" style="display:none;margin-right:auto;color:var(--brick);border-color:var(--brick);">Excluir</button>
      <button class="btn-ghost" id="vkCancel">Cancelar</button>
      <button class="btn-primary" id="vkSave">Salvar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="vaultMoveOverlay">
  <div class="modal">
    <h3 id="vaultMoveTitle">Guardar no cofrinho</h3>
    <div id="vaultMoveInfo" style="font-size:12px;color:var(--text-2);margin:0 0 12px;"></div>
    <div class="field"><label>Valor (R$)</label><input type="number" id="vmValue" step="0.01"></div>
    <div class="modal-actions">
      <button class="btn-ghost" id="vmCancel">Cancelar</button>
      <button class="btn-primary" id="vmSave">Confirmar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="accountModalOverlay">
  <div class="modal">
    <h3 id="accountModalTitle">Nova conta</h3>
    <div class="field"><label>Apelido</label><input type="text" id="acLabel" placeholder="Ex: Conta corrente ou Cartão Nubank"></div>
    <div class="field"><label>Tipo</label>
      <input type="hidden" id="acTipo" value="conta">
      <div class="tipopicker">
        <div class="tipo-group">
          <div class="tipo-glabel">Conta</div>
          <div class="tipo-opts">
            <button type="button" class="tipo-card active" data-tipo="conta"><span class="ti">🏦</span>Conta corrente</button>
            <button type="button" class="tipo-card" data-tipo="poupanca"><span class="ti">🐖</span>Poupança</button>
          </div>
        </div>
        <div class="tipo-group">
          <div class="tipo-glabel">Crédito</div>
          <div class="tipo-opts">
            <button type="button" class="tipo-card" data-tipo="cartao"><span class="ti">💳</span>Cartão de crédito</button>
          </div>
        </div>
      </div>
    </div>
    <div class="field-row" id="acContaFields">
      <div class="field"><label>Saldo atual (R$)</label><input type="number" id="acSaldo" step="0.01"></div>
      <div class="field" id="acChequeField"><label>Limite cheque especial (R$)</label><input type="number" id="acChequeEspecial" step="0.01" placeholder="0"></div>
    </div>
    <div class="field-row" id="acCartaoFields" style="display:none;">
      <div class="field"><label>Limite total (R$)</label><input type="number" id="acLimite" step="0.01"></div>
      <div class="field"><label>Fatura atual (R$)</label><input type="number" id="acFatura" step="0.01"></div>
    </div>
    <div class="field-row" id="acFaturaDias" style="display:none;">
      <div class="field"><label>Dia de fechamento</label><input type="number" id="acFechamento" min="1" max="31" placeholder="Ex: 28"></div>
      <div class="field"><label>Dia de vencimento</label><input type="number" id="acVencimento" min="1" max="31" placeholder="Ex: 8"></div>
    </div>
    <button class="btn-ghost" id="acPayFatura" style="display:none;width:100%;margin-bottom:14px;">Pagar fatura (zera e registra a saída)</button>
    <div class="field">
      <label>Banco</label>
      <input type="hidden" id="acBank">
      <div class="bankpicker" id="acBankPicker"></div>
    </div>
    <div class="field" style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" id="acPrincipal" style="width:auto;">
      <label style="margin:0;text-transform:none;font-family:'Archivo',sans-serif;font-size:13px;color:var(--text);">Esta é minha conta principal</label>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="acDelete" style="display:none;margin-right:auto;color:var(--brick);border-color:var(--brick);">Excluir</button>
      <button class="btn-ghost" id="acCancel">Cancelar</button>
      <button class="btn-primary" id="acSave">Salvar</button>
    </div>
  </div>
</div>

<div id="fabMenu">
  <button class="fab-item" data-fab="expense"><span class="fab-ic">💸</span>Nova despesa</button>
  <button class="fab-item" data-fab="income"><span class="fab-ic">💰</span>Nova renda</button>
  <button class="fab-item" data-fab="account"><span class="fab-ic">🏦</span>Nova conta</button>
  <button class="fab-item" data-fab="task"><span class="fab-ic">✓</span>Nova tarefa</button>
</div>
<button id="fabNew" title="Criar">+</button>

<div class="modal-overlay" id="goalsModalOverlay">
  <div class="modal">
    <h3>Metas de gasto por categoria</h3>
    <p style="font-size:12.5px;color:var(--text-2);margin:0 0 14px;">Defina um limite mensal por categoria. Deixe em branco as que não quer acompanhar. Crie categorias próprias com o botão abaixo — elas também aparecem no cadastro de despesa.</p>
    <div id="goalsInputs"></div>
    <button class="btn-ghost" id="goalsAddCat" style="width:100%;margin-top:4px;">+ Adicionar categoria personalizada</button>
    <div class="modal-actions">
      <button class="btn-ghost" id="goalsCancel">Cancelar</button>
      <button class="btn-primary" id="goalsSave">Salvar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="ofxModalOverlay">
  <div class="modal" style="max-width:520px;">
    <h3>Importar extrato</h3>
    <p style="font-size:12.5px;color:var(--text-2);margin:0 0 12px;">Revise os lançamentos do extrato. Desmarque os que não quer importar. Os prováveis já lançados vêm marcados como duplicados e desmarcados.</p>
    <div id="ofxSummary" style="font-size:12px;color:var(--text-3);margin-bottom:8px;"></div>
    <div id="ofxRows" style="max-height:46vh;overflow-y:auto;"></div>
    <div class="modal-actions">
      <button class="btn-ghost" id="ofxCancel">Cancelar</button>
      <button class="btn-primary" id="ofxConfirm">Importar selecionados</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="bankChooserOverlay">
  <div class="modal" style="max-width:460px;">
    <h3>Escolher banco</h3>
    <p style="font-size:12px;color:var(--text-2);margin:0 0 10px;">Toque pra selecionar. A estrela fixa o banco nos favoritos (até 11) que aparecem no atalho rápido.</p>
    <input type="search" id="bankSearch" placeholder="Buscar banco..." style="width:100%;margin-bottom:10px;">
    <div id="bankChooserList" style="max-height:52vh;overflow-y:auto;"></div>
    <div class="modal-actions">
      <button class="btn-ghost" id="bankChooserClose">Fechar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="irModalOverlay">
  <div class="modal" style="max-width:680px;">
    <div class="ir-noprint">
      <h3>Relatório anual (Imposto de Renda)</h3>
      <p style="font-size:12.5px;color:var(--text-2);margin:0 0 12px;">Resumo de rendas, despesas por categoria e saldo mês a mês do ano escolhido, mais o retrato atual das contas. Use “Salvar como PDF” na janela de impressão.</p>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;">
        <label style="font-size:12.5px;color:var(--text-2);">Ano</label>
        <select id="irYear" style="min-width:120px;"></select>
      </div>
    </div>
    <div id="irPrintArea"></div>
    <div class="modal-actions ir-noprint">
      <button class="btn-ghost" id="irCancel">Fechar</button>
      <button class="btn-primary" id="irPrint">Imprimir / Salvar PDF</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="genModalOverlay">
  <div class="modal">
    <h3>Gerar treino automático</h3>
    <p style="font-size:12.5px;color:var(--text-2);margin:0 0 14px;">Responda 3 coisas e o Orby monta uma divisão de treino com exercícios e séries×reps adequados ao seu objetivo.</p>
    <div class="field"><label>Quantos dias por semana você treina?</label>
      <select id="genDays">
        <option value="2">2 dias</option>
        <option value="3" selected>3 dias</option>
        <option value="4">4 dias</option>
        <option value="5">5 dias</option>
        <option value="6">6 dias</option>
      </select>
    </div>
    <div class="field"><label>Objetivo</label>
      <select id="genGoal">
        <option value="hipertrofia" selected>Hipertrofia (ganhar músculo)</option>
        <option value="forca">Força</option>
        <option value="definicao">Definição</option>
        <option value="resistencia">Resistência</option>
      </select>
    </div>
    <div class="field"><label>Nível</label>
      <select id="genLevel">
        <option value="iniciante">Iniciante</option>
        <option value="intermediario" selected>Intermediário</option>
        <option value="avancado">Avançado</option>
      </select>
    </div>
    <div id="genPreview"></div>
    <div class="modal-actions">
      <button class="btn-ghost" id="genCancel">Cancelar</button>
      <button class="btn-primary" id="genConfirm">Gerar e adicionar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="measureModalOverlay">
  <div class="modal">
    <h3 id="measureModalTitle">Registrar medidas</h3>
    <div class="field-row">
      <div class="field"><label>Data</label><input type="date" id="meDate"></div>
      <div class="field"><label>Peso (kg)</label><input type="number" id="meWeight" step="0.1" min="0" placeholder="ex: 78.5"></div>
    </div>
    <div class="field"><label>Altura (cm) — usada no IMC</label><input type="number" id="meHeight" step="0.5" min="0" placeholder="ex: 178"></div>
    <div class="field-row">
      <div class="field"><label>Peito (cm)</label><input type="number" id="meChest" step="0.5" min="0"></div>
      <div class="field"><label>Cintura (cm)</label><input type="number" id="meWaist" step="0.5" min="0"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Quadril (cm)</label><input type="number" id="meHip" step="0.5" min="0"></div>
      <div class="field"><label>Braço (cm)</label><input type="number" id="meArm" step="0.5" min="0"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Coxa (cm)</label><input type="number" id="meThigh" step="0.5" min="0"></div>
      <div class="field"><label>Panturrilha (cm)</label><input type="number" id="meCalf" step="0.5" min="0"></div>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="meDelete" style="display:none;margin-right:auto;color:var(--brick);border-color:var(--brick);">Excluir</button>
      <button class="btn-ghost" id="meCancel">Cancelar</button>
      <button class="btn-primary" id="meSave">Salvar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="workoutModalOverlay">
  <div class="modal">
    <h3 id="workoutModalTitle">Novo treino</h3>
    <div class="field"><label>Nome do treino</label><input type="text" id="woName" placeholder="Ex: Peito e Tríceps"></div>
    <div class="field">
      <label>Exercícios</label>
      <div id="woExercises"></div>
      <button type="button" class="btn-ghost" id="woAddEx" style="width:100%;margin-top:2px;">+ Adicionar exercício</button>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="woDelete" style="display:none;margin-right:auto;color:var(--brick);border-color:var(--brick);">Excluir</button>
      <button class="btn-ghost" id="woCancel">Cancelar</button>
      <button class="btn-primary" id="woSave">Salvar</button>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="assets/qrcode.min.js"></script>
<script src="assets/app.js?v=<?= @filemtime(__DIR__.'/assets/app.js') ?>"></script>
</body>
</html>
