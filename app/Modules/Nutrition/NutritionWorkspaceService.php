<?php
declare(strict_types=1);
require_once __DIR__ . '/NutritionPlanService.php';
final class NutritionWorkspaceConflict extends RuntimeException {}
final class NutritionWorkspaceService {
    private const KEY = 'nutrition_workspace_v1';
    public function __construct(private readonly PDO $db) {}
    public static function empty(): array {
        return ['revision'=>0, 'preferences'=>['favorites'=>[], 'avoids'=>[], 'notes'=>'', 'prepMinutes'=>30, 'shareWithRita'=>false],
            'pantry'=>[], 'recipes'=>[], 'diary'=>[], 'purchases'=>[], 'family'=>[], 'mealChecks'=>[], 'cartChecks'=>[]];
    }
    public function load(int $uid): array {
        $s = $this->db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1');
        $s->execute([$uid, self::KEY]);
        $raw = $s->fetchColumn();
        $data = is_string($raw) ? json_decode($raw, true) : null;
        return is_array($data) ? array_replace(self::empty(), $data) : self::empty();
    }
    private static function str(mixed $v, int $max, bool $required = false): string {
        if (!is_string($v)) throw new InvalidArgumentException('Campo de texto inválido.');
        $v = trim((string)preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v));
        if (mb_strlen($v, 'UTF-8') > $max || ($required && $v === '')) throw new InvalidArgumentException('Texto inválido ou acima do limite.');
        return $v;
    }
    private static function date(mixed $v, bool $optional = false): ?string {
        if ($optional && ($v === null || $v === '')) return null;
        $s = self::str($v, 10, true);
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $s);
        if (!$parsed || $parsed->format('Y-m-d') !== $s) throw new InvalidArgumentException('Data inválida.');
        return $s;
    }
    private static function num(mixed $v, float $min, float $max): float {
        if ((!is_int($v) && !is_float($v)) || !is_finite((float)$v) || $v < $min || $v > $max) throw new InvalidArgumentException('Valor inválido.');
        return round((float)$v, 2);
    }
    private static function choice(mixed $v, array $options): string {
        if (!is_string($v) || !in_array($v, $options, true)) throw new InvalidArgumentException('Opção inválida.');
        return $v;
    }
    private static function id(mixed $v): string {
        $s = self::str($v, 48, true);
        if (!preg_match('/\A[A-Za-z0-9_-]{1,48}\z/D', $s)) throw new InvalidArgumentException('Identificador inválido.');
        return $s;
    }
    private static function list(mixed $v, int $limit, callable $mapper): array {
        if (!is_array($v) || !array_is_list($v) || count($v) > $limit) throw new InvalidArgumentException('Lista inválida.');
        $result = []; $ids = [];
        foreach ($v as $entry) {
            if (!is_array($entry)) throw new InvalidArgumentException('Registro inválido.');
            $item = $mapper($entry);
            if (isset($item['id'])) { if (isset($ids[$item['id']])) throw new InvalidArgumentException('ID duplicado.'); $ids[$item['id']] = true; }
            $result[] = $item;
        }
        return $result;
    }
    private static function words(mixed $v): array {
        if (!is_array($v) || !array_is_list($v) || count($v) > 24) throw new InvalidArgumentException('Preferências inválidas.');
        $items = [];
        foreach ($v as $word) { $name = self::str($word, 60, true); if (!in_array($name, $items, true)) $items[] = $name; }
        return $items;
    }
    private function activePlan(int $uid, mixed $requested): array {
        $active = nutrition_active_plan($this->db, $uid);
        if (!$active || !is_string($requested) || (string)($active['id'] ?? 'legacy') !== $requested) {
            throw new NutritionWorkspaceConflict('O plano ativo mudou. Atualize a página.');
        }
        return $active;
    }
    /** Every mutation has an optimistic revision and locks only this user's row. */
    public function save(int $uid, array $body): array {
        $op = self::str($body['operation'] ?? null, 40, true);
        $revision = $body['revision'] ?? null;
        if (!is_int($revision) || $revision < 0) throw new InvalidArgumentException('Revisão inválida.');
        $driver = (string)$this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $own = !$this->db->inTransaction();
        if ($own) $this->db->beginTransaction();
        try {
            $insert = $driver === 'sqlite' ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
            $this->db->prepare($insert . ' INTO kv_store (user_id,data_key,data_value) VALUES (?,?,?)')
                ->execute([$uid,self::KEY,json_encode(self::empty(), JSON_THROW_ON_ERROR)]);
            $query = 'SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1' . ($driver === 'mysql' ? ' FOR UPDATE' : '');
            $s = $this->db->prepare($query); $s->execute([$uid,self::KEY]);
            $stored = json_decode((string)$s->fetchColumn(), true, 64, JSON_THROW_ON_ERROR);
            if (!is_array($stored)) throw new RuntimeException('Workspace inválido.');
            $next = array_replace(self::empty(), $stored);
            if ($next['revision'] !== $revision) throw new NutritionWorkspaceConflict('Os dados mudaram em outro dispositivo. Atualize e tente de novo.');
            switch ($op) {
                case 'save_preferences':
                    $v = $body['preferences'] ?? null;
                    if (!is_array($v) || !is_bool($v['shareWithRita'] ?? null)) throw new InvalidArgumentException('Preferências inválidas.');
                    $next['preferences'] = [
                        'favorites'=>self::words($v['favorites'] ?? []), 'avoids'=>self::words($v['avoids'] ?? []),
                        'notes'=>self::str($v['notes'] ?? '', 500),
                        'prepMinutes'=>(int)self::num($v['prepMinutes'] ?? 30, 5, 240),
                        'shareWithRita'=>$v['shareWithRita'],
                    ];
                    break;
                case 'save_pantry':
                    $next['pantry'] = self::list($body['items'] ?? null, 100, static fn(array $i): array => [
                        'id'=>self::id($i['id'] ?? null), 'name'=>self::str($i['name'] ?? null, 80, true),
                        'quantity'=>self::num($i['quantity'] ?? null, 0, 10000),
                        'unit'=>self::choice($i['unit'] ?? null, ['un','g','kg','ml','l','pacote']),
                        'category'=>self::choice($i['category'] ?? null, ['hortifruti','proteina','mercearia','laticinios','padaria','bebidas','outros']),
                        'expiresOn'=>self::date($i['expiresOn'] ?? null, true),
                    ]);
                    break;
                case 'save_recipes':
                    $next['recipes'] = self::list($body['items'] ?? null, 60, static fn(array $i): array => [
                        'id'=>self::id($i['id'] ?? null), 'title'=>self::str($i['title'] ?? null, 100, true),
                        'prepMinutes'=>(int)self::num($i['prepMinutes'] ?? null, 1, 480),
                        'portions'=>self::num($i['portions'] ?? null, 1, 24),
                        'ingredients'=>self::list($i['ingredients'] ?? null, 24, static fn(array $v): array => [
                            'name'=>self::str($v['name'] ?? null, 80, true), 'quantity'=>self::str($v['quantity'] ?? null, 40, true),
                        ]),
                        'instructions'=>self::str($i['instructions'] ?? '', 1500),
                    ]);
                    break;
                case 'save_diary':
                    $next['diary'] = self::list($body['items'] ?? null, 180, static fn(array $i): array => [
                        'id'=>self::id($i['id'] ?? null), 'date'=>self::date($i['date'] ?? null),
                        'title'=>self::str($i['title'] ?? null, 100, true),
                        'portion'=>self::str($i['portion'] ?? '', 80), 'note'=>self::str($i['note'] ?? '', 400),
                    ]);
                    break;
                case 'save_purchases':
                    $next['purchases'] = self::list($body['items'] ?? null, 250, static fn(array $i): array => [
                        'id'=>self::id($i['id'] ?? null), 'date'=>self::date($i['date'] ?? null),
                        'description'=>self::str($i['description'] ?? null, 120, true),
                        'amountBRL'=>self::num($i['amountBRL'] ?? null, 0, 1000000),
                        'category'=>self::choice($i['category'] ?? null, ['mercado','restaurante','marmita','outros']),
                    ]);
                    break;
                case 'save_family':
                    $next['family'] = self::list($body['items'] ?? null, 8, static fn(array $i): array => [
                        'id'=>self::id($i['id'] ?? null), 'label'=>self::str($i['label'] ?? null, 60, true),
                        'portionFactor'=>self::num($i['portionFactor'] ?? null, 0.5, 4),
                    ]);
                    break;
                case 'mark_meal':
                case 'mark_cart':
                case 'import_legacy':
                    $plan = $this->activePlan($uid, $body['planId'] ?? null);
                    $planId = (string)($plan['id'] ?? 'legacy');
                    $allowedMeals = [];
                    foreach ($plan['days'] as $day) foreach ($day['meals'] as $index=>$meal) {
                        $allowedMeals[(int)$day['day'] . ':' . $index] = true;
                    }
                    if ($op === 'mark_meal') {
                        $slot = self::str($body['slot'] ?? null, 10, true);
                        if (!isset($allowedMeals[$slot])) throw new InvalidArgumentException('Refeição não consta do plano.');
                        $value = $body['status'] ?? null;
                        if ($value !== null && !in_array($value, ['consumed','skipped'], true)) throw new InvalidArgumentException('Marcação inválida.');
                        if ($value === null) unset($next['mealChecks'][$planId][$slot]);
                        else $next['mealChecks'][$planId][$slot] = $value;
                    } elseif ($op === 'mark_cart') {
                        $idx = $body['index'] ?? null;
                        if (!is_int($idx) || $idx < 0 || $idx >= count($plan['shoppingList'] ?? [])) throw new InvalidArgumentException('Item não consta da lista.');
                        if (!is_bool($body['inCart'] ?? null)) throw new InvalidArgumentException('Marcação inválida.');
                        if ($body['inCart']) $next['cartChecks'][$planId][(string)$idx] = true;
                        else unset($next['cartChecks'][$planId][(string)$idx]);
                    } else {
                        $meals = $body['mealChecks'] ?? []; $cart = $body['cartIndices'] ?? [];
                        if (!is_array($meals) || !is_array($cart) || count($meals) > 240 || count($cart) > 80) throw new InvalidArgumentException('Importação inválida.');
                        foreach ($meals as $slot=>$value) {
                            if (!isset($allowedMeals[$slot]) || !in_array($value, ['consumed','skipped'], true)) throw new InvalidArgumentException('Marcação legada inválida.');
                            if (!isset($next['mealChecks'][$planId][$slot])) $next['mealChecks'][$planId][$slot] = $value;
                        }
                        foreach ($cart as $idx) {
                            if (!is_int($idx) || $idx < 0 || $idx >= count($plan['shoppingList'] ?? [])) throw new InvalidArgumentException('Índice de lista inválido.');
                            $next['cartChecks'][$planId][(string)$idx] = true;
                        }
                    }
                    break;
                default: throw new InvalidArgumentException('Operação de alimentação não permitida.');
            }
            $next['revision'] = $revision + 1;
            $json = json_encode($next, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            if (strlen($json) > 180000) throw new InvalidArgumentException('Limite do diário atingido.');
            $this->db->prepare('UPDATE kv_store SET data_value = ? WHERE user_id = ? AND data_key = ?')->execute([$json,$uid,self::KEY]);
            if ($own) $this->db->commit();
            return $next;
        } catch (Throwable $error) {
            if ($own && $this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }
}
