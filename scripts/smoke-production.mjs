// Cross-platform public smoke, read-only, without credentials or personal data.
const origin = (process.env.LEVELOS_SMOKE_ORIGIN || 'https://lvlos.com').replace(/\/$/, '');
const expectedCommit = process.argv[2] || process.env.LEVELOS_EXPECTED_COMMIT || '';
const cases = [
  ['/', [200, 302]], ['/login.php', [200]], ['/api/me.php', [401]],
  ['/config.php', [403, 404]], ['/schema.sql', [403, 404]],
  ['/tests/run.php', [403, 404]], ['/dev-router.php', [403, 404]],
  ['/theme-boot.js', [200]], ['/api/health.php', [200]], ['/release.json', [200]],
];
let failures = 0;
for (const [path, allowed] of cases) {
  try {
    const response = await fetch(origin + path, {
      redirect: 'manual', headers: {'Cache-Control': 'no-cache'}, signal: AbortSignal.timeout(12000),
    });
    const passed = allowed.includes(response.status);
    console.log(`${path}: HTTP ${response.status} ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) failures++;
  } catch (error) {
    failures++;
    console.error(`${path}: request failed (${error.name || 'network_error'})`);
  }
}
if (expectedCommit) {
  try {
    const response = await fetch(origin + '/release.json', {
      headers: {'Cache-Control': 'no-cache'}, signal: AbortSignal.timeout(12000),
    });
    const release = await response.json();
    const passed = response.ok && release.application === 'level-os' && release.commit === expectedCommit;
    console.log(`deployed commit: ${passed ? 'MATCH' : 'MISMATCH'}`);
    if (!passed) failures++;
  } catch (_) {
    failures++;
    console.error('deployed commit: release marker invalid');
  }
}
if (failures) {
  console.error(`Public production smoke failed: ${failures} check(s).`);
  process.exitCode = 1;
} else {
  console.log('Public production smoke passed. Authenticated/payment flows require independent validation.');
}
