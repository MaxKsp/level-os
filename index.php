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
<style>
  :root{
    --bg:#050507; --surface:#131318; --surface-2:#1B1B22; --surface-3:#24242D;
    --line:rgba(255,255,255,.07); --line-strong:rgba(255,255,255,.13);
    --accent:#4F8DF9; --accent-2:#8B5CF6; --accent-soft:rgba(79,141,249,.12);
    --grad:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);
    --glow:rgba(79,141,249,.35);
    --sage:#4FB07A; --brick:#E15C56;
    --purple:#9C7CE0; --tan:#8A93A6;
    --text:#F4F4F6; --text-2:#9A9AA4; --text-3:#5C5C66;
    --r:16px; --r-sm:10px;
    --shadow-card:0 1px 0 rgba(255,255,255,.04) inset, 0 8px 24px rgba(0,0,0,.35);
    --shadow-pop:0 12px 40px rgba(0,0,0,.5);
    --aurora-a:rgba(79,141,249,.10); --aurora-b:rgba(139,92,246,.08);
  }
  [data-theme="violeta"]{ --accent:#8B5CF6; --accent-2:#D946EF; --accent-soft:rgba(139,92,246,.12); --glow:rgba(139,92,246,.35); --aurora-a:rgba(139,92,246,.10); --aurora-b:rgba(217,70,239,.07); }
  [data-theme="verde"]{ --accent:#10B981; --accent-2:#4F8DF9; --accent-soft:rgba(16,185,129,.12); --glow:rgba(16,185,129,.35); --aurora-a:rgba(16,185,129,.09); --aurora-b:rgba(79,141,249,.07); }
  [data-theme="ambar"]{ --accent:#F59E0B; --accent-2:#EF4444; --accent-soft:rgba(245,158,11,.12); --glow:rgba(245,158,11,.32); --aurora-a:rgba(245,158,11,.08); --aurora-b:rgba(239,68,68,.06); }
  [data-theme="rosa"]{ --accent:#EC4899; --accent-2:#8B5CF6; --accent-soft:rgba(236,72,153,.12); --glow:rgba(236,72,153,.35); --aurora-a:rgba(236,72,153,.09); --aurora-b:rgba(139,92,246,.07); }
  [data-bg="preto"]{ --bg:#000000; --surface:#101013; --surface-2:#17171C; --surface-3:#202027; }
  [data-bg="claro"]{
    --bg:#F2F3F7; --surface:#FFFFFF; --surface-2:#EDEFF4; --surface-3:#DFE3EB;
    --line:rgba(15,18,30,.09); --line-strong:rgba(15,18,30,.16);
    --text:#171821; --text-2:#5A5E6D; --text-3:#9AA0AF;
    --shadow-card:0 1px 2px rgba(18,22,40,.06), 0 8px 24px rgba(18,22,40,.07);
    --shadow-pop:0 12px 40px rgba(18,22,40,.18);
    --aurora-a:rgba(79,141,249,.07); --aurora-b:rgba(139,92,246,.06);
  }
  *{box-sizing:border-box;}
  html{scrollbar-color:var(--surface-3) transparent;}
  body{
    margin:0;color:var(--text);font-family:'Archivo',sans-serif;-webkit-font-smoothing:antialiased;font-size:14px;padding-bottom:74px;
    background:
      radial-gradient(900px 480px at 85% -10%, var(--aurora-b), transparent 60%),
      radial-gradient(1100px 560px at -10% -5%, var(--aurora-a), transparent 55%),
      var(--bg);
    background-attachment:fixed;
    min-height:100vh;
  }
  ::selection{background:var(--accent);color:#fff;}
  ::-webkit-scrollbar{width:10px;height:10px;}
  ::-webkit-scrollbar-thumb{background:var(--surface-3);border-radius:99px;border:2px solid transparent;background-clip:content-box;}
  ::-webkit-scrollbar-track{background:transparent;}
  .mono{font-family:'IBM Plex Mono',monospace;}
  .wrap{max-width:900px;margin:0 auto;padding:0 18px;}

  /* topo */
  .topbar{
    display:flex;justify-content:space-between;align-items:center;padding:12px 0;
    position:sticky;top:0;z-index:40;margin:0 -18px;padding-left:18px;padding-right:18px;
    background:color-mix(in srgb, var(--bg) 72%, transparent);
    backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
    border-bottom:1px solid var(--line);
  }
  .brand{display:flex;align-items:center;gap:9px;}
  .orbymark{width:32px;height:32px;flex-shrink:0;filter:drop-shadow(0 2px 10px var(--glow));}
  .wordmark{font-family:'Archivo',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.02em;color:var(--text);white-space:nowrap;}
  .sectiontabs{display:flex;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:3px;}
  .sectiontab{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--text-3);cursor:pointer;background:transparent;transition:color .15s,background .15s,transform .12s;}
  .sectiontab:hover{color:var(--text-2);}
  .sectiontab:active{transform:scale(.92);}
  .sectiontab svg{width:18px;height:18px;}
  .sectiontab.active{background:var(--grad);color:#fff;box-shadow:0 2px 10px var(--glow);}
  .sectiontab .tab-avatar{width:26px;height:26px;border-radius:50%;object-fit:cover;display:block;}
  .sectiontab.active .tab-avatar{box-shadow:0 0 0 2px #fff;}
  .topbar-actions{display:flex;align-items:center;gap:10px;margin-left:10px;}
  .icon-btn{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--text-3);cursor:pointer;background:transparent;border:none;transition:color .15s,background .15s;}
  .icon-btn svg{width:18px;height:18px;}
  .icon-btn:hover{background:var(--surface-2);color:var(--text);}

  .page{display:none;}
  .page.active{display:block;animation:pageIn .18s ease-out;}
  @keyframes pageIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}

  /* instrumento agora */
  .instrument{border:1px solid var(--line);margin-top:18px;margin-bottom:18px;border-radius:var(--r);background:var(--surface);overflow:hidden;position:relative;box-shadow:var(--shadow-card);}
  .instrument::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--grad);opacity:.85;}
  .instrument-head{padding:10px 16px;border-bottom:1px solid var(--line);}
  .instrument-head .eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--text-3);text-transform:uppercase;}
  .instrument-body{padding:16px;}
  .now-title{font-size:17px;font-weight:600;margin:0 0 14px;}
  .readouts{display:flex;}
  .readout{flex:1;padding:0 16px 2px;border-left:1px solid var(--line);}
  .readout:first-child{border-left:none;padding-left:0;}
  .readout .rv{font-family:'IBM Plex Mono',monospace;font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--accent);}
  .readout .rv.sage{color:var(--sage);}
  .readout .rl{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;margin-top:3px;}
  .instrument.alarm{box-shadow:0 0 0 1px var(--accent), 0 0 24px var(--glow);}

  /* cabecalho agenda */
  .agenda-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
  .agenda-title-wrap{display:flex;align-items:center;gap:10px;}
  .agenda-title{font-size:26px;font-weight:700;text-transform:capitalize;}
  .agenda-sub{font-size:12px;color:var(--accent);font-family:'IBM Plex Mono',monospace;}
  .agenda-actions{display:flex;gap:8px;align-items:center;}
  .iconbtn{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--text-2);display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .iconbtn svg{width:16px;height:16px;}
  .iconbtn:hover{border-color:var(--accent);color:var(--accent);}
  .addbtn{width:34px;height:34px;border-radius:50%;border:none;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;line-height:1;box-shadow:0 3px 12px var(--glow);transition:transform .12s,filter .15s;}
  .addbtn:hover{filter:brightness(1.1);}
  .addbtn:active{transform:scale(.92);}

  /* grade mes */
  .monthgrid-heads{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;}
  .monthgrid-heads div{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text-3);letter-spacing:.04em;}
  .monthgrid-rows{display:grid;grid-template-columns:repeat(7,1fr);row-gap:2px;margin-bottom:18px;}
  .mcell{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;position:relative;border-radius:50%;margin:0 auto;width:38px;height:38px;}
  .mcell .dnum{font-size:14px;color:var(--text);}
  .mcell.outmonth .dnum{color:var(--text-3);opacity:.4;}
  .mcell.weekend .dnum{color:var(--accent);}
  .mcell.selected{background:var(--accent);}
  .mcell.selected .dnum{color:#fff;font-weight:700;}
  .mcell .dot{width:4px;height:4px;border-radius:50%;background:var(--text-3);margin-top:2px;}
  .mcell.selected .dot{background:#fff;}
  .mcell.today:not(.selected){border:1px solid var(--accent);}

  /* faixa semana */
  .weekstrip{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:18px;}
  .wcell{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;padding:8px 0;border-radius:var(--r-sm);}
  .wcell .wn{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--text-3);letter-spacing:.04em;}
  .wcell .wd{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;}
  .wcell.selected .wd{background:var(--accent);color:#fff;font-weight:700;}
  .wcell.today:not(.selected) .wd{border:1px solid var(--accent);}
  .wcell .dot{width:4px;height:4px;border-radius:50%;background:var(--text-3);}
  .wcell.selected .dot{background:var(--accent);}

  /* ano */
  .yeargrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px;}
  .miniMonth{cursor:default;}
  .miniMonth .mm-title{font-size:13px;font-weight:700;margin-bottom:6px;}
  .miniMonth .mm-heads{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:2px;}
  .miniMonth .mm-heads div{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--text-3);}
  .miniMonth .mm-days{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;}
  .mm-day{text-align:center;font-size:10px;padding:3px 0;color:var(--text-2);cursor:pointer;border-radius:50%;}
  .mm-day.outmonth{color:var(--text-3);opacity:.3;}
  .mm-day.weekend{color:var(--accent);}
  .mm-day.today:not(.selected){box-shadow:inset 0 0 0 1.5px var(--accent);color:var(--accent);font-weight:700;}
  .mm-day.selected{background:var(--accent);color:#fff;font-weight:700;}
  @media (max-width:760px){ .yeargrid{grid-template-columns:repeat(2,1fr);} }

  /* lista de agenda (cards) */
  .agenda-label{font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;margin:4px 0 10px;font-family:'IBM Plex Mono',monospace;}
  .taskcard{display:flex;align-items:center;gap:12px;background:var(--surface);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:8px;cursor:pointer;}
  .taskcard .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
  .taskcard .info{flex:1;min-width:0;}
  .taskcard .ttl{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .taskcard .tm{font-size:12px;color:var(--text-2);font-family:'IBM Plex Mono',monospace;margin-top:2px;}
  .taskcard.done{opacity:.42;}
  .taskcard.done .ttl{text-decoration:line-through;}
  .taskcard .del{background:none;border:none;color:var(--text-3);font-size:15px;cursor:pointer;padding:4px;flex-shrink:0;}
  .taskcard .del:hover{color:var(--brick);}

  .cat-treino .dot{background:var(--accent);} .cat-trabalho .dot{background:#6C93F5;} .cat-estudo .dot{background:var(--purple);}
  .cat-ifood .dot{background:var(--sage);} .cat-descanso .dot{background:var(--text-3);} .cat-deslocamento .dot{background:var(--tan);}


  .fin-subnav, .agenda-subnav{display:flex;gap:0;border:1px solid var(--line);border-radius:999px;width:fit-content;margin-bottom:20px;overflow:hidden;}
  .fsub, .apill{padding:7px 16px;font-size:12px;color:var(--text-2);cursor:pointer;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.04em;transition:color .15s,background .15s;}
  .fsub:hover, .apill:hover{color:var(--text);}
  .fsub.active, .apill.active{background:var(--grad);color:#fff;box-shadow:0 2px 10px var(--glow);}
  .apage{display:none;} .apage.active{display:block;}
  .fpage{display:none;} .fpage.active{display:block;}
  .fpage-head{display:flex;justify-content:space-between;align-items:center;margin:26px 0 12px;}
  .fpage-head h2{margin:0;}
  .addbtn-sm{width:28px;height:28px;border-radius:50%;border:none;background:var(--accent);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
  .addbtn-sm:hover{background:#5B93F7;}

  .grouplabel{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;margin:14px 0 8px;font-family:'IBM Plex Mono',monospace;}
  .grouplabel:first-child{margin-top:0;}

  .addcard{background:var(--surface);border-radius:var(--r-sm);padding:12px;margin-bottom:20px;}
  .badge{font-size:9px;padding:3px 7px;border-radius:999px;background:var(--surface-2);color:var(--text-2);text-transform:uppercase;letter-spacing:.04em;font-family:'IBM Plex Mono',monospace;display:inline-block;}
  .badge.b-fixa{background:#12233F;color:#7BA6F5;}
  .badge.b-variavel{background:#2A1F40;color:var(--purple);}
  .badge.b-temporaria{background:#3A2810;color:#E0A24F;}
  .badge.b-extra{background:#123321;color:var(--sage);}

  .inccard{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:background .15s,border-color .15s,transform .12s;}
  .inccard:hover{background:var(--surface-2);border-color:var(--line-strong);transform:translateY(-1px);}
  .inccard .typedot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
  .inccard .typedot.b-fixa{background:#7BA6F5;} .inccard .typedot.b-variavel{background:var(--purple);}
  .inccard .typedot.b-temporaria{background:#E0A24F;} .inccard .typedot.b-extra{background:var(--sage);}
  .inccard .info{flex:1;min-width:0;}
  .inccard .ttl{font-size:14px;font-weight:500;}
  .inccard .sub{font-size:10.5px;color:var(--text-3);margin-top:3px;font-family:'IBM Plex Mono',monospace;}
  .inccard .sub.expired{color:var(--brick);}
  .inccard .val{font-family:'IBM Plex Mono',monospace;font-size:14px;font-variant-numeric:tabular-nums;color:var(--sage);}
  .inccard.inactive{opacity:.4;}

  .expcard{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:background .15s,border-color .15s,transform .12s;}
  .expcard:hover{background:var(--surface-2);border-color:var(--line-strong);transform:translateY(-1px);}
  .bankavatar{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;font-family:'IBM Plex Mono',monospace;overflow:hidden;position:relative;}
  .bankavatar img{width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box;background:#fff;border-radius:8px;}
  .bankavatar .fallback-initials{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:8px;}
  .expcard .info{flex:1;min-width:0;}
  .expcard .ttl{font-size:14px;font-weight:500;}
  .expcard .metarow{display:flex;gap:6px;margin-top:4px;}
  .expcard .val{font-family:'IBM Plex Mono',monospace;font-size:14px;font-variant-numeric:tabular-nums;color:var(--brick);}
  .expcard .datebadge, .inccard .datebadge{font-size:10px;color:var(--text-3);font-family:'IBM Plex Mono',monospace;}
  .acccard{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:background .15s,border-color .15s,transform .12s;}
  .acccard:hover{background:var(--surface-2);border-color:var(--line-strong);transform:translateY(-1px);}
  .acccard .info{flex:1;min-width:0;}
  .acccard .ttl{font-size:14px;font-weight:500;display:flex;align-items:center;gap:6px;}
  .acccard .sub{font-size:10.5px;color:var(--text-3);margin-top:3px;font-family:'IBM Plex Mono',monospace;}
  .acccard .val{font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--sage);}
  .badge.b-principal{background:#12233F;color:#7BA6F5;}

  .barlist-row{margin-bottom:12px;}
  .barlist-row .blrow-top{display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;}
  .barlist-row .blrow-top .lbl{display:flex;align-items:center;gap:6px;}
  .barlist-row .blrow-top .val{font-family:'IBM Plex Mono',monospace;color:var(--text-2);}
  .barlist-track{height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden;}
  .barlist-fill{height:100%;border-radius:3px;}

  .dashgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch;}
  .dashcard{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px;min-width:0;overflow:hidden;box-sizing:border-box;box-shadow:var(--shadow-card);transition:border-color .15s;}
  .dashcard:hover{border-color:var(--line-strong);}
  .dashcard-title{font-size:15px;font-weight:600;color:var(--text);}
  .dashcard-sub{font-size:12px;color:var(--text-3);margin-top:3px;margin-bottom:14px;}
  .heatgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;width:100%;box-sizing:border-box;}
  .heat-head{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--text-3);}
  .heatcell{aspect-ratio:1;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-3);position:relative;}
  .heatcell.outmonth{opacity:.25;}
  .heatcell.today{box-shadow:inset 0 0 0 1.5px var(--accent);}
  .dashcanvas-wrap{position:relative;height:220px;width:100%;box-sizing:border-box;}
  .dashempty{height:220px;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:12px;font-family:'IBM Plex Mono',monospace;text-align:center;padding:0 20px;}
  @media (max-width:720px){ .dashgrid{grid-template-columns:1fr;} }

  .bankpicker{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-height:190px;overflow-y:auto;padding:2px;}
  .bankpick-item{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 4px;border-radius:10px;cursor:pointer;border:1px solid transparent;background:var(--surface-2);}
  .bankpick-item:hover{background:var(--surface-3);}
  .bankpick-item.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);}
  .bankpick-item .bankavatar{width:28px;height:28px;pointer-events:none;}
  .bankpick-item .bpname{font-size:8.5px;color:var(--text-2);text-align:center;line-height:1.15;pointer-events:none;}

  .methodpicker{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
  .methodpick-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border-radius:10px;cursor:pointer;border:1px solid transparent;background:var(--surface-2);}
  .methodpick-item:hover{background:var(--surface-3);}
  .methodpick-item.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);background:var(--accent-soft);}
  .methodpick-item svg{width:20px;height:20px;color:var(--text-2);pointer-events:none;}
  .methodpick-item.selected svg{color:var(--accent-text);}
  .methodpick-item .mpname{font-size:10px;color:var(--text-2);pointer-events:none;}
  .methodpick-item.selected .mpname{color:var(--text);}

  .movecard{display:flex;align-items:center;gap:10px;background:var(--surface);border-radius:var(--r-sm);padding:10px 14px;margin-bottom:6px;}
  .movecard .dot{width:6px;height:6px;border-radius:50%;background:var(--sage);flex-shrink:0;}
  .movecard .d{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-3);width:56px;}
  .movecard .lbl{flex:1;font-size:13px;}
  .movecard .val{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--sage);}

  h2{font-size:12px;font-weight:600;margin:26px 0 12px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-2);}
  .form-row{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
  input,select{
    background:var(--surface-2);border:1px solid var(--line-strong);color:var(--text);
    padding:11px 12px;font-size:13.5px;font-family:'Archivo',sans-serif;border-radius:12px;
    transition:border-color .15s,box-shadow .15s,background .15s;
  }
  input:hover,select:hover{border-color:var(--accent);}
  input:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
  input::placeholder{color:var(--text-3);}
  select{
    appearance:none; -webkit-appearance:none; -moz-appearance:none;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238891A3' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat:no-repeat; background-position:right 12px center; background-size:15px;
    padding-right:36px; cursor:pointer;
  }
  select option{background:var(--surface);color:var(--text);}
  input[type=date], input[type=time]{color-scheme:dark;font-family:'IBM Plex Mono',monospace;cursor:pointer;}
  [data-bg="claro"] input[type=date], [data-bg="claro"] input[type=time]{color-scheme:light;}
  /* sem setinhas nativas no campo numérico */
  input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
  input[type=number]{-moz-appearance:textfield;appearance:textfield;}
  /* icone nativo do date/time some — os pickers são do Orby */
  input[type=date]::-webkit-calendar-picker-indicator, input[type=time]::-webkit-calendar-picker-indicator{display:none;}
  input[type=date], input[type=time]{cursor:pointer;}

  /* pickers do Orby (select, calendário, hora) */
  .pickbtn{
    width:100%;text-align:left;background:var(--surface-2);border:1px solid var(--line-strong);
    border-radius:12px;padding:11px 36px 11px 12px;color:var(--text);font-size:13.5px;
    font-family:'Archivo',sans-serif;cursor:pointer;transition:border-color .15s,box-shadow .15s;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238891A3' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat:no-repeat;background-position:right 12px center;background-size:15px;
  }
  .pickbtn:hover{border-color:var(--accent);}
  .pickbtn:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
  .pickbtn:disabled{opacity:.45;cursor:not-allowed;}
  .orby-pop{
    position:fixed;z-index:300;background:var(--surface-2);border:1px solid var(--line-strong);
    border-radius:14px;box-shadow:var(--shadow-pop);animation:pageIn .13s ease-out;overflow:hidden;
  }
  .pop-list{max-height:250px;overflow-y:auto;padding:6px;}
  .pop-opt{padding:10px 12px;font-size:13.5px;cursor:pointer;color:var(--text);border-radius:9px;}
  .pop-opt:hover{background:var(--surface-3);}
  .pop-opt.sel{background:var(--accent-soft);color:var(--accent);font-weight:600;}
  .cal-wrap{padding:12px;width:272px;}
  .cal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
  .cal-title{font-weight:600;font-size:13.5px;text-transform:capitalize;color:var(--text);}
  .cal-nav{display:flex;gap:5px;}
  .cal-nav button{width:28px;height:28px;border-radius:50%;border:1px solid var(--line-strong);background:transparent;color:var(--text-2);cursor:pointer;font-size:13px;line-height:1;}
  .cal-nav button:hover{border-color:var(--accent);color:var(--accent);}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
  .cal-dh{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--text-3);padding:3px 0;}
  .cal-d{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:12.5px;border-radius:50%;cursor:pointer;color:var(--text);}
  .cal-d:hover{background:var(--surface-3);}
  .cal-d.out{color:var(--text-3);opacity:.4;}
  .cal-d.today:not(.sel){box-shadow:inset 0 0 0 1.5px var(--accent);color:var(--accent);}
  .cal-d.sel{background:var(--grad);color:#fff;font-weight:700;}
  .cal-foot{display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid var(--line);}
  .cal-foot button{background:none;border:none;color:var(--accent);font-size:12.5px;cursor:pointer;font-weight:600;font-family:'Archivo',sans-serif;}
  .time-wrap{display:flex;gap:6px;padding:10px;width:190px;}
  .time-col{flex:1;max-height:216px;overflow-y:auto;scrollbar-width:thin;}
  .time-col .pop-opt{text-align:center;font-family:'IBM Plex Mono',monospace;padding:8px 0;}
  .time-foot{padding:0 10px 10px;text-align:center;}
  .time-foot button{background:none;border:none;color:var(--accent);font-size:12.5px;cursor:pointer;font-weight:600;font-family:'Archivo',sans-serif;}

  input[type=search]{
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238891A3' stroke-width='2'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/></svg>");
    background-repeat:no-repeat; background-position:left 12px center; background-size:15px;
    padding-left:36px;
  }
  input[type=date]::-webkit-calendar-picker-indicator, input[type=time]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer;}
  input::placeholder{color:var(--text-3);}
  button.action{background:transparent;border:1px solid var(--accent);color:var(--accent);padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.05em;border-radius:999px;}
  button.action:hover{background:var(--accent);color:#fff;}

  .finhead .big{font-family:'IBM Plex Mono',monospace;font-size:32px;font-weight:600;font-variant-numeric:tabular-nums;}
  .finhead .big.sage{color:var(--sage);} .finhead .big.brick{color:var(--brick);}
  .finhead .lbl{font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;}
  .finrow3{display:flex;border:1px solid var(--line);margin:10px 0 24px;border-radius:var(--r);overflow:hidden;}
  .finrow3 .fc{flex:1;padding:14px 16px;border-left:1px solid var(--line);}
  .finrow3 .fc:first-child{border-left:none;}
  .finrow3 .fc .v{font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;}
  .finrow3 .fc .l{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;margin-top:4px;}
  .chart{display:flex;align-items:flex-end;gap:6px;height:100px;border-bottom:1px solid var(--line);padding:0 2px;margin-bottom:8px;}
  .chart .bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;}
  .chart .bar .fill{width:100%;background:#173321;border-top:2px solid var(--sage);min-height:2px;border-radius:3px 3px 0 0;}
  .chart .bar .fill.empty{background:var(--surface-2);border-top:2px solid var(--line);}
  .chartlabels{display:flex;gap:6px;margin-bottom:24px;}
  .chartlabels .cl{flex:1;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--text-3);text-transform:uppercase;}
  .ledger-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px;}
  .ledger-row .d{font-family:'IBM Plex Mono',monospace;color:var(--text-2);width:66px;font-variant-numeric:tabular-nums;}
  .ledger-row .lbl{flex:1;}
  .ledger-row .val{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;text-align:right;min-width:100px;}
  .ledger-row .val.sage{color:var(--sage);} .ledger-row .val.brick{color:var(--brick);}
  .ledger-row .km{color:var(--text-3);font-size:11px;width:60px;text-align:right;}
  .del{background:none;border:none;color:var(--text-3);cursor:pointer;font-size:14px;padding:2px 4px;}
  .del:hover{color:var(--brick);}
  .expline{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);}
  .expline input[type=text]{flex:1;background:transparent;border:none;border-bottom:1px dashed var(--line);color:var(--text);padding:4px 2px;font-size:13px;border-radius:0;}
  .expline input[type=number]{width:100px;background:transparent;border:none;border-bottom:1px dashed var(--line);color:var(--text);padding:4px 2px;text-align:right;font-family:'IBM Plex Mono',monospace;border-radius:0;}
  .expline input:focus{outline:none;border-bottom-color:var(--accent);}
  .todo-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);}
  .todo-row .txt{flex:1;font-size:14px;}
  .todo-row .txt.done{text-decoration:line-through;color:var(--text-3);}
  .checkbtn{width:20px;height:20px;border:1px solid var(--line);border-radius:50%;background:transparent;cursor:pointer;flex-shrink:0;color:var(--sage);display:flex;align-items:center;justify-content:center;font-size:12px;}
  .checkbtn.checked{background:var(--sage);border-color:var(--sage);color:#fff;}
  .empty{color:var(--text-3);font-size:12px;padding:18px 0;font-family:'IBM Plex Mono',monospace;}
  .footnote{font-size:11px;color:var(--text-3);margin-top:8px;line-height:1.6;}

  /* modal */
  .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:50;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}
  .modal-overlay.open{display:flex;}
  .modal{background:var(--surface);border:1px solid var(--line-strong);width:100%;max-width:420px;padding:24px;border-radius:18px;box-shadow:var(--shadow-pop);animation:pageIn .16s ease-out;max-height:calc(100vh - 40px);overflow-y:auto;margin:auto;}
  .modal h3{margin:0 0 18px;font-size:15px;font-weight:600;}
  .field{margin-bottom:14px;}
  .field label{display:block;font-size:11px;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-family:'IBM Plex Mono',monospace;}
  .field input, .field select{width:100%;}
  .field-row{display:flex;gap:10px;}
  .field-row .field{flex:1;}
  .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;}
  /* toasts */
  #toastBox{position:fixed;bottom:88px;left:50%;transform:translateX(-50%);z-index:200;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;width:max-content;max-width:92vw;}
  .toast{pointer-events:auto;background:var(--surface-3);color:var(--text);border:1px solid var(--line-strong);border-radius:12px;padding:11px 16px;font-size:13px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow-pop);animation:toastIn .2s ease-out;}
  .toast.err{border-color:rgba(225,92,86,.45);}
  .toast button{background:none;border:none;color:var(--accent);font-weight:700;cursor:pointer;font-size:13px;font-family:inherit;padding:0;}
  @keyframes toastIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}

  /* empty state com acao */
  .empty-cta{display:flex;flex-direction:column;align-items:center;gap:12px;padding:26px 16px;text-align:center;}

  /* FAB nova despesa */
  #fabNew{position:fixed;right:22px;bottom:22px;z-index:45;width:54px;height:54px;border-radius:50%;border:none;background:var(--grad);color:#fff;font-size:26px;line-height:1;cursor:pointer;box-shadow:0 6px 22px var(--glow);transition:transform .12s,filter .15s;}
  #fabNew:hover{filter:brightness(1.1);}
  #fabNew:active{transform:scale(.92);}

  /* navegacao no polegar em telas pequenas */
  @media (max-width:640px){
    /* backdrop-filter na topbar criaria um containing block e prenderia o
       position:fixed das tabs dentro dela — no mobile a topbar vira
       estática e a navegação mora na barra de baixo */
    .topbar{position:static;backdrop-filter:none;-webkit-backdrop-filter:none;background:transparent;border-bottom:none;}
    .sectiontabs{
      position:fixed;bottom:0;left:0;right:0;z-index:60;border-radius:0;border:none;border-top:1px solid var(--line);
      background:color-mix(in srgb, var(--bg) 82%, transparent);
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      justify-content:space-around;padding:9px 12px calc(9px + env(safe-area-inset-bottom));
    }
    .sectiontab{width:46px;height:46px;}
    .sectiontab svg{width:22px;height:22px;}
    .sectiontab .tab-avatar{width:30px;height:30px;}
    #fabNew{bottom:calc(78px + env(safe-area-inset-bottom));}
    #toastBox{bottom:calc(84px + env(safe-area-inset-bottom));}
  }

  /* metas por categoria */
  .goalrow{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:8px;}
  .goalrow .toprow{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
  .goalrow .cat{font-size:13.5px;font-weight:600;}
  .goalrow .nums{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text-2);font-variant-numeric:tabular-nums;}
  .goalbar{height:7px;border-radius:99px;background:var(--surface-3);overflow:hidden;}
  .goalbar > div{height:100%;border-radius:99px;background:var(--grad);transition:width .3s ease;}
  .goalrow.warn .goalbar > div{background:#F59E0B;}
  .goalrow.over .goalbar > div{background:var(--brick);}
  .goalrow.over .nums{color:var(--brick);font-weight:600;}
  .goalinput-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;}
  .goalinput-row label{font-size:13px;color:var(--text);margin:0;text-transform:none;font-family:'Archivo',sans-serif;letter-spacing:0;}
  .goalinput-row input{width:130px;text-align:right;font-family:'IBM Plex Mono',monospace;}

  /* perfil */
  .profilecard{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;margin-bottom:14px;box-shadow:var(--shadow-card);}
  .profilecard-title{font-size:15px;font-weight:600;margin-bottom:12px;}
  .profilecard-sub{font-family:'IBM Plex Mono',monospace;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--text-3);margin-bottom:8px;}
  .profile-account{display:flex;align-items:center;gap:14px;}
  .avatar{border:none;padding:0;cursor:pointer;overflow:hidden;position:relative;}
  .avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;}
  .avatar:hover::after{content:'✎';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);border-radius:50%;font-size:16px;color:#fff;}
  .avatarlink{background:none;border:none;padding:0;margin-top:4px;color:var(--accent);font-size:12px;cursor:pointer;font-family:'Archivo',sans-serif;}
  .avatarlink:hover{text-decoration:underline;}
  .avatar{width:48px;height:48px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:19px;color:#fff;box-shadow:0 4px 16px var(--glow);text-transform:uppercase;}
  .profile-account .ttl{font-size:16px;font-weight:600;}
  .profile-account .sub{font-size:12.5px;color:var(--text-2);margin-top:2px;}
  .themegrid{display:flex;gap:10px;}
  .themedot{width:38px;height:38px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:linear-gradient(135deg,var(--dot1),var(--dot2));transition:transform .12s,border-color .15s,box-shadow .15s;}
  .themedot:hover{transform:scale(1.08);}
  .themedot.sel{border-color:var(--text);box-shadow:0 0 0 3px var(--accent-soft), 0 4px 14px rgba(0,0,0,.4);}
  .bgpick{display:flex;gap:8px;}
  .bgopt{padding:8px 16px;border-radius:999px;border:1px solid var(--line-strong);background:transparent;color:var(--text-2);font-size:12.5px;cursor:pointer;font-family:'Archivo',sans-serif;transition:all .15s;}
  .bgopt.sel{background:var(--grad);color:#fff;border-color:transparent;box-shadow:0 2px 10px var(--glow);}
  .switchrow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer;}
  .switchrow:last-child{border-bottom:none;padding-bottom:0;}
  .sr-ttl{font-size:14px;font-weight:500;}
  .sr-sub{font-size:12px;color:var(--text-2);margin-top:2px;line-height:1.45;}
  .switchrow input[type=checkbox]{appearance:none;-webkit-appearance:none;width:44px;height:25px;border-radius:99px;background:var(--surface-3);position:relative;cursor:pointer;transition:background .18s;flex-shrink:0;margin:0;border:none;}
  .switchrow input[type=checkbox]::after{content:'';position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;transition:left .18s;}
  .switchrow input[type=checkbox]:checked{background:var(--accent);}
  .switchrow input[type=checkbox]:checked::after{left:22px;}

  .btn-ghost{background:transparent;border:1px solid var(--line-strong);color:var(--text-2);padding:9px 18px;font-size:12px;cursor:pointer;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.05em;border-radius:999px;transition:color .15s,border-color .15s,background .15s;}
  .btn-ghost:hover{color:var(--text);border-color:var(--accent);}
  .btn-primary{background:var(--grad);border:none;color:#fff;padding:9px 18px;font-size:12px;font-weight:700;cursor:pointer;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.05em;border-radius:999px;box-shadow:0 3px 12px var(--glow);transition:transform .12s,box-shadow .15s,filter .15s;}
  .btn-primary:hover{filter:brightness(1.08);box-shadow:0 5px 18px var(--glow);}
  .btn-primary:active{transform:scale(.97);}
</style>
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
      <div class="sectiontab" data-page="diagnostico" title="Diagnóstico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>
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
      <div class="fsub active" data-fsub="inicio">Início</div>
      <div class="fsub" data-fsub="entradas">Entradas</div>
      <div class="fsub" data-fsub="saidas">Saídas</div>
      <div class="fsub" data-fsub="metas">Metas</div>
    </div>

    <div class="fpage active" id="fpage-inicio">
      <div class="agenda-subnav" id="finPeriodNav">
        <div class="apill" data-period="day">Dia</div>
        <div class="apill" data-period="week">Semana</div>
        <div class="apill active" data-period="month">Mês</div>
        <div class="apill" data-period="year">Ano</div>
      </div>

      <div class="finhead"><div class="big" id="finSaldoBig">R$ 0,00</div><div class="lbl" id="finSaldoLbl">Saldo do mês</div></div>
      <div class="finrow3" id="finRow3"></div>

      <div class="fpage-head"><h2 style="margin:26px 0 0;">Contas</h2><button class="addbtn-sm" id="btnOpenAccModal">+</button></div>
      <div class="dashcard-sub" style="margin:2px 0 4px;">Sem Open Finance ainda — você registra o saldo manualmente. Some todas as contas em uso.</div>
      <div id="accTotalLine" style="font-family:'IBM Plex Mono',monospace;font-size:20px;font-weight:600;color:var(--sage);margin-bottom:12px;">R$ 0,00</div>
      <div id="accountLines"></div>

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

    <div class="fpage" id="fpage-entradas">
      <div class="fpage-head"><h2 style="margin:0;">Rendas fixas e temporárias</h2><button class="addbtn-sm" id="btnOpenIncModal">+</button></div>
      <input type="search" id="incSearch" placeholder="Buscar renda por nome ou tipo..." style="width:100%;margin-bottom:10px;">
      <div id="incomeLines"></div>
      <h2>Renda variável — lançar ganho (ex: iFood)</h2>
      <div class="form-row">
        <input type="date" id="ifoodDate">
        <input type="number" id="ifoodValor" placeholder="Valor (R$)" step="0.01" style="width:130px;">
        <input type="number" id="ifoodKm" placeholder="Km" style="width:80px;">
        <button class="action" id="btnAddIfood">Lançar</button>
      </div>
      <div id="ifoodList"></div>
    </div>

    <div class="fpage" id="fpage-saidas">
      <div class="fpage-head"><h2 style="margin:0;">Despesas</h2><button class="addbtn-sm" id="btnOpenExpModal">+</button></div>
      <input type="search" id="expSearch" placeholder="Buscar por nome, categoria ou banco..." style="width:100%;margin-bottom:10px;">
      <div id="expenseLines"></div>
    </div>

    <div class="fpage" id="fpage-metas">
      <div class="fpage-head"><h2 style="margin:0;">Metas do mês</h2><button class="addbtn-sm" id="btnEditGoals" title="Editar metas">✎</button></div>
      <div class="dashcard-sub" style="margin:2px 0 10px;">Limite de gasto por categoria. A barra mostra quanto do limite já foi usado neste mês — âmbar a partir de 80%, vermelho ao estourar.</div>
      <div id="goalsList"></div>
    </div>
  </div>

  <div class="page" id="page-diagnostico">
    <h2>Diagnóstico</h2>
    <p class="footnote" style="margin-bottom:14px;">Analisa os últimos 14 dias de agenda cumprida e caixa, e aponta onde ajustar. Na versão final roda pelo Gemini, no servidor.</p>
    <button class="action" id="btnAnalyze">Rodar diagnóstico</button>
    <div id="insightsResult" style="margin-top:16px;white-space:pre-wrap;font-size:13px;line-height:1.7;color:var(--text-2);"></div>
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
    <div class="field"><label>Nome</label><input type="text" id="imLabel" placeholder="Ex: PJ EZ Soft"></div>
    <div class="field-row">
      <div class="field"><label>Valor mensal (R$)</label><input type="number" id="imValue" step="0.01"></div>
      <div class="field"><label>Tipo</label>
        <select id="imType">
          <option value="fixa">Fixa</option>
          <option value="variavel">Variável</option>
          <option value="temporaria">Temporária</option>
        </select>
      </div>
    </div>
    <div class="field" id="imEndField" style="display:none;"><label>Válida até</label><input type="date" id="imEnd"></div>
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
      <div class="footnote" style="margin-top:8px;">Ícones só aparecem se este arquivo for aberto direto do seu PC (não pela prévia do Claude), com a pasta <code>assets/bancos</code> ao lado dele.</div>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="emDelete" style="display:none;margin-right:auto;color:var(--brick);border-color:var(--brick);">Excluir</button>
      <button class="btn-ghost" id="emCancel">Cancelar</button>
      <button class="btn-primary" id="emSave">Salvar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="accountModalOverlay">
  <div class="modal">
    <h3 id="accountModalTitle">Nova conta</h3>
    <div class="field"><label>Apelido</label><input type="text" id="acLabel" placeholder="Ex: Conta corrente ou Cartão Nubank"></div>
    <div class="field"><label>Tipo</label>
      <select id="acTipo">
        <option value="conta">Conta (corrente / poupança)</option>
        <option value="cartao">Cartão de crédito</option>
      </select>
    </div>
    <div class="field" id="acSaldoField"><label>Saldo atual (R$)</label><input type="number" id="acSaldo" step="0.01"></div>
    <div class="field-row" id="acCartaoFields" style="display:none;">
      <div class="field"><label>Limite total (R$)</label><input type="number" id="acLimite" step="0.01"></div>
      <div class="field"><label>Fatura atual (R$)</label><input type="number" id="acFatura" step="0.01"></div>
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

<button id="fabNew" title="Nova despesa">+</button>

<div class="modal-overlay" id="goalsModalOverlay">
  <div class="modal">
    <h3>Metas de gasto por categoria</h3>
    <p style="font-size:12.5px;color:var(--text-2);margin:0 0 14px;">Deixe em branco as categorias sem meta. O limite vale pro mês.</p>
    <div id="goalsInputs"></div>
    <div class="modal-actions">
      <button class="btn-ghost" id="goalsCancel">Cancelar</button>
      <button class="btn-primary" id="goalsSave">Salvar</button>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="assets/qrcode.min.js"></script>
<script>
const CATS = { treino:'Treino', trabalho:'Trabalho', estudo:'Estudo', ifood:'iFood', descanso:'Descanso', deslocamento:'Deslocamento' };
const BANKS = [
  {id:'nubank', name:'Nubank', color:'#8A05BE', initials:'NU'},
  {id:'itau', name:'Itaú', color:'#EC7000', initials:'IT'},
  {id:'bradesco', name:'Bradesco', color:'#CC092F', initials:'BR'},
  {id:'bb', name:'Banco do Brasil', color:'#F0B429', initials:'BB'},
  {id:'caixa', name:'Caixa', color:'#0070AD', initials:'CX'},
  {id:'santander', name:'Santander', color:'#EC0000', initials:'SA'},
  {id:'inter', name:'Inter', color:'#FF7A00', initials:'IN'},
  {id:'c6', name:'C6 Bank', color:'#4A4A4A', initials:'C6'},
  {id:'sicoob', name:'Sicoob', color:'#00A651', initials:'SI'},
  {id:'picpay', name:'PicPay', color:'#21C25E', initials:'PP'},
  {id:'mercadopago', name:'Mercado Pago', color:'#00A7DB', initials:'MP'},
  {id:'outro', name:'Outro', color:'#5A5A5A', initials:'--'},
];
const METHODS = { pix:'Pix', debito:'Débito', credito:'Crédito', ted:'TED' };
const METHOD_ICONS = {
  pix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  debito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>',
  credito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  ted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10l4-4 4 4M7 6v9M21 14l-4 4-4-4M17 18V9"/></svg>',
};
function renderMethodPicker(containerId, hiddenInputId, selectedId){
  const box = document.getElementById(containerId);
  box.innerHTML = Object.keys(METHODS).map(k=>`
    <div class="methodpick-item ${k===selectedId?'selected':''}" data-method="${k}">
      ${METHOD_ICONS[k]}
      <div class="mpname">${METHODS[k]}</div>
    </div>`).join('');
  box.querySelectorAll('.methodpick-item').forEach(item=>{
    item.onclick = ()=>{
      box.querySelectorAll('.methodpick-item').forEach(x=>x.classList.remove('selected'));
      item.classList.add('selected');
      document.getElementById(hiddenInputId).value = item.dataset.method;
    };
  });
}
function bankById(id){ return BANKS.find(b=>b.id===id) || BANKS[BANKS.length-1]; }
function bankAvatarHtml(bankId, size){
  const bank = bankById(bankId);
  const sz = size ? `style="width:${size}px;height:${size}px;"` : '';
  return `<div class="bankavatar" ${sz}>
    <img src="assets/bancos/${bank.id}.svg" alt="${bank.name}"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
    <div class="fallback-initials" style="display:none;background:${bank.color}">${bank.initials}</div>
  </div>`;
}
function renderBankPicker(containerId, hiddenInputId, selectedId){
  const box = document.getElementById(containerId);
  box.innerHTML = BANKS.map(b=>`
    <div class="bankpick-item ${b.id===selectedId?'selected':''}" data-bank="${b.id}">
      ${bankAvatarHtml(b.id)}
      <div class="bpname">${b.name}</div>
    </div>`).join('');
  box.querySelectorAll('.bankpick-item').forEach(item=>{
    item.onclick = ()=>{
      box.querySelectorAll('.bankpick-item').forEach(x=>x.classList.remove('selected'));
      item.classList.add('selected');
      document.getElementById(hiddenInputId).value = item.dataset.bank;
    };
  });
}
const WEEKDAY_ABBR = ['DOM.','SEG.','TER.','QUA.','QUI.','SEX.','SÁB.'];
const MONTH_NAMES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function pad(n){ return n.toString().padStart(2,'0'); }
function dkey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function monthKey(d){ d = d||new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
function timeToMin(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function minToTime(m){ m=((m%1440)+1440)%1440; return pad(Math.floor(m/60))+':'+pad(m%60); }
function fmtMoney(v){ return 'R$ ' + (v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function toast(msg, opts){
  opts = opts||{};
  let box = document.getElementById('toastBox');
  if (!box){ box = document.createElement('div'); box.id='toastBox'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast' + (opts.error?' err':'');
  const span = document.createElement('span'); span.textContent = msg; el.appendChild(span);
  if (opts.undo){
    const b = document.createElement('button'); b.textContent = 'Desfazer';
    b.onclick = ()=>{ el.remove(); opts.undo(); };
    el.appendChild(b);
  }
  box.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .25s'; el.style.opacity='0'; setTimeout(()=>el.remove(), 260); }, opts.undo?8000:3500);
}
function emptyCta(msg, btnLabel, targetId){
  return `<div class="empty empty-cta"><div>${msg}</div><button class="btn-primary" data-open="${targetId}">${btnLabel}</button></div>`;
}
function relDate(dateStr){
  if (!dateStr) return 'sem data';
  const today = dkey(new Date());
  if (dateStr === today) return 'hoje';
  if (dateStr === dkey(addDays(new Date(), -1))) return 'ontem';
  return dateStr.split('-').reverse().join('/');
}
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function genId(){ return 't' + Date.now() + Math.random().toString(36).slice(2,7); }
function dnum(d){ return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d){ const r=new Date(d); r.setDate(r.getDate()-r.getDay()); r.setHours(0,0,0,0); return r; }

let __cache = null;
const __bootstrap = (async ()=>{
  try{
    const r = await fetch('api/data.php?all=1');
    if (r.status === 401){ location.href = 'login.php'; return; }
    __cache = r.ok ? await r.json() : {};
  } catch(e){ __cache = {}; }
})();
async function storeGet(key, fallback){
  await __bootstrap;
  if (!__cache || !(key in __cache) || __cache[key] === null || __cache[key] === undefined) return fallback;
  return __cache[key];
}
async function storeSet(key, value){
  await __bootstrap;
  if (__cache) __cache[key] = value;
  try{
    const r = await fetch('api/data.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify({key, value})
    });
    if (r.status === 401) location.href = 'login.php';
  } catch(e){ console.error(e); }
}

let tasks = [];
let checklist = {};

async function ensureSeeded(){
  // conta nova começa vazia — cada usuário constrói a própria rotina
  tasks = await storeGet('tasks_v6', []);
  checklist = await storeGet('checklist_v6', {});
}

function isTaskOnDate(task, d){
  const anchor = new Date(task.date+'T00:00:00');
  if (task.recurrence === 'none') return dnum(anchor) === dnum(d);
  if (task.recurrence === 'weekly'){
    if (d.getDay() !== anchor.getDay()) return false;
    if (dnum(d) < dnum(anchor)) return false;
    if (task.weeksCount && task.weeksCount>0){
      const weeksDiff = Math.floor((d-anchor)/(7*86400000));
      if (weeksDiff >= task.weeksCount) return false;
    }
    return true;
  }
  if (task.recurrence === 'yearly'){
    if (d.getMonth()!==anchor.getMonth() || d.getDate()!==anchor.getDate()) return false;
    return dnum(d) >= dnum(anchor);
  }
  return false;
}
function tasksOnDate(d){ return tasks.filter(t=>isTaskOnDate(t,d)).sort((a,b)=> a.time.localeCompare(b.time)); }
function occId(task,d){ return task.id+':'+dkey(d); }

let calView = 'home';
let viewDate = new Date();
let firedAlarms = {};

document.querySelectorAll('#calSubnav .apill').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('#calSubnav .apill').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    calView = b.dataset.view;
    renderAgenda();
  };
});
document.querySelectorAll('#agendaSubnav .apill').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('#agendaSubnav .apill').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('#page-agenda .apage').forEach(x=>x.classList.remove('active'));
    document.getElementById('apage-'+b.dataset.asub).classList.add('active');
    if (b.dataset.asub==='inicio') renderHomeCharts();
    else renderAgenda();
  };
});
document.getElementById('btnToday').onclick = ()=>{ viewDate = new Date(); renderAgenda(); };
document.getElementById('btnPrev').onclick = ()=> shift(-1);
document.getElementById('btnNext').onclick = ()=> shift(1);
function shift(dir){
  if (calView==='day') viewDate = addDays(viewDate, dir);
  else if (calView==='week') viewDate = addDays(viewDate, dir*7);
  else if (calView==='year') { const d=new Date(viewDate); d.setFullYear(d.getFullYear()+dir); viewDate=d; }
  else { const d=new Date(viewDate); d.setMonth(d.getMonth()+dir); viewDate=d; }
  renderAgenda();
}

