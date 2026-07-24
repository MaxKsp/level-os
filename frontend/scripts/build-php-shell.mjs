import { readFile, writeFile, unlink } from 'node:fs/promises';

const source = new URL('../dist/index.html', import.meta.url);
const target = new URL('../dist/index.php', import.meta.url);
const html = await readFile(source, 'utf8');
const php = `<?php
require_once __DIR__ . '/auth.php';
$userId = require_login_page();
$cspNonce = security_csp_nonce_attribute();
?>
`;
const nonce = `nonce="<?= $cspNonce ?>"`;
const csrf = `<script ${nonce}>window.CSRF_TOKEN = <?= json_encode(csrf_token(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>`;
const userScope = `<script ${nonce}>window.LEVEL_OS_USER_SCOPE = <?= json_encode((string)$userId, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>`;
const authConfig = `<script ${nonce}>window.LEVEL_OS_AUTH_CONFIG = <?= json_encode(supabase_public_config(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>`;
const sentryDsn = `<script ${nonce}>window.LEVEL_OS_SENTRY_DSN = <?= json_encode(sentry_public_dsn(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>`;
const withBootstrap = html.replace('</head>', `  ${csrf}\n  ${userScope}\n  ${authConfig}\n  ${sentryDsn}\n  </head>`);
const withNonces = withBootstrap.replace(/<script(?![^>]*\bnonce=)/g, `<script ${nonce}`);
await writeFile(target, php + withNonces, 'utf8');
await unlink(source);
