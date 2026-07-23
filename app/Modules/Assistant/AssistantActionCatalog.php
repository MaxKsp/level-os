<?php
declare(strict_types=1);

require_once __DIR__ . '/LlmProvider.php';

/** @return array<string,array<string,mixed>> */
function assistant_action_schemas(): array {
    $string = static fn(int $max = 160): array => ['type' => 'string', 'minLength' => 1, 'maxLength' => $max];
    $number = static fn(float $min = 0.01, float $max = 1000000000): array => ['type' => 'number', 'minimum' => $min, 'maximum' => $max];
    $date = ['type' => 'string', 'pattern' => '^\\d{4}-\\d{2}-\\d{2}$'];
    $time = ['type' => 'string', 'pattern' => '^(?:[01]\\d|2[0-3]):[0-5]\\d$'];
    $exercise = [
        'type' => 'object',
        'properties' => [
            'name' => $string(96), 'modality' => ['type' => 'string', 'enum' => ['forca','cardio','calistenia','mobilidade']],
            'sets' => ['type' => ['integer','null'], 'minimum' => 1, 'maximum' => 100],
            'reps' => ['type' => ['integer','null'], 'minimum' => 1, 'maximum' => 10000],
            'loadKg' => ['type' => ['number','null'], 'minimum' => 0, 'maximum' => 2000],
            'restSec' => ['type' => ['integer','null'], 'minimum' => 0, 'maximum' => 7200],
            'distanceKm' => ['type' => ['number','null'], 'minimum' => 0, 'maximum' => 1000],
            'durationSec' => ['type' => ['integer','null'], 'minimum' => 1, 'maximum' => 172800],
            'avgHr' => ['type' => ['integer','null'], 'minimum' => 30, 'maximum' => 240],
            'progressionLevel' => ['type' => ['string','null'], 'maxLength' => 64],
            'assistedKg' => ['type' => ['number','null'], 'minimum' => 0, 'maximum' => 500],
            'weightedKg' => ['type' => ['number','null'], 'minimum' => 0, 'maximum' => 500],
        ],
        'required' => ['name','modality'],
        'additionalProperties' => false,
    ];
    return [
        'add_expense' => ['type'=>'object','properties'=>['value'=>$number(),'date'=>$date,'category'=>$string(48),'account'=>$string(96),'description'=>$string(255)],'required'=>['value','date','category','account','description'],'additionalProperties'=>false],
        'add_income' => ['type'=>'object','properties'=>['value'=>$number(),'date'=>$date,'type'=>['type'=>'string','enum'=>['fixa','variavel','momentanea','avulso']],'account'=>$string(96),'payday'=>['type'=>['integer','null'],'minimum'=>1,'maximum'=>31]],'required'=>['value','date','type','account'],'additionalProperties'=>false],
        'add_transfer' => ['type'=>'object','properties'=>['from'=>$string(96),'to'=>$string(96),'value'=>$number(),'date'=>$date],'required'=>['from','to','value','date'],'additionalProperties'=>false],
        'add_task' => ['type'=>'object','properties'=>['title'=>$string(160),'date'=>$date,'time'=>$time],'required'=>['title','date','time'],'additionalProperties'=>false],
        'create_workout' => ['type'=>'object','properties'=>['name'=>$string(96),'focus'=>$string(255),'exercises'=>['type'=>'array','minItems'=>1,'maxItems'=>60,'items'=>$exercise]],'required'=>['name','focus','exercises'],'additionalProperties'=>false],
        'create_workout_program' => ['type'=>'object','properties'=>[
            'focus'=>$string(255),
            'daysPerWeek'=>['type'=>'integer','minimum'=>1,'maximum'=>7],
            'location'=>['type'=>'string','enum'=>['casa','academia']],
            'workouts'=>['type'=>'array','minItems'=>1,'maxItems'=>7,'items'=>[
                'type'=>'object',
                'properties'=>['name'=>$string(96),'focus'=>$string(255),'exercises'=>['type'=>'array','minItems'=>1,'maxItems'=>60,'items'=>$exercise]],
                'required'=>['name','focus','exercises'],
                'additionalProperties'=>false,
            ]],
        ],'required'=>['focus','daysPerWeek','location','workouts'],'additionalProperties'=>false],
        'log_workout_session' => ['type'=>'object','properties'=>['workoutId'=>['type'=>['string','null'],'maxLength'=>32],'exercises'=>['type'=>'array','minItems'=>1,'maxItems'=>100,'items'=>$exercise]],'required'=>['exercises'],'additionalProperties'=>false],
        'log_measurement' => ['type'=>'object','properties'=>['type'=>['type'=>'string','enum'=>['peso','gordura','altura','cintura','quadril','braco','coxa','peito','panturrilha']],'value'=>$number(0.01,1000),'unit'=>['type'=>'string','enum'=>['kg','%','cm']],'date'=>$date],'required'=>['type','value','unit','date'],'additionalProperties'=>false],
        'log_cardio' => ['type'=>'object','properties'=>['modality'=>['type'=>'string','enum'=>['corrida','caminhada','ciclismo','natacao','eliptico','remo','outro']],'distanceKm'=>$number(0.01,1000),'durationSec'=>['type'=>'integer','minimum'=>1,'maximum'=>172800],'avgHr'=>['type'=>['integer','null'],'minimum'=>30,'maximum'=>240]],'required'=>['modality','distanceKm','durationSec'],'additionalProperties'=>false],
        'create_diet_plan' => ['type'=>'object','properties'=>[
            'goal'=>['type'=>'string','enum'=>['emagrecimento','hipertrofia','manutencao']],
            'periodDays'=>['type'=>'integer','minimum'=>1,'maximum'=>30],
            'budgetBRL'=>$number(20, 100000),
            'estimatedCostBRL'=>$number(1, 100000),
            'days'=>['type'=>'array','minItems'=>1,'maxItems'=>30,'items'=>[
                'type'=>'object',
                'properties'=>[
                    'day'=>['type'=>'integer','minimum'=>1,'maximum'=>30],
                    'meals'=>['type'=>'array','minItems'=>1,'maxItems'=>8,'items'=>[
                        'type'=>'object',
                        'properties'=>['name'=>$string(64),'description'=>$string(500),'estimatedCostBRL'=>$number(0.01, 10000)],
                        'required'=>['name','description','estimatedCostBRL'],
                        'additionalProperties'=>false,
                    ]],
                ],
                'required'=>['day','meals'],
                'additionalProperties'=>false,
            ]],
        ],'required'=>['goal','periodDays','budgetBRL','estimatedCostBRL','days'],'additionalProperties'=>false],
        'query' => ['type'=>'object','properties'=>['question'=>$string(500)],'required'=>['question'],'additionalProperties'=>false],
    ];
}