function renderAgenda(){
  const today = new Date();
  const body = document.getElementById('calBody');

  if (calView==='year'){
    document.getElementById('agendaTitle').textContent = viewDate.getFullYear();
    document.getElementById('agendaSub').textContent = viewDate.getDate() + ' de ' + MONTH_NAMES[viewDate.getMonth()] + ' selecionado';
    body.innerHTML = buildYearHtml();
    bindYearClicks(body);
  } else if (calView==='month'){
    document.getElementById('agendaTitle').textContent = MONTH_NAMES[viewDate.getMonth()];
    document.getElementById('agendaSub').textContent = viewDate.getFullYear() + ((viewDate.getMonth()===today.getMonth() && viewDate.getFullYear()===today.getFullYear()) ? ' · mês atual' : '');
    body.innerHTML = buildMonthHtml();
    bindMonthClicks(body);
  } else if (calView==='week'){
    const s = startOfWeek(viewDate), e = addDays(s,6);
    document.getElementById('agendaTitle').textContent = s.getDate()+' '+MONTH_ABBR[s.getMonth()]+' – '+e.getDate()+' '+MONTH_ABBR[e.getMonth()];
    document.getElementById('agendaSub').textContent = (dnum(s)<=dnum(today) && dnum(today)<=dnum(e)) ? 'semana atual' : '';
    body.innerHTML = buildWeekHtml();
    bindWeekClicks(body);
  } else {
    document.getElementById('agendaTitle').textContent = viewDate.getDate()+' de '+MONTH_NAMES[viewDate.getMonth()];
    document.getElementById('agendaSub').textContent = dnum(viewDate)===dnum(today) ? 'hoje' : WEEKDAY_ABBR[viewDate.getDay()];
    body.innerHTML = '';
  }
  renderAgendaList();
  renderHero();
}

