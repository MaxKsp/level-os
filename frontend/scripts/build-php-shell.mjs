import { readFile, writeFile, unlink } from 'node:fs/promises';

const source = new URL('../dist/index.html', import.meta.url);
const target = new URL('../dist/index.php', import.meta.url);
const html = await readFile(source, 'utf8');
const php = `<?php
require_once __DIR__ . '/auth.php';
$userId = require_login_page();
?>
`;
const csrf = `<meta name="level-os-csrf" content="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">`;
const userScope = `<meta name="level-os-user-scope" content="<?= htmlspecialchars((string)$userId, ENT_QUOTES, 'UTF-8') ?>">`;
const authConfig = `<meta name="level-os-auth-config" content="<?= htmlspecialchars((string)json_encode(supabase_public_config(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT), ENT_QUOTES, 'UTF-8') ?>">`;
const sentryDsn = `<meta name="level-os-sentry-dsn" content="<?= htmlspecialchars((string)(sentry_public_dsn() ?? ''), ENT_QUOTES, 'UTF-8') ?>">`;
const withBootstrap = html.replace('</head>', `  ${csrf}\n  ${userScope}\n  ${authConfig}\n  ${sentryDsn}\n  </head>`);
await writeFile(target, php + withBootstrap, 'utf8');
await unlink(source);