/** @return list<string> */
function assistant_action_names_for_module(?string $module): array {
    return match ($module) {
        'financeiro' => ['add_expense', 'add_income', 'add_transfer', 'query'],
        'agenda' => ['add_task', 'query'],
        'treinos' => ['create_workout', 'create_workout_program', 'log_workout_session', 'log_measurement', 'log_cardio', 'query'],
        'alimentacao' => ['create_diet_plan', 'query'],
        default => array_keys(assistant_action_schemas()),
    };
}

/**
 * OpenAI/Gemini strict tools require every declared object property in
 * `required`; nullable properties remain optional in meaning by accepting
 * `null`. The server still validates the original schema after the response.
 *
 * @param array<string,mixed> $schema
 * @return array<string,mixed>
 */
function assistant_strict_schema(array $schema): array {
    $types = is_array($schema['type'] ?? null) ? $schema['type'] : [$schema['type'] ?? null];
    if (in_array('object', $types, true) && is_array($schema['properties'] ?? null)) {
        $properties = [];
        foreach ($schema['properties'] as $name => $property) {
            $properties[$name] = is_array($property) ? assistant_strict_schema($property) : $property;
        }
        $schema['properties'] = $properties;
        $schema['required'] = array_keys($properties);
        $schema['additionalProperties'] = false;
    }
    if (in_array('array', $types, true) && is_array($schema['items'] ?? null)) {
        $schema['items'] = assistant_strict_schema($schema['items']);
    }
    return $schema;
}