/* ---------- Início da Agenda: dashboard de conclusão ---------- */
/* Cores dos gráficos seguem o tema escolhido no Perfil (variáveis CSS). */
function accentHex(){ return (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()) || '#4F8DF9'; }
function themeVar(name, fallback){ return (getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || fallback; }
function chartGridCol(){ return themeVar('--line', '#1E1E1E'); }
function chartTickCol(){ return themeVar('--text-3', '#6A6A6E'); }
function accentRGBStr(){
  let h = accentHex().replace('#','');
  if (h.length===3) h = h.split('').map(c=>c+c).join('');
  const n = parseInt(h,16);
  return ((n>>16)&255)+','+((n>>8)&255)+','+(n&255);
}
let chartTaskLine=null, chartTaskCat=null;

function last30Days(now){ const days=[]; for(let i=29;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); days.push(d); } return days; }
function dayCompletion(d){
  const scheduled = tasksOnDate(d);
  if (scheduled.length===0) return null;
  const done = scheduled.filter(t=>checklist[occId(t,d)]).length;
  return done/scheduled.length;
}
function currentStreak(now){
  let streak = 0;
  let d = new Date(now);
  while (true){
    const comp = dayCompletion(d);
    if (comp===null){ d = addDays(d,-1); if (dnum(d) < dnum(now)-3650) break; continue; }
    if (comp>=1){ streak++; d = addDays(d,-1); }
    else break;
  }
  return streak;
}

function renderTaskHeatmap(now){
  const wrap = document.getElementById('wrapTaskHeat');
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const gridStart = new Date(first); gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  let html = '<div class="heatgrid">' + WEEKDAY_MIN.map(d=>`<div class="heat-head">${d}</div>`).join('');
  for (let i=0;i<42;i++){
    const d = new Date(gridStart); d.setDate(gridStart.getDate()+i);
    const inMonth = d.getMonth()===now.getMonth();
    if (!inMonth && i>=35) continue;
    const comp = dnum(d) <= dnum(now) ? dayCompletion(d) : null;
    const isToday = dnum(d)===dnum(now);
    let bg = 'var(--surface-2)';
    let textColor = '';
    if (comp!==null && comp>0){
      const t = 0.12 + 0.85*comp;
      bg = `rgba(${accentRGBStr()},${t.toFixed(2)})`;
      textColor = t > 0.42 ? '#fff' : 'var(--text)';
    }
    const title = comp===null ? `${d.getDate()}/${d.getMonth()+1}: sem tarefas` : `${d.getDate()}/${d.getMonth()+1}: ${Math.round(comp*100)}% cumprido`;
    html += `<div class="heatcell ${inMonth?'':'outmonth'} ${isToday?'today':''}" style="background:${bg};${textColor?`color:${textColor};font-weight:600;`:''}" title="${title}">${d.getDate()}</div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
}

function renderHomeCharts(){
  const now = new Date();
  renderTaskHeatmap(now);

  const days = last30Days(now);
  const comps = days.map(d=>dayCompletion(d));
  const validComps = comps.filter(c=>c!==null);
  const avg = validComps.length ? Math.round(validComps.reduce((s,c)=>s+c,0)/validComps.length*100) : 0;
  const streak = currentStreak(now);

  document.getElementById('agendaStatRow').innerHTML = `
    <div class="fc"><div class="v" style="color:var(--accent-text)">${avg}%</div><div class="l">Taxa média (30 dias)</div></div>
    <div class="fc"><div class="v" style="color:var(--sage)">${streak} ${streak===1?'dia':'dias'}</div><div class="l">Sequência atual</div></div>
    <div class="fc"><div class="v">${tasks.length}</div><div class="l">Tarefas cadastradas</div></div>`;

  if (typeof Chart === 'undefined'){
    ['wrapTaskLine','wrapTaskCat'].forEach(id=>{
      document.getElementById(id).innerHTML = '<div class="dashempty">Não consegui carregar a biblioteca de gráficos agora.<br>Verifique sua conexão e recarregue a página.</div>';
    });
    return;
  }
  if (chartTaskLine) { chartTaskLine.destroy(); chartTaskLine=null; }
  if (chartTaskCat) { chartTaskCat.destroy(); chartTaskCat=null; }

  const wrapLine = document.getElementById('wrapTaskLine');
  wrapLine.innerHTML = '<canvas id="chartTaskLine"></canvas>';
  try {
    chartTaskLine = new Chart(document.getElementById('chartTaskLine'), {
      type:'line',
      data:{ labels: days.map(d=>pad(d.getDate())+'/'+pad(d.getMonth()+1)),
        datasets:[{ data: comps.map(c=>c===null?null:Math.round(c*100)), borderColor: accentHex(), backgroundColor: `rgba(${accentRGBStr()},0.18)`, fill:true, tension:0.35, pointRadius:0, borderWidth:2, spanGaps:true }] },
      options: chartBaseOptions({ scales:{ x:{ grid:{display:false}, ticks:{color:chartTickCol(), font:{size:9}, maxTicksLimit:8} }, y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10}}, min:0, max:100 } } })
    });
  } catch(err){ console.error('chartTaskLine falhou', err); wrapLine.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }

  const wrapCat = document.getElementById('wrapTaskCat');
  wrapCat.innerHTML = '<canvas id="chartTaskCat"></canvas>';
  try {
    const catKeys = Object.keys(CATS);
    const catPct = catKeys.map(cat=>{
      let scheduled=0, done=0;
      days.forEach(d=>{
        tasksOnDate(d).filter(t=>t.cat===cat).forEach(t=>{ scheduled++; if (checklist[occId(t,d)]) done++; });
      });
      return scheduled>0 ? Math.round(done/scheduled*100) : 0;
    });
    chartTaskCat = new Chart(document.getElementById('chartTaskCat'), {
      type:'bar',
      data:{ labels: catKeys.map(k=>CATS[k]), datasets:[{ data: catPct, backgroundColor: accentHex(), borderRadius:6, maxBarThickness:50 }] },
      options: chartBaseOptions({ scales:{ x:{ grid:{display:false}, ticks:{color:chartTickCol(), font:{size:10}} }, y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10}}, min:0, max:100 } } })
    });
  } catch(err){ console.error('chartTaskCat falhou', err); wrapCat.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
}

function buildMonthHtml(){
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const today = new Date();
  let html = '<div class="monthgrid-heads">' + WEEKDAY_ABBR.map(d=>`<div>${d[0]}</div>`).join('') + '</div><div class="monthgrid-rows">';
  for (let i=0;i<42;i++){
    const d = addDays(gridStart, i);
    const inMonth = d.getMonth()===viewDate.getMonth();
    const isToday = dnum(d)===dnum(today);
    const isSelected = dnum(d)===dnum(viewDate);
    const isWeekend = d.getDay()===0 || d.getDay()===6;
    const hasTasks = tasksOnDate(d).length>0;
    html += `<div class="mcell ${inMonth?'':'outmonth'} ${isToday?'today':''} ${isSelected?'selected':''} ${isWeekend?'weekend':''}" data-date="${dkey(d)}">
      <div class="dnum">${d.getDate()}</div>${hasTasks?'<div class="dot"></div>':''}
    </div>`;
  }
  return html + '</div>';
}
function bindMonthClicks(box){
  box.querySelectorAll('.mcell').forEach(c=>{
    c.onclick = ()=>{ viewDate = new Date(c.dataset.date+'T00:00:00'); renderAgenda(); };
  });
}

function buildWeekHtml(){
  const s = startOfWeek(viewDate);
  const today = new Date();
  let html = '<div class="weekstrip">';
  for (let i=0;i<7;i++){
    const d = addDays(s,i);
    const isToday = dnum(d)===dnum(today);
    const isSelected = dnum(d)===dnum(viewDate);
    const hasTasks = tasksOnDate(d).length>0;
    html += `<div class="wcell ${isSelected?'selected':''} ${isToday?'today':''}" data-date="${dkey(d)}">
      <div class="wn">${WEEKDAY_ABBR[d.getDay()].slice(0,3)}</div>
      <div class="wd">${d.getDate()}</div>
      ${hasTasks?'<div class="dot"></div>':'<div class="dot" style="visibility:hidden;"></div>'}
    </div>`;
  }
  return html + '</div>';
}
function bindWeekClicks(box){
  box.querySelectorAll('.wcell').forEach(c=>{
    c.onclick = ()=>{ viewDate = new Date(c.dataset.date+'T00:00:00'); renderAgenda(); };
  });
}

function buildYearHtml(){
  const year = viewDate.getFullYear();
  const today = new Date();
  let html = '<div class="yeargrid">';
  for (let m=0;m<12;m++){
    const first = new Date(year, m, 1);
    const gridStart = startOfWeek(first);
    html += `<div class="miniMonth" data-month="${m}"><div class="mm-title">${MONTH_ABBR[m]}</div><div class="mm-heads">${WEEKDAY_ABBR.map(d=>`<div>${d[0]}</div>`).join('')}</div><div class="mm-days">`;
    for (let i=0;i<42;i++){
      const d = addDays(gridStart,i);
      const inMonth = d.getMonth()===m;
      if (!inMonth && i>=35) continue;
      const isToday = dnum(d)===dnum(today);
      const isSelected = dnum(d)===dnum(viewDate);
      const isWeekend = d.getDay()===0 || d.getDay()===6;
      html += `<div class="mm-day ${inMonth?'':'outmonth'} ${isToday?'today':''} ${isSelected?'selected':''} ${isWeekend?'weekend':''}" data-date="${dkey(d)}">${d.getDate()}</div>`;
    }
    html += '</div></div>';
  }
  return html + '</div>';
}
function bindYearClicks(box){
  box.querySelectorAll('.mm-day').forEach(c=>{
    c.onclick = ()=>{
      // seleciona o dia sem sair da visão de ano; a lista de tarefas
      // abaixo do calendário passa a mostrar o dia escolhido
      viewDate = new Date(c.dataset.date+'T00:00:00');
      renderAgenda();
    };
  });
}

async function renderAgendaList(){
  const label = document.getElementById('agendaListLabel');
  const today = new Date();
  label.textContent = dnum(viewDate)===dnum(today) ? 'Hoje' : (WEEKDAY_ABBR[viewDate.getDay()] + ' · ' + viewDate.getDate() + ' ' + MONTH_ABBR[viewDate.getMonth()]);
  const dayTasks = tasksOnDate(viewDate);
  const box = document.getElementById('agendaList');
  if (dayTasks.length===0){ box.innerHTML = emptyCta('Nenhuma tarefa nesse dia.', '+ Nova tarefa', 'btnNewTask'); return; }
  box.innerHTML = dayTasks.map(t=>{
    const isDone = !!checklist[occId(t,viewDate)];
    const endTime = minToTime(timeToMin(t.time)+t.duration);
    return `<div class="taskcard cat-${t.cat} ${isDone?'done':''}" data-id="${t.id}">
      <div class="dot"></div>
      <div class="info"><div class="ttl">${esc(t.title)}</div><div class="tm">${t.time}–${endTime}</div></div>
      <button class="del" data-id="${t.id}">✕</button>
    </div>`;
  }).join('');
  box.querySelectorAll('.taskcard').forEach(card=>{
    card.onclick = async (e)=>{
      if (e.target.closest('.del')) return;
      const id = card.dataset.id;
      const key = id+':'+dkey(viewDate);
      checklist[key] = !checklist[key];
      await storeSet('checklist_v6', checklist);
      renderAgendaList(); renderAgenda();
    };
  });
  box.querySelectorAll('.del').forEach(btn=>{
    btn.onclick = async (e)=>{
      e.stopPropagation();
      const removed = tasks.find(t=>t.id===btn.dataset.id);
      tasks = tasks.filter(t=>t.id!==btn.dataset.id);
      await storeSet('tasks_v6', tasks);
      renderAgenda();
      toast('Tarefa excluída', { undo: async ()=>{
        tasks.push(removed);
        await storeSet('tasks_v6', tasks);
        renderAgenda();
      }});
    };
  });
}

function renderHero(){
  const now = new Date();
  const hero = document.getElementById('hero');
  const todays = tasksOnDate(now);
  const nowMin = now.getHours()*60+now.getMinutes();
  let activeIdx=-1, nextIdx=-1;
  for(let i=0;i<todays.length;i++){
    const start = timeToMin(todays[i].time);
    const end = (i+1<todays.length) ? timeToMin(todays[i+1].time) : 24*60;
    if(nowMin>=start && nowMin<end){ activeIdx=i; nextIdx = i+1<todays.length ? i+1 : -1; }
  }
  if (activeIdx===-1) nextIdx = 0;
  if (activeIdx>-1){
    document.getElementById('heroLabel').textContent = 'Agora — ' + CATS[todays[activeIdx].cat];
    document.getElementById('heroTitle').textContent = todays[activeIdx].title;
  } else {
    document.getElementById('heroLabel').textContent = 'Fora da agenda programada';
    document.getElementById('heroTitle').textContent = todays[0] ? 'Próxima: ' + todays[0].title : 'Nenhuma tarefa hoje';
  }
  if (nextIdx>-1 && todays[nextIdx]){
    const nextStart = timeToMin(todays[nextIdx].time);
    let diff = nextStart - nowMin; if (diff<0) diff += 24*60;
    const h = Math.floor(diff/60), m = diff%60;
    document.getElementById('nextIn').textContent = (h>0?h+'h ':'') + m + 'min';
    if (diff===0){
      const ak = dkey(now)+':'+todays[nextIdx].id;
      if (!firedAlarms[ak]){
        firedAlarms[ak]=true;
        hero.classList.add('alarm'); setTimeout(()=>hero.classList.remove('alarm'),8000);
        if ('Notification' in window && Notification.permission==='granted' && localStorage.getItem('pm_notif')==='1'){
          try{ new Notification('Hora de: ' + todays[nextIdx].title, { body: todays[nextIdx].time + ' — Orby', icon: 'assets/icon-192.png', tag: ak }); }catch(e){}
        }
      }
    }
  } else { document.getElementById('nextIn').textContent = '--'; }
  const doneN = todays.filter(t=>checklist[occId(t,now)]).length;
  document.getElementById('doneCount').textContent = doneN + '/' + todays.length;
}

const modalOverlay = document.getElementById('modalOverlay');
document.getElementById('btnNewTask').onclick = ()=>{
  document.getElementById('mTitle').value = '';
  document.getElementById('mDate').value = dkey(viewDate);
  document.getElementById('mTime').value = '08:00';
  document.getElementById('mCat').value = 'trabalho';
  document.getElementById('mDuration').value = 30;
  document.getElementById('mRepeat').value = 'none';
  document.getElementById('mWeeks').value = 12;
  document.getElementById('mWeeksField').style.display = 'none';
  modalOverlay.classList.add('open');
};
document.getElementById('btnCancelModal').onclick = ()=> modalOverlay.classList.remove('open');
document.getElementById('mRepeat').onchange = (e)=>{
  document.getElementById('mWeeksField').style.display = e.target.value==='weekly' ? '' : 'none';
};
document.getElementById('btnSaveModal').onclick = async ()=>{
  const title = document.getElementById('mTitle').value.trim();
  if (!title) return;
  tasks.push({
    id: genId(), title,
    date: document.getElementById('mDate').value,
    time: document.getElementById('mTime').value,
    cat: document.getElementById('mCat').value,
    duration: Number(document.getElementById('mDuration').value||30),
    recurrence: document.getElementById('mRepeat').value,
    weeksCount: Number(document.getElementById('mWeeks').value||0),
  });
  await storeSet('tasks_v6', tasks);
  modalOverlay.classList.remove('open');
  renderAgenda();
  toast('Tarefa criada');
};

document.querySelectorAll('.sectiontab').forEach(t=>{
  t.onclick = ()=>{
    document.querySelectorAll('.sectiontab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('page-'+t.dataset.page).classList.add('active');
    if(t.dataset.page==='financeiro') renderFinance();
    if(t.dataset.page==='perfil') renderPerfil();
    if(t.dataset.page==='agenda') renderHomeCharts();
  };
});

async function getExpenseLines(){
  return await storeGet('expense_lines_v4', []);
}
async function getIncomeLines(){
  return await storeGet('income_lines', []);
}
function isIncomeActive(line, now){
  if (line.type !== 'temporaria') return true;
  if (!line.endDate) return true;
  return dnum(new Date(line.endDate+'T00:00:00')) >= dnum(now);
}
const TYPE_LABEL = {fixa:'Fixa', variavel:'Variável', temporaria:'Temporária'};


document.querySelectorAll('.fsub').forEach(t=>{
  t.onclick = ()=>{
    document.querySelectorAll('.fsub').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.fpage').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('fpage-'+t.dataset.fsub).classList.add('active');
    renderFinance();
  };
});

/* ---- Modal de renda (novo / editar) ---- */
let editingIncomeId = null;
document.getElementById('imType').onchange = (e)=>{
  document.getElementById('imEndField').style.display = e.target.value==='temporaria' ? '' : 'none';
};
document.getElementById('btnOpenIncModal').onclick = ()=>{
  editingIncomeId = null;
  document.getElementById('incomeModalTitle').textContent = 'Nova renda';
  document.getElementById('imLabel').value = '';
  document.getElementById('imValue').value = '';
  document.getElementById('imType').value = 'fixa';
  document.getElementById('imEnd').value = '';
  document.getElementById('imEndField').style.display = 'none';
  document.getElementById('imDelete').style.display = 'none';
  document.getElementById('incomeModalOverlay').classList.add('open');
};
document.getElementById('imCancel').onclick = ()=> document.getElementById('incomeModalOverlay').classList.remove('open');
document.getElementById('imSave').onclick = async ()=>{
  const label = document.getElementById('imLabel').value.trim();
  if (!label) return;
  const value = Number(document.getElementById('imValue').value||0);
  const type = document.getElementById('imType').value;
  const endDate = document.getElementById('imEnd').value || null;
  let lines = await getIncomeLines();
  if (editingIncomeId){
    const l = lines.find(x=>x.id===editingIncomeId);
    if (l){ l.label=label; l.value=value; l.type=type; l.endDate = type==='temporaria'?endDate:null; }
  } else {
    lines.push({ id: genId(), label, value, type, endDate: type==='temporaria'?endDate:null, createdAt: Date.now() });
  }
  await storeSet('income_lines', lines);
  document.getElementById('incomeModalOverlay').classList.remove('open');
  renderFinance();
  toast(editingIncomeId ? 'Renda atualizada' : 'Renda cadastrada');
};
document.getElementById('imDelete').onclick = async ()=>{
  if (!editingIncomeId) return;
  let lines = await getIncomeLines();
  const removed = lines.find(l=>l.id===editingIncomeId);
  lines = lines.filter(l=>l.id!==editingIncomeId);
  await storeSet('income_lines', lines);
  document.getElementById('incomeModalOverlay').classList.remove('open');
  renderFinance();
  toast('Renda excluída', { undo: async ()=>{
    const cur = await getIncomeLines();
    cur.push(removed);
    await storeSet('income_lines', cur);
    renderFinance();
  }});
};
function openIncomeEdit(line){
  editingIncomeId = line.id;
  document.getElementById('incomeModalTitle').textContent = 'Editar renda';
  document.getElementById('imLabel').value = line.label;
  document.getElementById('imValue').value = line.value;
  document.getElementById('imType').value = line.type;
  document.getElementById('imEnd').value = line.endDate || '';
  document.getElementById('imEndField').style.display = line.type==='temporaria' ? '' : 'none';
  document.getElementById('imDelete').style.display = '';
  document.getElementById('incomeModalOverlay').classList.add('open');
}

/* ---- Modal de despesa (novo / editar) ---- */
let editingExpenseId = null;

async function fillAccountSelect(selectedId){
  const accounts = await getAccounts();
  const sel = document.getElementById('emAccount');
  sel.innerHTML = '<option value="">Não movimentar nenhuma conta</option>' +
    accounts.map(a=>`<option value="${a.id}">${esc(a.label)}${a.tipo==='cartao'?' (cartão)':''}</option>`).join('');
  sel.value = selectedId || '';
  syncAccountSelectState();
}
function syncAccountSelectState(){
  const rec = document.getElementById('emRecorrente').checked;
  const sel = document.getElementById('emAccount');
  sel.disabled = rec;
  if (rec) sel.value = '';
}
document.getElementById('emRecorrente').onchange = syncAccountSelectState;

/** sign +1 aplica a despesa na conta (debita saldo / soma fatura); -1 estorna. */
function applyAccountMovement(accounts, accountId, value, sign){
  const a = accounts.find(x=>x.id===accountId);
  if (!a) return;
  if (a.tipo==='cartao') a.fatura = Number(a.fatura||0) + sign*value;
  else a.saldo = Number(a.saldo||0) - sign*value;
}

document.getElementById('btnOpenExpModal').onclick = async ()=>{
  editingExpenseId = null;
  document.getElementById('expenseModalTitle').textContent = 'Nova despesa';
  document.getElementById('emLabel').value = '';
  document.getElementById('emValue').value = '';
  document.getElementById('emDate').value = dkey(new Date());
  document.getElementById('emTime').value = pad(new Date().getHours())+':'+pad(new Date().getMinutes());
  document.getElementById('emRecorrente').checked = false;
  document.getElementById('emCategoria').value = 'outros';
  document.getElementById('emMethod').value = 'pix';
  renderMethodPicker('emMethodPicker', 'emMethod', 'pix');
  document.getElementById('emBank').value = 'outro';
  renderBankPicker('emBankPicker', 'emBank', 'outro');
  document.getElementById('emDelete').style.display = 'none';
  await fillAccountSelect('');
  document.getElementById('expenseModalOverlay').classList.add('open');
};
document.getElementById('emCancel').onclick = ()=> document.getElementById('expenseModalOverlay').classList.remove('open');
document.getElementById('emSave').onclick = async ()=>{
  const label = document.getElementById('emLabel').value.trim();
  if (!label) return;
  const value = Number(document.getElementById('emValue').value||0);
  const date = document.getElementById('emDate').value || null;
  const time = document.getElementById('emTime').value || '12:00';
  const recorrencia = document.getElementById('emRecorrente').checked ? 'mensal' : 'none';
  const categoria = document.getElementById('emCategoria').value;
  const method = document.getElementById('emMethod').value;
  const bank = document.getElementById('emBank').value;
  const accountId = recorrencia==='none' ? (document.getElementById('emAccount').value || null) : null;
  let lines = await getExpenseLines();
  const accounts = await getAccounts();
  let accountsTouched = false;
  if (editingExpenseId){
    const l = lines.find(x=>x.id===editingExpenseId);
    if (l){
      // se mudou a conta ou o valor: estorna o movimento antigo e aplica o novo
      const movementChanged = (l.accountId||null)!==accountId || Number(l.value||0)!==value;
      if (movementChanged){
        if (l.accountId){ applyAccountMovement(accounts, l.accountId, Number(l.value||0), -1); accountsTouched = true; }
        if (accountId){ applyAccountMovement(accounts, accountId, value, +1); accountsTouched = true; }
      }
      l.label=label; l.value=value; l.date=date; l.time=time; l.recorrencia=recorrencia;
      l.categoria=categoria; l.method=method; l.bank=bank; l.accountId=accountId;
    }
  } else {
    if (accountId){
      applyAccountMovement(accounts, accountId, value, +1);
      accountsTouched = true;
    }
    lines.push({ id: genId(), label, value, date, time, recorrencia, categoria, method, bank, accountId, createdAt: Date.now() });
  }
  if (accountsTouched) await storeSet('accounts_v2', accounts);
  await storeSet('expense_lines_v4', lines);
  document.getElementById('expenseModalOverlay').classList.remove('open');
  renderFinance();
  toast(editingExpenseId ? 'Despesa atualizada' : 'Despesa registrada');
};
document.getElementById('emDelete').onclick = async ()=>{
  if (!editingExpenseId) return;
  let lines = await getExpenseLines();
  const removed = lines.find(l=>l.id===editingExpenseId);
  if (removed && removed.accountId){
    const accounts = await getAccounts();
    applyAccountMovement(accounts, removed.accountId, Number(removed.value||0), -1);
    await storeSet('accounts_v2', accounts);
  }
  lines = lines.filter(l=>l.id!==editingExpenseId);
  await storeSet('expense_lines_v4', lines);
  document.getElementById('expenseModalOverlay').classList.remove('open');
  renderFinance();
  toast('Despesa excluída', { undo: async ()=>{
    const cur = await getExpenseLines();
    cur.push(removed);
    if (removed.accountId){
      const accounts = await getAccounts();
      applyAccountMovement(accounts, removed.accountId, Number(removed.value||0), +1);
      await storeSet('accounts_v2', accounts);
    }
    await storeSet('expense_lines_v4', cur);
    renderFinance();
  }});
};
function openExpenseEdit(line){
  editingExpenseId = line.id;
  document.getElementById('expenseModalTitle').textContent = 'Editar despesa';
  document.getElementById('emLabel').value = line.label;
  document.getElementById('emValue').value = line.value;
  document.getElementById('emDate').value = line.date || '';
  document.getElementById('emTime').value = expenseTimeOf(line);
  document.getElementById('emRecorrente').checked = line.recorrencia === 'mensal';
  document.getElementById('emCategoria').value = line.categoria || 'outros';
  document.getElementById('emMethod').value = line.method;
  renderMethodPicker('emMethodPicker', 'emMethod', line.method);
  document.getElementById('emBank').value = line.bank;
  renderBankPicker('emBankPicker', 'emBank', line.bank);
  document.getElementById('emDelete').style.display = '';
  fillAccountSelect(line.accountId || '');
  document.getElementById('expenseModalOverlay').classList.add('open');
}


/* ---- Contas ---- */
async function getAccounts(){
  return await storeGet('accounts_v2', []);
}
function toggleAccountFields(tipo){
  document.getElementById('acSaldoField').style.display = tipo==='cartao' ? 'none' : '';
  document.getElementById('acCartaoFields').style.display = tipo==='cartao' ? 'flex' : 'none';
}
document.getElementById('acTipo').onchange = (e)=> toggleAccountFields(e.target.value);

let editingAccountId = null;
document.getElementById('btnOpenAccModal').onclick = ()=>{
  editingAccountId = null;
  document.getElementById('accountModalTitle').textContent = 'Nova conta';
  document.getElementById('acLabel').value = '';
  document.getElementById('acTipo').value = 'conta';
  document.getElementById('acSaldo').value = '';
  document.getElementById('acLimite').value = '';
  document.getElementById('acFatura').value = '';
  document.getElementById('acBank').value = 'outro';
  document.getElementById('acPrincipal').checked = false;
  toggleAccountFields('conta');
  renderBankPicker('acBankPicker', 'acBank', 'outro');
  document.getElementById('acDelete').style.display = 'none';
  document.getElementById('acPayFatura').style.display = 'none';
  document.getElementById('accountModalOverlay').classList.add('open');
};
document.getElementById('acCancel').onclick = ()=> document.getElementById('accountModalOverlay').classList.remove('open');
document.getElementById('acSave').onclick = async ()=>{
  const label = document.getElementById('acLabel').value.trim();
  if (!label) return;
  const tipo = document.getElementById('acTipo').value;
  const saldo = Number(document.getElementById('acSaldo').value||0);
  const limite = Number(document.getElementById('acLimite').value||0);
  const fatura = Number(document.getElementById('acFatura').value||0);
  const bank = document.getElementById('acBank').value;
  const principal = document.getElementById('acPrincipal').checked;
  let accounts = await getAccounts();
  if (principal) accounts.forEach(a=>a.principal=false);
  if (editingAccountId){
    const a = accounts.find(x=>x.id===editingAccountId);
    if (a){ a.label=label; a.tipo=tipo; a.saldo=saldo; a.limite=limite; a.fatura=fatura; a.bank=bank; a.principal=principal; }
  } else {
    accounts.push({ id: genId(), label, tipo, saldo, limite, fatura, bank, principal, createdAt: Date.now() });
  }
  await storeSet('accounts_v2', accounts);
  document.getElementById('accountModalOverlay').classList.remove('open');
  renderFinance();
  toast(editingAccountId ? 'Conta atualizada' : 'Conta criada');
};
document.getElementById('acDelete').onclick = async ()=>{
  if (!editingAccountId) return;
  let accounts = await getAccounts();
  const removed = accounts.find(a=>a.id===editingAccountId);
  accounts = accounts.filter(a=>a.id!==editingAccountId);
  await storeSet('accounts_v2', accounts);
  document.getElementById('accountModalOverlay').classList.remove('open');
  renderFinance();
  toast('Conta excluída', { undo: async ()=>{
    const cur = await getAccounts();
    cur.push(removed);
    await storeSet('accounts_v2', cur);
    renderFinance();
  }});
};
function openAccountEdit(acc){
  editingAccountId = acc.id;
  document.getElementById('accountModalTitle').textContent = 'Editar conta';
  document.getElementById('acLabel').value = acc.label;
  document.getElementById('acTipo').value = acc.tipo || 'conta';
  document.getElementById('acSaldo').value = acc.saldo || 0;
  document.getElementById('acLimite').value = acc.limite || 0;
  document.getElementById('acFatura').value = acc.fatura || 0;
  document.getElementById('acBank').value = acc.bank;
  document.getElementById('acPrincipal').checked = !!acc.principal;
  toggleAccountFields(acc.tipo || 'conta');
  renderBankPicker('acBankPicker', 'acBank', acc.bank);
  document.getElementById('acDelete').style.display = '';
  document.getElementById('acPayFatura').style.display = (acc.tipo==='cartao' && Number(acc.fatura)>0) ? '' : 'none';
  document.getElementById('accountModalOverlay').classList.add('open');
}

document.getElementById('acPayFatura').onclick = async ()=>{
  if (!editingAccountId) return;
  const accounts = await getAccounts();
  const acc = accounts.find(a=>a.id===editingAccountId);
  if (!acc || Number(acc.fatura)<=0) return;
  const valor = Number(acc.fatura);
  if (!confirm(`Pagar a fatura de ${fmtMoney(valor)} do cartão "${acc.label}"?\n\nIsso zera a fatura e registra a saída de hoje nas despesas.`)) return;
  acc.fatura = 0;
  const lines = await getExpenseLines();
  lines.push({
    id: genId(), label: 'Pagamento fatura — ' + acc.label, value: valor,
    date: dkey(new Date()), time: pad(new Date().getHours())+':'+pad(new Date().getMinutes()),
    recorrencia: 'none', categoria: 'outros', method: 'pix', bank: acc.bank, createdAt: Date.now()
  });
  await storeSet('accounts_v2', accounts);
  await storeSet('expense_lines_v4', lines);
  document.getElementById('accountModalOverlay').classList.remove('open');
  renderFinance();
};

/* ---- Período do Financeiro (Dia/Semana/Mês/Ano) ---- */
let finPeriod = 'month';
document.querySelectorAll('#finPeriodNav .apill').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('#finPeriodNav .apill').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    finPeriod = b.dataset.period;
    renderFinance();
  };
});
function periodRange(period, now){
  if (period==='day') return { start:new Date(now.getFullYear(),now.getMonth(),now.getDate()), end:new Date(now.getFullYear(),now.getMonth(),now.getDate()) };
  if (period==='week'){ const s=startOfWeek(now); return { start:s, end:addDays(s,6) }; }
  if (period==='year') return { start:new Date(now.getFullYear(),0,1), end:new Date(now.getFullYear(),11,31) };
  return { start:new Date(now.getFullYear(),now.getMonth(),1), end:new Date(now.getFullYear(),now.getMonth()+1,0) };
}
function periodLabel(period){
  return { day:'do dia', week:'da semana', month:'do mês', year:'do ano' }[period];
}
function prorate(monthlyValue, period){
  if (period==='day') return monthlyValue/30;
  if (period==='week') return monthlyValue/4.345;
  if (period==='year') return monthlyValue*12;
  return monthlyValue;
}
function inRange(dateStr, range){
  const d = new Date(dateStr+'T00:00:00');
  return dnum(d) >= dnum(range.start) && dnum(d) <= dnum(range.end);
}
/**
 * Totais e gráficos consideram o compromisso do período corrente, sem
 * inflar com meses futuros: Dia/Semana/Mês mostram o período completo
 * (inclusive o que ainda vai cair até o fim dele), e o Ano é cortado no
 * fim do MÊS atual — agosto em diante só entra quando chegar.
 */
function clampRangeToToday(range, now){
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth()+1, 0);
  if (dnum(range.end) <= dnum(endOfCurrentMonth)) return range;
  return { start: range.start, end: endOfCurrentMonth };
}
/** Prorata de valores mensais sem data, respeitando só o tempo já decorrido do período. */
function prorateElapsed(monthlyValue, period, now){
  if (period==='year') return monthlyValue * (now.getMonth() + 1);
  return prorate(monthlyValue, period);
}

function clampDayOfMonth(year, month, day){
  const lastDay = new Date(year, month+1, 0).getDate();
  return Math.min(day, lastDay);
}
/**
 * Retorna as datas em que uma despesa efetivamente ocorre dentro de um período.
 * Despesas sem recorrência: só a própria data, se cair no período.
 * Despesas mensais: uma ocorrência por mês do período, no mesmo dia (ajustado se o mês for mais curto).
 */
function expenseOccurrencesInRange(exp, range){
  if (!exp.date) return [];
  const anchor = new Date(exp.date+'T00:00:00');
  if (exp.recorrencia !== 'mensal'){
    return inRange(exp.date, range) ? [anchor] : [];
  }
  const dayOfMonth = anchor.getDate();
  const occurrences = [];
  let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const endCursor = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  let guard = 0;
  while (dnum(cursor) <= dnum(endCursor) && guard < 600){
    guard++;
    const occDay = clampDayOfMonth(cursor.getFullYear(), cursor.getMonth(), dayOfMonth);
    const occDate = new Date(cursor.getFullYear(), cursor.getMonth(), occDay);
    if (dnum(occDate) >= dnum(anchor) && dnum(occDate) >= dnum(range.start) && dnum(occDate) <= dnum(range.end)){
      occurrences.push(occDate);
    }
    cursor.setMonth(cursor.getMonth()+1);
  }
  return occurrences;
}
function expenseTotalInRange(exp, range){
  return expenseOccurrencesInRange(exp, range).length * Number(exp.value||0);
}
function expenseTimeOf(exp){
  if (exp.time) return exp.time;
  if (exp.createdAt) { const d = new Date(exp.createdAt); return pad(d.getHours())+':'+pad(d.getMinutes()); }
  return '12:00';
}
function expenseHourOf(exp){
  return Number(expenseTimeOf(exp).split(':')[0]);
}
/** Lista achatada de {exp, date} pra cada ocorrência de cada despesa dentro do período (só despesas com data). */
function expenseOccurrenceEntries(expLines, range){
  const out = [];
  expLines.forEach(e=>{
    if (!e.date) return;
    expenseOccurrencesInRange(e, range).forEach(date=> out.push({ exp: e, date }));
  });
  return out;
}
/**
 * Soma o valor de cada despesa dentro do período, agrupado pela chave de keyFn.
 * Despesas com data contam pelo número real de ocorrências no período; despesas
 * sem data (fixas mensais sem dia definido) entram prorateadas pro período,
 * do mesmo jeito que já acontece no resumo do topo.
 */
function bucketPeriodTotals(expLines, range, period, keyFn, now){
  const totals = {};
  expLines.forEach(e=>{
    const key = keyFn(e);
    if (e.date){
      const occ = expenseOccurrencesInRange(e, range).length;
      if (occ>0) totals[key] = (totals[key]||0) + occ*Number(e.value||0);
    } else {
      totals[key] = (totals[key]||0) + prorateElapsed(Number(e.value||0), period, now);
    }
  });
  return totals;
}

const CATEGORIA_LABEL = { moradia:'Moradia', transporte:'Transporte', alimentacao:'Alimentação', lazer:'Lazer', saude:'Saúde', educacao:'Educação', assinaturas:'Assinaturas', financiamento:'Financiamento', outros:'Outros' };

/* ---- Metas de gasto por categoria ---- */
async function renderGoals(expLines, now){
  const box = document.getElementById('goalsList');
  const goals = await storeGet('budget_goals', {});
  const keys = Object.keys(goals).filter(k=>Number(goals[k])>0);
  if (keys.length===0){
    box.innerHTML = emptyCta('Defina limites de gasto por categoria e acompanhe o mês de perto.', '+ Definir metas', 'btnEditGoals');
    return;
  }
  const monthRange = clampRangeToToday(periodRange('month', now), now);
  const spentByCat = bucketPeriodTotals(expLines, monthRange, 'month', e=>e.categoria||'outros', now);
  box.innerHTML = keys.map(k=>{
    const goal = Number(goals[k]);
    const spent = spentByCat[k]||0;
    const pct = Math.min(100, Math.round(spent/goal*100));
    const cls = spent>goal ? 'over' : (spent>=goal*0.8 ? 'warn' : '');
    return `<div class="goalrow ${cls}">
      <div class="toprow"><div class="cat">${CATEGORIA_LABEL[k]||k}</div><div class="nums">${fmtMoney(spent)} / ${fmtMoney(goal)}${spent>goal?' · estourou':''}</div></div>
      <div class="goalbar"><div style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}
document.getElementById('btnEditGoals').onclick = async ()=>{
  const goals = await storeGet('budget_goals', {});
  document.getElementById('goalsInputs').innerHTML = Object.entries(CATEGORIA_LABEL).map(([k,label])=>
    `<div class="goalinput-row"><label>${label}</label><input type="number" step="0.01" min="0" data-goal="${k}" placeholder="sem meta" value="${goals[k]||''}"></div>`
  ).join('');
  document.getElementById('goalsModalOverlay').classList.add('open');
};
document.getElementById('goalsCancel').onclick = ()=> document.getElementById('goalsModalOverlay').classList.remove('open');
document.getElementById('goalsSave').onclick = async ()=>{
  const goals = {};
  document.querySelectorAll('#goalsInputs input[data-goal]').forEach(inp=>{
    const v = Number(inp.value);
    if (v>0) goals[inp.dataset.goal] = v;
  });
  await storeSet('budget_goals', goals);
  document.getElementById('goalsModalOverlay').classList.remove('open');
  renderFinance();
  toast('Metas salvas');
};

async function renderFinance(){
  const entries = await storeGet('ifood-entries', []);
  const expLines = await getExpenseLines();
  const incLines = await getIncomeLines();
  const accounts = await getAccounts();
  const now = new Date();
  const activePage = document.querySelector('.fpage.active').id;

  const mk = monthKey();
  const monthEntries = entries.filter(e=>e.date.startsWith(mk));
  const ifoodTotal = monthEntries.reduce((s,e)=>s+Number(e.valor||0),0);
  const incomeFromLines = incLines.filter(l=>isIncomeActive(l,now)).reduce((s,l)=>s+Number(l.value||0),0);
  const income = incomeFromLines + ifoodTotal;
  const outflow = expLines.reduce((s,e)=>s+Number(e.value||0),0);
  const saldo = income-outflow;
  const hasVariableIncome = entries.length>0 || incLines.some(l=>l.type==='variavel');

  if (activePage === 'fpage-inicio'){
    const range = periodRange(finPeriod, now);
    const aggRange = clampRangeToToday(range, now);
    const ifoodPeriod = entries.filter(e=>inRange(e.date, aggRange)).reduce((s,e)=>s+Number(e.valor||0),0);
    const datedExpPeriod = expLines.filter(e=>e.date).reduce((s,e)=>s+expenseTotalInRange(e, aggRange),0);
    const undatedExpMonthly = expLines.filter(e=>!e.date).reduce((s,e)=>s+Number(e.value||0),0);
    const incomeFixedPeriod = incLines.filter(l=>isIncomeActive(l,now) && l.type!=='variavel').reduce((s,l)=>s+prorateElapsed(Number(l.value||0), finPeriod, now),0);
    const incomeVariavelLinePeriod = incLines.filter(l=>isIncomeActive(l,now) && l.type==='variavel').reduce((s,l)=>s+prorateElapsed(Number(l.value||0), finPeriod, now),0);
    const entradasPeriodo = incomeFixedPeriod + incomeVariavelLinePeriod + ifoodPeriod;
    const saidasPeriodo = datedExpPeriod + prorateElapsed(undatedExpMonthly, finPeriod, now);
    const saldoPeriodo = entradasPeriodo - saidasPeriodo;

    const saldoEl = document.getElementById('finSaldoBig');
    saldoEl.textContent = fmtMoney(saldoPeriodo); saldoEl.className = 'big ' + (saldoPeriodo>=0?'sage':'brick');
    document.getElementById('finSaldoLbl').textContent = 'Saldo ' + periodLabel(finPeriod);
    document.getElementById('finRow3').innerHTML = `
      <div class="fc"><div class="v">${fmtMoney(entradasPeriodo)}</div><div class="l">Entradas ${periodLabel(finPeriod)}</div></div>
      <div class="fc"><div class="v">${fmtMoney(saidasPeriodo)}</div><div class="l">Saídas ${periodLabel(finPeriod)}</div></div>
      <div class="fc"><div class="v" style="color:var(--sage)">${fmtMoney(ifoodPeriod)}</div><div class="l">Variável ${periodLabel(finPeriod)}</div></div>`;

    const contasSaldo = accounts.filter(a=>(a.tipo||'conta')==='conta').reduce((s,a)=>s+Number(a.saldo||0),0);
    const cartoesFatura = accounts.filter(a=>a.tipo==='cartao').reduce((s,a)=>s+Number(a.fatura||0),0);
    const nContas = accounts.filter(a=>(a.tipo||'conta')==='conta').length;
    const nCartoes = accounts.filter(a=>a.tipo==='cartao').length;
    document.getElementById('accTotalLine').innerHTML =
      `<span style="color:var(--sage)">${fmtMoney(contasSaldo)}</span> em ${nContas} ${nContas===1?'conta':'contas'}` +
      (nCartoes>0 ? ` &nbsp;·&nbsp; <span style="color:var(--brick)">${fmtMoney(cartoesFatura)}</span> em fatura (${nCartoes} ${nCartoes===1?'cartão':'cartões'})` : '');
    const accBox = document.getElementById('accountLines');
    if (accounts.length===0){ accBox.innerHTML = emptyCta('Cadastre suas contas e cartões pra acompanhar saldo e fatura.', '+ Adicionar conta', 'btnOpenAccModal'); }
    else {
      accBox.innerHTML = accounts.map(a=>{
        const isCartao = a.tipo==='cartao';
        const valHtml = isCartao
          ? `<div class="val" style="color:var(--brick)">${fmtMoney(a.fatura)}</div>`
          : `<div class="val">${fmtMoney(a.saldo)}</div>`;
        const subHtml = isCartao
          ? `Cartão de crédito · limite ${fmtMoney(a.limite)}`
          : bankById(a.bank).name;
        return `<div class="acccard" data-id="${a.id}">
          ${bankAvatarHtml(a.bank)}
          <div class="info"><div class="ttl">${esc(a.label)} ${a.principal?'<span class="badge b-principal">Principal</span>':''}</div>
            <div class="sub">${subHtml}</div>
          </div>
          ${valHtml}
        </div>`;
      }).join('');
      accBox.querySelectorAll('.acccard').forEach(card=>{
        card.onclick = ()=>{ const a = accounts.find(x=>x.id===card.dataset.id); if (a) openAccountEdit(a); };
      });
    }

    renderDashCharts(entries, expLines, incLines, ifoodTotal, now, finPeriod, range, aggRange);
  }

  if (activePage === 'fpage-metas'){
    await renderGoals(expLines, now);
  }

  if (activePage === 'fpage-entradas'){
    const incBox = document.getElementById('incomeLines');
    const incQ = (document.getElementById('incSearch').value||'').toLowerCase().trim();
    const incShown = incQ
      ? incLines.filter(l=> (l.label||'').toLowerCase().includes(incQ) || (TYPE_LABEL[l.type]||'').toLowerCase().includes(incQ))
      : incLines;
    if (incLines.length===0){ incBox.innerHTML = emptyCta('Cadastre sua renda fixa ou temporária pro saldo fazer sentido.', '+ Cadastrar renda', 'btnOpenIncModal'); }
    else if (incShown.length===0){ incBox.innerHTML = '<div class="empty">Nada encontrado pra "' + esc(incQ) + '".</div>'; }
    else {
      incBox.innerHTML = incShown.map(l=>{
        const active = isIncomeActive(l, now);
        let sub = '';
        if (l.type==='temporaria'){
          if (!l.endDate) sub = 'sem data de término definida';
          else if (!active) sub = 'expirou em ' + l.endDate.split('-').reverse().join('/');
          else { const days = Math.ceil((new Date(l.endDate+'T00:00:00') - now)/86400000); sub = 'até ' + l.endDate.split('-').reverse().join('/') + ' · ' + days + ' dias restantes'; }
        } else { sub = TYPE_LABEL[l.type]; }
        const regDate = l.createdAt ? new Date(l.createdAt).toLocaleDateString('pt-BR') : '';
        return `<div class="inccard ${!active?'inactive':''}" data-id="${l.id}">
          <div class="typedot b-${l.type}"></div>
          <div class="info"><div class="ttl">${esc(l.label)}</div><div class="sub ${!active?'expired':''}">${sub}${regDate?' · cadastrada em '+regDate:''}</div></div>
          <div class="val">${fmtMoney(l.value)}</div>
        </div>`;
      }).join('');
      incBox.querySelectorAll('.inccard').forEach(card=>{
        card.onclick = ()=>{ const l = incShown.find(x=>x.id===card.dataset.id); if (l) openIncomeEdit(l); };
      });
    }

    document.getElementById('ifoodDate').value = document.getElementById('ifoodDate').value || dkey(new Date());
    const list = document.getElementById('ifoodList');
    if(entries.length===0){ list.innerHTML = '<div class="empty">Nenhum lançamento ainda.</div>'; }
    else {
      const sorted = [...entries].sort((a,b)=> b.date.localeCompare(a.date));
      list.innerHTML = sorted.slice(0,30).map(e=>`
        <div class="ledger-row"><div class="d">${relDate(e.date)}</div><div class="lbl"></div>
        <div class="km">${e.km? e.km+' km':''}</div><div class="val sage">${fmtMoney(Number(e.valor))}</div>
        <button class="del" data-date="${e.date}" data-valor="${e.valor}" data-km="${e.km||''}">✕</button></div>`).join('');
      list.querySelectorAll('.del').forEach(btn=>{
        btn.onclick = async (ev)=>{ ev.stopPropagation(); let entries = await storeGet('ifood-entries', []);
          entries = entries.filter(e=> !(e.date===btn.dataset.date && String(e.valor)===btn.dataset.valor && String(e.km||'')===btn.dataset.km));
          await storeSet('ifood-entries', entries); renderFinance(); };
      });
    }
  }

  if (activePage === 'fpage-saidas'){
    const expBox = document.getElementById('expenseLines');
    const expQ = (document.getElementById('expSearch').value||'').toLowerCase().trim();
    const expShown = expQ
      ? expLines.filter(e=> (e.label||'').toLowerCase().includes(expQ)
          || (CATEGORIA_LABEL[e.categoria]||'').toLowerCase().includes(expQ)
          || bankById(e.bank).name.toLowerCase().includes(expQ)
          || (METHODS[e.method]||'').toLowerCase().includes(expQ))
      : expLines;
    if (expLines.length===0){ expBox.innerHTML = emptyCta('Nenhuma despesa ainda. Registre a primeira e os gráficos ganham vida.', '+ Registrar despesa', 'btnOpenExpModal'); }
    else if (expShown.length===0){ expBox.innerHTML = '<div class="empty">Nada encontrado pra "' + esc(expQ) + '".</div>'; }
    else {
      expBox.innerHTML = expShown.map(e=>{
        const bank = bankById(e.bank);
        const dateDisp = relDate(e.date);
        const recBadge = e.recorrencia==='mensal' ? '<span class="badge b-fixa">Mensal</span>' : '';
        return `<div class="expcard" data-id="${e.id}">
          ${bankAvatarHtml(e.bank)}
          <div class="info"><div class="ttl">${esc(e.label)}</div>
            <div class="metarow"><span class="badge">${dateDisp}</span>${recBadge}<span class="badge">${CATEGORIA_LABEL[e.categoria]||'Outros'}</span><span class="badge">${METHODS[e.method]}</span><span class="badge">${bank.name}</span></div>
          </div>
          <div class="val">${fmtMoney(e.value)}</div>
        </div>`;
      }).join('');
      expBox.querySelectorAll('.expcard').forEach(card=>{
        card.onclick = ()=>{ const l = expShown.find(x=>x.id===card.dataset.id); if (l) openExpenseEdit(l); };
      });
    }
  }
}
document.addEventListener('click', (e)=>{
  const t = e.target.closest('[data-open]');
  if (t) document.getElementById(t.dataset.open).click();
});
document.getElementById('expSearch').oninput = ()=> renderFinance();
document.getElementById('incSearch').oninput = ()=> renderFinance();

let chartLine=null, chartBank=null, chartMethod=null, chartCategoria=null, chartHistory=null;
function chartAccent(){ return accentHex(); }

const WEEKDAY_MIN = ['D','S','T','Q','Q','S','S'];
function chartBaseOptions(extra){
  return Object.assign({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      x:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10} } },
      y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10} }, beginAtZero:true }
    }
  }, extra||{});
}