/** @param list<string>|null $only @return list<array<string,mixed>> */
function assistant_tools(?string $module = null, ?array $only = null): array {
    $descriptions = [
        'add_expense' => 'Registra uma despesa do próprio usuário.',
        'add_income' => 'Registra uma renda do próprio usuário.',
        'add_transfer' => 'Transfere saldo entre duas contas do próprio usuário.',
        'add_task' => 'Cria uma tarefa na rotina.',
        'create_workout' => 'Cria uma ficha de treino com exercícios.',
        'create_workout_program' => 'Age como um professor de educação física: a partir de foco, dias por semana e local (casa ou academia) já informados pelo usuário, monta um programa completo com exatamente daysPerWeek fichas de treino (uma por dia), cada uma com 4 a 8 exercícios coerentes com o foco. Se location=casa, use somente exercícios de calistenia/mobilidade sem carga externa (loadKg nulo); se location=academia, pode usar modalidade forca com carga. Ajuste faixa de repetições e descanso ao foco: hipertrofia (8-12 reps, 60-90s), força (3-6 reps, 120-180s), emagrecimento/resistência (15-20 reps, 30-45s). Distribua os dias em um split coerente (corpo inteiro para até 3 dias; superior/inferior ou push/pull/legs para 4-5 dias; divisão por grupo muscular para 6-7 dias) e nomeie cada treino de forma descritiva (ex.: "Treino A - Peito e Tríceps").',
        'log_workout_session' => 'Registra métricas de uma sessão de treino.',
        'log_measurement' => 'Registra uma medida corporal.',
        'log_cardio' => 'Registra uma sessão de cardio.',
        'create_diet_plan' => 'Age como nutricionista: monta um plano alimentar completo a partir de objetivo (emagrecimento, hipertrofia ou manutencao), período em dias e orçamento total em reais informados pelo usuário. Gere um dia de cardápio por dia do período (se período > 7, gere 7 dias e o usuário repete a semana — nesse caso days tem 7 itens). Cada dia tem 4 a 6 refeições (café da manhã, lanche, almoço, lanche da tarde, jantar) com descrição prática de alimentos brasileiros acessíveis e custo estimado por refeição. A soma de todos os custos vezes as repetições da semana NUNCA pode passar o orçamento total; priorize arroz, feijão, ovos, frango, frutas da estação e legumes baratos. Preencha estimatedCostBRL com o custo total estimado do período.',
        'query' => 'Consulta dados resumidos do próprio usuário sem alterar nada.',
    ];
    $tools = [];
    $schemas = assistant_action_schemas();
    $allowed = assistant_action_names_for_module($module);
    if ($only !== null) {
        $allowed = array_values(array_intersect($allowed, $only));
    }
    foreach ($allowed as $name) {
        $schema = $schemas[$name];
        $tools[] = ['type'=>'function','function'=>[
            'name'=>$name,
            'description'=>$descriptions[$name],
            'strict'=>true,
            'parameters'=>assistant_strict_schema($schema),
        ]];
    }
    return $tools;
}