function heatCellStyle(val, maxVal, extraClass, isCurrent){
  let bg = 'var(--surface-2)';
  let textColor = '';
  if (val>0 && maxVal>0){
    const t = 0.12 + 0.85*(val/maxVal);
    bg = `rgba(${accentRGBStr()},${t.toFixed(2)})`;
    textColor = t > 0.42 ? '#fff' : 'var(--text)';
  }
  return `class="heatcell ${extraClass||''} ${isCurrent?'today':''}" style="background:${bg};${textColor?`color:${textColor};font-weight:600;`:''}"`;
}

function renderExpenseHeatmap(expLines, now, period, range, aggRange){
  const wrap = document.getElementById('wrapHeat');
  const titleEl = document.getElementById('heatTitle');
  const subEl = document.getElementById('heatSub');

  if (period === 'day'){
    titleEl.textContent = 'Despesas por hora';
    subEl.textContent = 'Quanto mais escuro, mais foi gasto naquele horário. Hoje, ' + pad(now.getDate())+'/'+pad(now.getMonth()+1) + '.';
    const byHour = {};
    expenseOccurrenceEntries(expLines, aggRange).forEach(({exp})=>{
      const h = expenseHourOf(exp);
      byHour[h] = (byHour[h]||0) + Number(exp.value||0);
    });
    const maxVal = Math.max(...Object.values(byHour), 0);
    const nowHour = now.getHours();
    let html = '<div class="heatgrid" style="grid-template-columns:repeat(6,1fr);">';
    for (let h=0; h<24; h++){
      const val = byHour[h] || 0;
      html += `<div ${heatCellStyle(val, maxVal, '', h===nowHour)} title="${pad(h)}h: ${fmtMoney(val)}">${pad(h)}h</div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    return;
  }

  if (period === 'week'){
    titleEl.textContent = 'Despesas por dia';
    subEl.textContent = 'Semana de ' + dkeyDisp(range.start) + ' a ' + dkeyDisp(range.end) + '.';
    const byDate = {};
    expenseOccurrenceEntries(expLines, aggRange).forEach(({exp, date})=>{
      const k = dkey(date);
      byDate[k] = (byDate[k]||0) + Number(exp.value||0);
    });
    const maxVal = Math.max(...Object.values(byDate), 0);
    let html = '<div class="heatgrid">' + WEEKDAY_MIN.map(d=>`<div class="heat-head">${d}</div>`).join('');
    for (let i=0;i<7;i++){
      const d = addDays(range.start, i);
      const k = dkey(d);
      const val = byDate[k] || 0;
      html += `<div ${heatCellStyle(val, maxVal, '', k===dkey(now))} title="${d.getDate()}/${d.getMonth()+1}: ${fmtMoney(val)}">${d.getDate()}</div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    return;
  }

  if (period === 'year'){
    titleEl.textContent = 'Despesas por mês';
    subEl.textContent = 'Quanto mais escuro, mais foi gasto naquele mês. Ano de ' + now.getFullYear() + '.';
    const byMonth = {};
    expenseOccurrenceEntries(expLines, aggRange).forEach(({exp, date})=>{
      const m = date.getMonth();
      byMonth[m] = (byMonth[m]||0) + Number(exp.value||0);
    });
    const maxVal = Math.max(...Object.values(byMonth), 0);
    let html = '<div class="heatgrid" style="grid-template-columns:repeat(6,1fr);">';
    for (let m=0; m<12; m++){
      const val = byMonth[m] || 0;
      html += `<div ${heatCellStyle(val, maxVal, '', m===now.getMonth())} title="${MONTH_ABBR[m]}: ${fmtMoney(val)}">${MONTH_ABBR[m]}</div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    return;
  }

  // period === 'month' (padrão)
  titleEl.textContent = 'Despesas por dia';
  subEl.textContent = 'Quanto mais escuro, mais foi gasto naquele dia. Mês atual.';
  const byDate = {};
  expenseOccurrenceEntries(expLines, aggRange).forEach(({exp, date})=>{
    const k = dkey(date);
    byDate[k] = (byDate[k]||0) + Number(exp.value||0);
  });
  const maxVal = Math.max(...Object.values(byDate), 0);

  const first = range.start;
  const gridStart = new Date(first); gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  let html = '<div class="heatgrid">' + WEEKDAY_MIN.map(d=>`<div class="heat-head">${d}</div>`).join('');
  for (let i=0;i<42;i++){
    const d = new Date(gridStart); d.setDate(gridStart.getDate()+i);
    const inMonth = d.getMonth()===first.getMonth();
    if (!inMonth && i>=35) continue;
    const k = dkey(d);
    const val = byDate[k] || 0;
    html += `<div ${heatCellStyle(val, maxVal, inMonth?'':'outmonth', k===dkey(now))} title="${d.getDate()}/${d.getMonth()+1}: ${fmtMoney(val)}">${d.getDate()}</div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
}
function dkeyDisp(d){ return pad(d.getDate())+'/'+pad(d.getMonth()+1); }

function renderDashCharts(entries, expLines, incLines, ifoodTotal, now, period, range, aggRange){
  renderExpenseHeatmap(expLines, now, period, range, aggRange);

  if (typeof Chart === 'undefined'){
    ['wrapLine','wrapBank','wrapMethod','wrapCategoria'].forEach(id=>{
      document.getElementById(id).innerHTML = '<div class="dashempty">Não consegui carregar a biblioteca de gráficos agora.<br>Verifique sua conexão e recarregue a página.</div>';
    });
    return;
  }
  if (chartLine) { chartLine.destroy(); chartLine=null; }
  if (chartBank) { chartBank.destroy(); chartBank=null; }
  if (chartMethod) { chartMethod.destroy(); chartMethod=null; }
  if (chartCategoria) { chartCategoria.destroy(); chartCategoria=null; }
  if (chartHistory) { chartHistory.destroy(); chartHistory=null; }

  const wrapBank = document.getElementById('wrapBank');
  const byBank = bucketPeriodTotals(expLines, aggRange, period, e=>e.bank, now);
  const bankEntries = Object.entries(byBank);
  if (bankEntries.length===0){
    wrapBank.innerHTML = '<div class="dashempty">Nenhuma despesa cadastrada ainda.<br>Vá em Saídas pra registrar.</div>';
  } else {
    wrapBank.innerHTML = '<canvas id="chartBank"></canvas>';
    try {
      chartBank = new Chart(document.getElementById('chartBank'), {
        type:'bar',
        data:{ labels: bankEntries.map(([k])=>bankById(k).name), datasets:[{ data: bankEntries.map(([,v])=>v), backgroundColor: accentHex(), borderRadius:6, maxBarThickness:60 }] },
        options: chartBaseOptions()
      });
    } catch(err){ console.error('chartBank falhou', err); wrapBank.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
  }

  const wrapMethod = document.getElementById('wrapMethod');
  const byMethod = bucketPeriodTotals(expLines, aggRange, period, e=>e.method, now);
  const methodEntries = Object.entries(byMethod);
  if (methodEntries.length===0){
    wrapMethod.innerHTML = '<div class="dashempty">Nenhuma despesa cadastrada ainda.</div>';
  } else {
    wrapMethod.innerHTML = '<canvas id="chartMethod"></canvas>';
    try {
      chartMethod = new Chart(document.getElementById('chartMethod'), {
        type:'bar',
        data:{ labels: methodEntries.map(([k])=>METHODS[k]), datasets:[{ data: methodEntries.map(([,v])=>v), backgroundColor: accentHex(), borderRadius:6, maxBarThickness:60 }] },
        options: chartBaseOptions({ indexAxis:'y' })
      });
    } catch(err){ console.error('chartMethod falhou', err); wrapMethod.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
  }

  const wrapCategoria = document.getElementById('wrapCategoria');
  const byCategoria = bucketPeriodTotals(expLines, aggRange, period, e=>e.categoria||'outros', now);
  const categoriaEntries = Object.entries(byCategoria).sort((a,b)=>b[1]-a[1]);
  if (categoriaEntries.length===0){
    wrapCategoria.innerHTML = '<div class="dashempty">Nenhuma despesa cadastrada ainda.</div>';
  } else {
    wrapCategoria.innerHTML = '<canvas id="chartCategoria"></canvas>';
    try {
      if (chartCategoria) chartCategoria.destroy();
      chartCategoria = new Chart(document.getElementById('chartCategoria'), {
        type:'bar',
        data:{ labels: categoriaEntries.map(([k])=>CATEGORIA_LABEL[k]||'Outros'), datasets:[{ data: categoriaEntries.map(([,v])=>v), backgroundColor: accentHex(), borderRadius:6, maxBarThickness:60 }] },
        options: chartBaseOptions({ indexAxis:'y' })
      });
    } catch(err){ console.error('chartCategoria falhou', err); wrapCategoria.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
  }

  // histórico mensal: entradas x saídas dos últimos 6 meses, direto dos lançamentos
  const wrapHistory = document.getElementById('wrapHistory');
  try {
    wrapHistory.innerHTML = '<canvas id="chartHistory"></canvas>';
    const months = [];
    for (let i=5;i>=0;i--) months.push(new Date(now.getFullYear(), now.getMonth()-i, 1));
    const labels = months.map(d=>MONTH_ABBR[d.getMonth()] + (d.getFullYear()!==now.getFullYear() ? '/'+String(d.getFullYear()).slice(2) : ''));
    const saidasSerie = months.map(m=>{
      const r = { start: m, end: new Date(m.getFullYear(), m.getMonth()+1, 0) };
      const dated = expLines.filter(e=>e.date).reduce((s2,e)=>s2+expenseTotalInRange(e, r),0);
      const undated = expLines.filter(e=>!e.date && (!e.createdAt || e.createdAt <= r.end.getTime()+86399999)).reduce((s2,e)=>s2+Number(e.value||0),0);
      return dated + undated;
    });
    const entradasSerie = months.map(m=>{
      const r = { start: m, end: new Date(m.getFullYear(), m.getMonth()+1, 0) };
      const fixas = incLines.filter(l=>{
        if (l.createdAt && l.createdAt > r.end.getTime()+86399999) return false;
        if (l.type==='temporaria' && l.endDate && dnum(new Date(l.endDate+'T00:00:00')) < dnum(r.start)) return false;
        return true;
      }).reduce((s2,l)=>s2+Number(l.value||0),0);
      const variavel = entries.filter(e=>inRange(e.date, r)).reduce((s2,e)=>s2+Number(e.valor||0),0);
      return fixas + variavel;
    });
    chartHistory = new Chart(document.getElementById('chartHistory'), {
      type:'bar',
      data:{ labels, datasets:[
        { label:'Entradas', data: entradasSerie, backgroundColor:'#4FB07A', borderRadius:5, maxBarThickness:26 },
        { label:'Saídas', data: saidasSerie, backgroundColor:'#E15C56', borderRadius:5, maxBarThickness:26 }
      ]},
      options: chartBaseOptions({ plugins:{ legend:{display:true, labels:{color:chartTickCol(), font:{size:10}, boxWidth:12}} } })
    });
  } catch(err){ console.error('chartHistory falhou', err); wrapHistory.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }

  const cardLine = document.getElementById('cardLine');
  const hasVariableIncome = entries.length>0 || incLines.some(l=>l.type==='variavel');
  cardLine.style.display = hasVariableIncome ? '' : 'none';
  if (hasVariableIncome){
    const wrapLine = document.getElementById('wrapLine');
    wrapLine.innerHTML = '<canvas id="chartLine"></canvas>';
    const lineSubMap = { day:'Ganhos lançados hoje.', week:'Ganhos lançados por dia, semana atual.', month:'Ganhos lançados por dia, mês atual.', year:'Ganhos lançados por mês, ano atual.' };
    document.getElementById('lineSub').textContent = lineSubMap[period] || lineSubMap.month;
    try {
      let days, labels, totals;
      if (period === 'year'){
        days = Array.from({length:12}, (_,m)=> new Date(now.getFullYear(), m, 1));
        totals = days.map(d=> entries.filter(e=>{ const ed=new Date(e.date+'T00:00:00'); return ed.getFullYear()===d.getFullYear() && ed.getMonth()===d.getMonth(); }).reduce((s,e)=>s+Number(e.valor||0),0));
        labels = days.map(d=>MONTH_ABBR[d.getMonth()]);
      } else {
        const spanDays = Math.round((range.end - range.start)/86400000) + 1;
        days = Array.from({length:spanDays}, (_,i)=> addDays(range.start, i));
        totals = days.map(d=>{ const k=dkey(d); return entries.filter(e=>e.date===k).reduce((s,e)=>s+Number(e.valor||0),0); });
        labels = days.map(d=>pad(d.getDate())+'/'+pad(d.getMonth()+1));
      }
      chartLine = new Chart(document.getElementById('chartLine'), {
        type:'line',
        data:{ labels,
          datasets:[{ data: totals, borderColor: accentHex(), backgroundColor: `rgba(${accentRGBStr()},0.18)`, fill:true, tension:0.35, pointRadius:0, borderWidth:2 }] },
        options: chartBaseOptions({ scales:{ x:{ grid:{display:false}, ticks:{color:chartTickCol(), font:{size:9}, maxTicksLimit:8} }, y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10}} } } })
      });
    } catch(err){ console.error('chartLine falhou', err); wrapLine.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
  }
}

document.getElementById('btnAddIfood').onclick = async ()=>{
  const date = document.getElementById('ifoodDate').value || dkey(new Date());
  const valor = document.getElementById('ifoodValor').value;
  const km = document.getElementById('ifoodKm').value;
  if(!valor) return;
  const entries = await storeGet('ifood-entries', []);
  entries.push({date, valor:Number(valor), km: km?Number(km):null});
  await storeSet('ifood-entries', entries);
  document.getElementById('ifoodValor').value=''; document.getElementById('ifoodKm').value='';
  renderFinance();
};

document.getElementById('btnAnalyze').onclick = async ()=>{
  const btn = document.getElementById('btnAnalyze'); const out = document.getElementById('insightsResult');
  btn.disabled = true; btn.textContent = 'Rodando...'; out.textContent = '';
  await new Promise(r=>setTimeout(r,600));
  out.textContent = 'Prévia: na versão final, o diagnóstico roda pelo Gemini no servidor, olhando sua taxa de agenda cumprida e seu caixa dos últimos 14 dias.';
  btn.disabled = false; btn.textContent = 'Rodar diagnóstico';
};

/* ---- Perfil: mensagens, temas e notificações ---- */
const settingsMsg = document.getElementById('settingsMsg');
function showSettingsMsg(text, isError){
  settingsMsg.textContent = text;
  settingsMsg.style.color = isError ? 'var(--brick)' : 'var(--sage)';
  settingsMsg.style.display = 'block';
}
document.getElementById('btnLogout').onclick = ()=>{ location.href = 'logout.php'; };

function applyPrefs(prefs){
  prefs = prefs || {};
  document.documentElement.dataset.theme = prefs.theme || '';
  document.documentElement.dataset.bg = prefs.bg || '';
  try{ localStorage.setItem('pm_prefs', JSON.stringify({theme:prefs.theme||'', bg:prefs.bg||''})); }catch(e){}
  document.querySelectorAll('#themeGrid .themedot').forEach(d=> d.classList.toggle('sel', (prefs.theme||'')===d.dataset.t));
  document.querySelectorAll('#bgPick .bgopt').forEach(b=> b.classList.toggle('sel', (prefs.bg||'')===b.dataset.b));
}
async function savePrefs(patch){
  const prefs = Object.assign(await storeGet('user_prefs', {}), patch);
  applyPrefs(prefs);
  await storeSet('user_prefs', prefs);
}
document.querySelectorAll('#themeGrid .themedot').forEach(d=>{ d.onclick = ()=> savePrefs({theme: d.dataset.t}); });
document.querySelectorAll('#bgPick .bgopt').forEach(b=>{ b.onclick = ()=> savePrefs({bg: b.dataset.b}); });

async function renderPerfil(){
  settingsMsg.style.display = 'none';
  document.getElementById('totpEnrollBox').style.display = 'none';
  document.getElementById('totpBackupCodesBox').style.display = 'none';
  document.getElementById('totpDisableBox').style.display = 'none';
  applyPrefs(await storeGet('user_prefs', {}));
  refreshTotpStatus();
  const tglB = document.getElementById('tglNotifBrowser');
  const sub = document.getElementById('notifBrowserSub');
  if (!('Notification' in window)){
    tglB.checked = false; tglB.disabled = true;
    sub.textContent = 'Este navegador não suporta notificações.';
  } else {
    tglB.checked = Notification.permission === 'granted' && localStorage.getItem('pm_notif') === '1';
    if (Notification.permission === 'denied') sub.textContent = 'Permissão negada no navegador — libere nas configurações do site pra ativar.';
  }
  try{
    const r = await fetch('api/me.php');
    if (r.ok){
      const me = await r.json();
      document.getElementById('pfUsername').textContent = me.username;
      document.getElementById('pfEmail').textContent = me.email || 'sem e-mail cadastrado';
      renderAvatar(me);
      setTopbarAvatar(me.avatar);
      document.getElementById('tglNotifEmail').checked = !!me.notify_email;
      document.getElementById('tglNotifEmail').disabled = !me.email;
    }
  }catch(e){}
}

function setTopbarAvatar(avatar){
  if (!avatar) return;
  const src = avatar.startsWith('http') ? avatar : avatar + '?v=' + Date.now();
  document.getElementById('tabPerfil').innerHTML = `<img class="tab-avatar" src="${esc(src)}" alt="Perfil">`;
}
function renderAvatar(me){
  const el = document.getElementById('pfAvatar');
  if (me.avatar){
    const src = me.avatar.startsWith('http') ? me.avatar : me.avatar + '?v=' + Date.now();
    el.innerHTML = `<img src="${esc(src)}" alt="Foto de perfil">`;
  } else {
    el.textContent = (me.username||'?').slice(0,1);
  }
}
document.getElementById('pfAvatar').onclick = ()=> document.getElementById('avatarFile').click();
document.getElementById('btnChangeAvatar').onclick = ()=> document.getElementById('avatarFile').click();
document.getElementById('avatarFile').onchange = async (ev)=>{
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  if (file.size > 4*1024*1024){ showSettingsMsg('Imagem muito grande (máx 4MB).', true); return; }
  const fd = new FormData();
  fd.append('avatar', file);
  try{
    const r = await fetch('api/avatar.php', { method:'POST', headers:{'X-CSRF-Token': window.CSRF_TOKEN}, body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'upload failed');
    renderAvatar({ avatar: j.avatar });
    setTopbarAvatar(j.avatar);
    showSettingsMsg('Foto de perfil atualizada.', false);
  } catch(e){ showSettingsMsg('Não consegui enviar a foto: ' + (e.message||''), true); }
};

document.getElementById('tglNotifBrowser').onchange = async (ev)=>{
  const tgl = ev.target;
  if (tgl.checked){
    const perm = await Notification.requestPermission();
    if (perm !== 'granted'){ tgl.checked = false; showSettingsMsg('Permissão de notificação não concedida.', true); return; }
    localStorage.setItem('pm_notif', '1');
    new Notification('Orby', { body: 'Notificações ativadas! Você será avisado quando uma tarefa começar.', icon: 'assets/icon-192.png' });
  } else {
    localStorage.setItem('pm_notif', '0');
  }
};

document.getElementById('tglNotifEmail').onchange = async (ev)=>{
  const tgl = ev.target;
  try{
    const r = await fetch('api/prefs.php', {
      method:'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify({ notify_email: tgl.checked })
    });
    if (!r.ok) throw new Error('prefs failed');
    showSettingsMsg(tgl.checked ? 'Notificações por e-mail ativadas.' : 'Notificações por e-mail desativadas.', false);
  }catch(e){ tgl.checked = !tgl.checked; showSettingsMsg('Não consegui salvar agora, tenta de novo.', true); }
};
document.getElementById('btnExportBackup').onclick = async ()=>{
  try{
    const r = await fetch('api/export.php');
    if (!r.ok) throw new Error('export failed');
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orby-backup-' + dkey(new Date()) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showSettingsMsg('Backup baixado com sucesso.', false);
  } catch(e){ showSettingsMsg('Não consegui gerar o backup agora.', true); }
};
document.getElementById('btnExportCsv').onclick = async ()=>{
  const expLines = await getExpenseLines();
  const incLines = await getIncomeLines();
  const entries = await storeGet('ifood-entries', []);
  const csvCell = v => '"' + String(v??'').replace(/"/g,'""') + '"';
  const num = v => String(Number(v||0)).replace('.', ',');
  const rows = [['tipo','descricao','valor','data','hora','categoria','forma_pagamento','banco','recorrencia']];
  expLines.forEach(e=> rows.push(['despesa', e.label, num(e.value), e.date||'', expenseTimeOf(e), CATEGORIA_LABEL[e.categoria]||'Outros', METHODS[e.method]||'', bankById(e.bank).name, e.recorrencia==='mensal'?'mensal':'']));
  incLines.forEach(l=> rows.push(['renda', l.label, num(l.value), l.endDate||'', '', TYPE_LABEL[l.type]||'', '', '', l.type==='temporaria'?'':'mensal']));
  entries.forEach(e=> rows.push(['renda variavel', e.km?('iFood '+e.km+' km'):'lançamento', num(e.valor), e.date||'', '', '', '', '', '']));
  const csv = '﻿' + rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = url; a.download = 'orby-relatorio-' + dkey(new Date()) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showSettingsMsg('CSV exportado — abre direto no Excel/Planilhas.', false);
};
document.getElementById('btnImportBackup').onclick = ()=> document.getElementById('importBackupFile').click();
document.getElementById('importBackupFile').onchange = async (ev)=>{
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    const r = await fetch('api/import.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error('import failed');
    showSettingsMsg('Backup restaurado. Recarregando...', false);
    setTimeout(()=> location.reload(), 1200);
  } catch(e){ showSettingsMsg('Arquivo inválido ou falha ao restaurar.', true); }
};

async function refreshTotpStatus(){
  const statusEl = document.getElementById('totpStatus');
  const btnEnable = document.getElementById('btnEnable2fa');
  const btnDisable = document.getElementById('btnDisable2fa');
  try{
    const r = await fetch('api/me.php');
    if (!r.ok) throw new Error('me failed');
    const me = await r.json();
    if (me.totp_enabled){
      statusEl.textContent = 'Ativado';
      btnDisable.style.display = '';
      btnEnable.style.display = 'none';
    } else {
      statusEl.textContent = 'Desativado';
      btnEnable.style.display = '';
      btnDisable.style.display = 'none';
    }
  } catch(e){ statusEl.textContent = 'Não consegui checar o status agora.'; }
}

document.getElementById('btnEnable2fa').onclick = async ()=>{
  try{
    const r = await fetch('api/totp-enroll.php', { method:'POST', headers:{'X-CSRF-Token': window.CSRF_TOKEN} });
    if (!r.ok) throw new Error('enroll failed');
    const j = await r.json();
    document.getElementById('totpManualKey').textContent = j.secret;
    const qrBox = document.getElementById('totpQr');
    qrBox.innerHTML = '';
    new QRCode(qrBox, { text: j.otpauth_uri, width: 180, height: 180 });
    document.getElementById('totpCode').value = '';
    document.getElementById('totpEnrollBox').style.display = 'block';
    document.getElementById('btnEnable2fa').style.display = 'none';
  } catch(e){ showSettingsMsg('Não consegui iniciar a ativação do 2FA.', true); }
};

document.getElementById('btnConfirm2fa').onclick = async ()=>{
  const code = document.getElementById('totpCode').value.trim();
  try{
    const r = await fetch('api/totp-confirm.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify({ code })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'confirm failed');
    document.getElementById('totpEnrollBox').style.display = 'none';
    document.getElementById('totpBackupCodesList').innerHTML = j.backup_codes.map(c=>`<div>${c}</div>`).join('');
    document.getElementById('totpBackupCodesBox').style.display = 'block';
    showSettingsMsg('2FA ativado com sucesso.', false);
    refreshTotpStatus();
  } catch(e){ showSettingsMsg('Código inválido, tenta de novo.', true); }
};

document.getElementById('btnDisable2fa').onclick = ()=>{
  document.getElementById('totpDisablePassword').value = '';
  document.getElementById('totpDisableBox').style.display = 'block';
  document.getElementById('btnDisable2fa').style.display = 'none';
};

document.getElementById('btnConfirmDisable2fa').onclick = async ()=>{
  const password = document.getElementById('totpDisablePassword').value;
  try{
    const r = await fetch('api/totp-disable.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify({ password })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'disable failed');
    document.getElementById('totpDisableBox').style.display = 'none';
    showSettingsMsg('2FA desativado.', false);
    refreshTotpStatus();
  } catch(e){ showSettingsMsg('Senha incorreta ou falha ao desativar.', true); }
};

/* ---- Pickers do Orby: substituem os popups nativos de select/data/hora ---- */
function closePickers(){ document.querySelectorAll('.orby-pop').forEach(p=>p.remove()); }
document.addEventListener('mousedown', (e)=>{
  if (!e.target.closest('.orby-pop') && !e.target.closest('.pick-trigger')) closePickers();
});
function placePop(pop, anchor){
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
  let top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = r.top - ph - 6;
  top = Math.max(8, Math.min(top, window.innerHeight - ph - 8));
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function enhanceSelects(){
  document.querySelectorAll('.modal select').forEach(sel=>{
    if (sel.dataset.enhanced) return;
    sel.dataset.enhanced = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pickbtn pick-trigger';
    sel.parentNode.insertBefore(btn, sel.nextSibling);
    sel.style.display = 'none';
    const sync = ()=>{
      btn.textContent = sel.options[sel.selectedIndex]?.text || '—';
      btn.disabled = sel.disabled;
    };
    sel.__syncPick = sync;
    sync();
    sel.addEventListener('change', sync);
    new MutationObserver(sync).observe(sel, {childList:true, attributes:true});
    btn.onclick = ()=>{
      sync();
      if (document.querySelector('.orby-pop')) { closePickers(); return; }
      const pop = document.createElement('div');
      pop.className = 'orby-pop';
      const list = document.createElement('div');
      list.className = 'pop-list';
      [...sel.options].forEach(opt=>{
        const o = document.createElement('div');
        o.className = 'pop-opt' + (opt.value===sel.value ? ' sel' : '');
        o.textContent = opt.text;
        o.onclick = ()=>{
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change'));
          closePickers();
        };
        list.appendChild(o);
      });
      pop.appendChild(list);
      placePop(pop, btn);
      pop.style.minWidth = btn.getBoundingClientRect().width + 'px';
      list.querySelector('.sel')?.scrollIntoView({block:'center'});
    };
  });
}
function syncAllPickBtns(){
  document.querySelectorAll('.modal select[data-enhanced]').forEach(sel=> sel.__syncPick && sel.__syncPick());
}

function openCalPop(inp){
  closePickers();
  let view = inp.value ? new Date(inp.value+'T00:00:00') : new Date();
  const pop = document.createElement('div');
  pop.className = 'orby-pop';
  function draw(){
    const y = view.getFullYear(), m = view.getMonth();
    const first = new Date(y, m, 1);
    const gridStart = startOfWeek(first);
    const today = dkey(new Date());
    let html = '<div class="cal-wrap"><div class="cal-head"><div class="cal-title">' + MONTH_NAMES[m] + ' de ' + y + '</div>'
      + '<div class="cal-nav"><button type="button" data-nav="-1">‹</button><button type="button" data-nav="1">›</button></div></div>'
      + '<div class="cal-grid">' + WEEKDAY_MIN.map(d=>'<div class="cal-dh">'+d+'</div>').join('');
    for (let i=0;i<42;i++){
      const d = addDays(gridStart, i);
      const k = dkey(d);
      const out = d.getMonth()!==m;
      if (out && i>=35) continue;
      html += '<div class="cal-d'+(out?' out':'')+(k===today?' today':'')+(k===inp.value?' sel':'')+'" data-d="'+k+'">'+d.getDate()+'</div>';
    }
    html += '</div><div class="cal-foot"><button type="button" data-act="clear">Limpar</button><button type="button" data-act="today">Hoje</button></div></div>';
    pop.innerHTML = html;
    pop.querySelectorAll('[data-nav]').forEach(b=>{ b.onclick = ()=>{ view.setMonth(view.getMonth()+Number(b.dataset.nav)); draw(); }; });
    pop.querySelectorAll('.cal-d').forEach(c=>{ c.onclick = ()=>{ setVal(c.dataset.d); }; });
    pop.querySelector('[data-act="clear"]').onclick = ()=> setVal('');
    pop.querySelector('[data-act="today"]').onclick = ()=> setVal(dkey(new Date()));
  }
  function setVal(v){
    inp.value = v;
    inp.dispatchEvent(new Event('input'));
    inp.dispatchEvent(new Event('change'));
    closePickers();
  }
  draw();
  placePop(pop, inp);
}

function openTimePop(inp){
  closePickers();
  const cur = (inp.value || '12:00').split(':');
  let selH = cur[0], selM = cur[1];
  const pop = document.createElement('div');
  pop.className = 'orby-pop';
  const wrap = document.createElement('div');
  wrap.className = 'time-wrap';
  const colH = document.createElement('div'); colH.className = 'time-col';
  const colM = document.createElement('div'); colM.className = 'time-col';
  function setVal(){
    inp.value = selH + ':' + selM;
    inp.dispatchEvent(new Event('input'));
    inp.dispatchEvent(new Event('change'));
  }
  for (let h=0; h<24; h++){
    const v = pad(h);
    const o = document.createElement('div');
    o.className = 'pop-opt' + (v===selH?' sel':'');
    o.textContent = v;
    o.onclick = ()=>{ selH = v; colH.querySelectorAll('.pop-opt').forEach(x=>x.classList.toggle('sel', x.textContent===v)); setVal(); };
    colH.appendChild(o);
  }
  for (let mn=0; mn<60; mn+=5){
    const v = pad(mn);
    const o = document.createElement('div');
    o.className = 'pop-opt' + (v===selM?' sel':'');
    o.textContent = v;
    o.onclick = ()=>{ selM = v; setVal(); closePickers(); };
    colM.appendChild(o);
  }
  wrap.appendChild(colH); wrap.appendChild(colM);
  pop.appendChild(wrap);
  const foot = document.createElement('div');
  foot.className = 'time-foot';
  const now = document.createElement('button');
  now.type = 'button'; now.textContent = 'Agora';
  now.onclick = ()=>{ const n = new Date(); selH = pad(n.getHours()); selM = pad(n.getMinutes()); setVal(); closePickers(); };
  foot.appendChild(now);
  pop.appendChild(foot);
  placePop(pop, inp);
  colH.querySelector('.sel')?.scrollIntoView({block:'center'});
  colM.querySelector('.sel')?.scrollIntoView({block:'center'});
}

function enhanceDateTimeInputs(){
  document.querySelectorAll('input[type=date]').forEach(inp=>{
    if (inp.dataset.enhanced) return;
    inp.dataset.enhanced = '1';
    inp.readOnly = true;
    inp.classList.add('pick-trigger');
    inp.addEventListener('click', ()=> openCalPop(inp));
  });
  document.querySelectorAll('input[type=time]').forEach(inp=>{
    if (inp.dataset.enhanced) return;
    inp.dataset.enhanced = '1';
    inp.readOnly = true;
    inp.classList.add('pick-trigger');
    inp.addEventListener('click', ()=> openTimePop(inp));
  });
}
enhanceSelects();
enhanceDateTimeInputs();

document.getElementById('fabNew').onclick = ()=> document.getElementById('btnOpenExpModal').click();

/* modais: Esc fecha, clique no fundo fecha, foco no primeiro campo, Enter salva */
document.querySelectorAll('.modal-overlay').forEach(ov=>{
  ov.addEventListener('mousedown', (e)=>{
    if (e.target!==ov) return;
    if (document.querySelector('.orby-pop')){ closePickers(); return; }
    ov.classList.remove('open');
  });
  new MutationObserver(()=>{
    if (ov.classList.contains('open')){
      syncAllPickBtns();
      const f = ov.querySelector('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=date]):not([type=time])');
      if (f) setTimeout(()=>f.focus(), 60);
    } else {
      closePickers();
    }
  }).observe(ov, {attributes:true, attributeFilter:['class']});
});
document.addEventListener('keydown', (e)=>{
  if (e.key !== 'Escape') return;
  if (document.querySelector('.orby-pop')){ closePickers(); return; }
  const open = document.querySelector('.modal-overlay.open');
  if (open) open.classList.remove('open');
});
document.querySelectorAll('.modal').forEach(m=>{
  m.addEventListener('keydown', (e)=>{
    if (e.key==='Enter' && e.target.tagName==='INPUT' && e.target.type!=='checkbox'){
      const btn = m.querySelector('.btn-primary');
      if (btn){ e.preventDefault(); btn.click(); }
    }
  });
});

/* revalida os dados ao voltar pro app (outro aparelho pode ter mexido) */
let __lastReval = Date.now();
document.addEventListener('visibilitychange', async ()=>{
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - __lastReval < 60000) return;
  __lastReval = Date.now();
  try{
    const r = await fetch('api/data.php?all=1');
    if (!r.ok) return;
    const fresh = await r.json();
    if (JSON.stringify(fresh) !== JSON.stringify(__cache)){
      __cache = fresh;
      tasks = __cache.tasks_v6 || [];
      checklist = __cache.checklist_v6 || {};
      applyPrefs(__cache.user_prefs || {});
      const page = document.querySelector('.sectiontab.active')?.dataset.page;
      if (page==='financeiro') renderFinance();
      if (page==='agenda'){ renderAgenda(); renderHomeCharts(); }
      renderHero();
    }
  }catch(e){}
});

async function init(){
  document.getElementById('ifoodDate').value = dkey(new Date());
  applyPrefs(await storeGet('user_prefs', {}));
  await ensureSeeded();
  renderHomeCharts();
  renderAgenda();
  setInterval(()=>{ renderHero(); if (document.getElementById('apage-inicio').classList.contains('active')) renderHomeCharts(); }, 20000);
  if ('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
  fetch('api/me.php').then(r=>r.ok?r.json():null).then(me=>{ if(me) setTopbarAvatar(me.avatar); }).catch(()=>{});
}
init();
</script>
</body>
</html>