/** @param array<string,mixed> $arguments @return array{action:string,arguments:array<string,mixed>} */
function assistant_validate_route(string $action, array $arguments): array {
    $schemas = assistant_action_schemas();
    if (!isset($schemas[$action])) throw new AssistantRouteException('Ação fora do catálogo.');
    $schema = $schemas[$action];
    if (count($arguments) > 24) throw new AssistantRouteException('Muitos parâmetros.');
    $encoded = json_encode($arguments, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if (strlen($encoded) > 64 * 1024) throw new AssistantRouteException('Ação excede o limite.');
    assistant_validate_schema_value($arguments, $schema, '$');
    return ['action' => $action, 'arguments' => $arguments];
}

/** @param array<string,mixed> $schema */
function assistant_validate_schema_value(mixed $value, array $schema, string $path): void {
    $types = is_array($schema['type'] ?? null) ? $schema['type'] : [(string)($schema['type'] ?? '')];
    $matches = static function (string $type) use ($value): bool {
        return match ($type) {
            'null' => $value === null,
            'string' => is_string($value),
            'number' => is_int($value) || is_float($value),
            'integer' => is_int($value),
            'array' => is_array($value) && array_is_list($value),
            'object' => is_array($value),
            default => false,
        };
    };
    if (!array_filter($types, $matches)) throw new AssistantRouteException('Tipo inválido em ' . $path . '.');
    if ($value === null) return;
    if (isset($schema['enum']) && (!is_array($schema['enum']) || !in_array($value, $schema['enum'], true))) {
        throw new AssistantRouteException('Valor fora do catálogo em ' . $path . '.');
    }
    if (is_string($value)) {
        $length = mb_strlen($value);
        if (isset($schema['minLength']) && $length < (int)$schema['minLength']) throw new AssistantRouteException('Texto curto em ' . $path . '.');
        if (isset($schema['maxLength']) && $length > (int)$schema['maxLength']) throw new AssistantRouteException('Texto longo em ' . $path . '.');
        if (isset($schema['pattern']) && preg_match('~' . $schema['pattern'] . '~D', $value) !== 1) throw new AssistantRouteException('Formato inválido em ' . $path . '.');
    }
    if (is_int($value) || is_float($value)) {
        if (!is_finite((float)$value)) throw new AssistantRouteException('Número inválido em ' . $path . '.');
        if (isset($schema['minimum']) && $value < $schema['minimum']) throw new AssistantRouteException('Número abaixo do limite em ' . $path . '.');
        if (isset($schema['maximum']) && $value > $schema['maximum']) throw new AssistantRouteException('Número acima do limite em ' . $path . '.');
    }
    if (in_array('array', $types, true) && is_array($value) && array_is_list($value)) {
        if (isset($schema['minItems']) && count($value) < (int)$schema['minItems']) throw new AssistantRouteException('Lista vazia em ' . $path . '.');
        if (isset($schema['maxItems']) && count($value) > (int)$schema['maxItems']) throw new AssistantRouteException('Lista longa em ' . $path . '.');
        foreach ($value as $index => $item) assistant_validate_schema_value($item, (array)($schema['items'] ?? []), $path . '[' . $index . ']');
        return;
    }
    if (in_array('object', $types, true) && is_array($value)) {
        $properties = (array)($schema['properties'] ?? []);
        foreach ((array)($schema['required'] ?? []) as $required) {
            if (!array_key_exists((string)$required, $value)) throw new AssistantRouteException('Parâmetro obrigatório ausente em ' . $path . '.');
        }
        foreach ($value as $key => $item) {
            if (!is_string($key) || !isset($properties[$key])) {
                if (($schema['additionalProperties'] ?? true) === false) throw new AssistantRouteException('Parâmetro fora do catálogo em ' . $path . '.');
                continue;
            }
            assistant_validate_schema_value($item, (array)$properties[$key], $path . '.' . $key);
        }
    }
}

/** @param list<string>|null $only */
function assistant_catalog_prompt(?string $module = null, ?array $only = null): string {
    $schemas = assistant_action_schemas();
    $filtered = [];
    $allowed = assistant_action_names_for_module($module);
    if ($only !== null) {
        $allowed = array_values(array_intersect($allowed, $only));
    }
    foreach ($allowed as $name) $filtered[$name] = $schemas[$name];
    $catalog = json_encode($filtered, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    return 'Catálogo JSON de ações permitidas: ' . $catalog;
}
