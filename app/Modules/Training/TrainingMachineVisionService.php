<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/Assistant/AssistantBootstrap.php';

/** Taxonomia fechada: o modelo classifica; as orientações vêm daqui, não da visão generativa. */
function training_machine_catalog(): array {
    return [
        'leg_press'=>['name'=>'Leg press','query'=>'Leg Press','equipment'=>'Leg press',
            'tips'=>['Ajuste o encosto para manter quadril e lombar apoiados.','Mantenha os pés totalmente apoiados na plataforma.','Controle a descida e evite travar os joelhos no final.']],
        'leg_extension'=>['name'=>'Cadeira extensora','query'=>'Leg Extension','equipment'=>'Leg extension',
            'tips'=>['Alinhe o eixo do joelho ao pivô da máquina.','Posicione o rolo logo acima dos tornozelos.','Use movimento controlado e não deixe as placas baterem.']],
        'leg_curl'=>['name'=>'Mesa/cadeira flexora','query'=>'Leg Curl','equipment'=>'Leg curl',
            'tips'=>['Alinhe os joelhos ao eixo da máquina.','Ajuste o rolo próximo aos tornozelos sem pressionar o tendão.','Mantenha quadril e tronco estáveis durante a flexão.']],
        'hack_squat'=>['name'=>'Hack squat','query'=>'Hack Squat','equipment'=>'Hack squat',
            'tips'=>['Apoie costas e ombros nos suportes.','Escolha posição dos pés que permita trajetória confortável dos joelhos.','Desça sob controle sem perder o contato do quadril com o encosto.']],
        'smith_machine'=>['name'=>'Smith machine','query'=>'Smith Machine','equipment'=>'Smith machine',
            'tips'=>['Confira travas, ganchos e limitadores antes da série.','Posicione o corpo considerando a trajetória fixa da barra.','Teste o movimento sem carga alta antes de progredir.']],
        'lat_pulldown'=>['name'=>'Puxada alta / lat pulldown','query'=>'Lat Pulldown','equipment'=>'Lat pulldown',
            'tips'=>['Prenda as coxas sob o apoio sem comprimir excessivamente.','Mantenha peito elevado e tronco estável.','Puxe à frente do corpo de forma controlada; evite usar balanço.']],
        'seated_row'=>['name'=>'Remada sentada','query'=>'Seated Row','equipment'=>'Cable / row',
            'tips'=>['Ajuste apoios para alcançar a pega sem arredondar excessivamente a coluna.','Inicie com tronco estável e ombros controlados.','Evite transformar cada repetição em impulso do corpo.']],
        'chest_press'=>['name'=>'Chest press','query'=>'Chest Press','equipment'=>'Chest press',
            'tips'=>['Ajuste o banco para as manoplas ficarem na linha média do peito.','Mantenha punhos neutros e escápulas apoiadas.','Controle a volta sem deixar a carga puxar os ombros para frente.']],
        'pec_deck'=>['name'=>'Peck deck / voador','query'=>'Pec Deck','equipment'=>'Pec deck',
            'tips'=>['Ajuste o assento para braços e ombros ficarem confortáveis.','Mantenha o tronco apoiado e ombros longe das orelhas.','Não force amplitude além do ponto confortável do ombro.']],
        'shoulder_press'=>['name'=>'Shoulder press','query'=>'Shoulder Press','equipment'=>'Shoulder press',
            'tips'=>['Ajuste o assento para as pegadas iniciarem próximas à altura dos ombros.','Mantenha punhos alinhados e tronco apoiado.','Evite compensar com arqueamento excessivo da lombar.']],
        'cable_machine'=>['name'=>'Polia / crossover','query'=>'Cable','equipment'=>'Cabo / polia',
            'tips'=>['Confira pino, mosquetões e acessórios antes de puxar.','Ajuste a altura da polia antes de selecionar carga alta.','Mantenha distância suficiente da torre para o cabo correr livre.']],
        'hip_abduction'=>['name'=>'Máquina abdutora','query'=>'Hip Abduction','equipment'=>'Hip abduction',
            'tips'=>['Ajuste o encosto e a abertura inicial sem forçar o quadril.','Mantenha pelve e tronco apoiados.','Abra e retorne de forma controlada, sem bater as placas.']],
        'hip_adduction'=>['name'=>'Máquina adutora','query'=>'Hip Adduction','equipment'=>'Hip adduction',
            'tips'=>['Ajuste a abertura inicial dentro de uma amplitude confortável.','Mantenha costas e quadril apoiados.','Feche e retorne as pernas lentamente, evitando impulso.']],
        'hip_thrust'=>['name'=>'Máquina de hip thrust','query'=>'Hip Thrust','equipment'=>'Hip thrust',
            'tips'=>['Ajuste apoio de costas e faixa/almofada sobre o quadril.','Mantenha pés firmes e joelhos acompanhando a direção dos pés.','Eleve o quadril sem hiperestender a lombar no topo.']],
        'assisted_pullup'=>['name'=>'Barra fixa / mergulho assistido','query'=>'Assisted Pull-Up','equipment'=>'Assisted pull-up',
            'tips'=>['Selecione assistência suficiente para manter controle.','Suba e desça da plataforma com apoio nas alças.','Evite balanço e reduza a assistência gradualmente.']],
        'back_extension'=>['name'=>'Extensão lombar','query'=>'Back Extension','equipment'=>'Back extension',
            'tips'=>['Ajuste o apoio abaixo da dobra do quadril.','Mantenha coluna neutra e movimento vindo do quadril.','Pare a subida ao alinhar o tronco; evite hiperextensão.']],
        'ab_crunch'=>['name'=>'Abdominal na máquina','query'=>'Ab Crunch','equipment'=>'Ab crunch',
            'tips'=>['Ajuste assento e apoios antes de selecionar carga.','Expire ao flexionar o tronco de forma controlada.','Evite puxar com braços ou usar impulso.']],
        'calf_raise'=>['name'=>'Panturrilha na máquina','query'=>'Calf Raise','equipment'=>'Calf raise',
            'tips'=>['Ajuste ombreiras/apoios sem comprimir a articulação.','Mantenha a parte anterior dos pés estável na plataforma.','Faça subida e descida controladas, sem quicar.']],
        'treadmill'=>['name'=>'Esteira','query'=>'Treadmill','equipment'=>'Esteira',
            'tips'=>['Comece em velocidade baixa antes de aumentar ritmo ou inclinação.','Use o clipe de segurança quando disponível.','Olhe à frente e evite subir ou descer com a lona em alta velocidade.']],
        'stationary_bike'=>['name'=>'Bicicleta ergométrica','query'=>'Stationary Bike','equipment'=>'Bicicleta ergométrica',
            'tips'=>['Ajuste o selim para pedalar sem estender totalmente o joelho.','Prenda os pés quando houver tiras.','Comece com resistência leve para conferir a posição.']],
        'rower'=>['name'=>'Remo ergométrico','query'=>'Rower','equipment'=>'Remo',
            'tips'=>['Prenda os pés e ajuste o apoio antes de iniciar.','Coordene pernas, tronco e braços sem puxões bruscos.','Retorne de forma controlada mantendo a corrente/cabo alinhado.']],
        'elliptical'=>['name'=>'Elíptico','query'=>'Elliptical','equipment'=>'Elíptico',
            'tips'=>['Suba segurando os apoios e inicie devagar.','Mantenha os pés apoiados e postura estável.','Aumente resistência apenas após encontrar ritmo confortável.']],
        'stair_climber'=>['name'=>'Escada / stair climber','query'=>'Stair Climber','equipment'=>'Escada',
            'tips'=>['Comece devagar e mantenha o corpo centralizado nos degraus.','Use corrimãos para equilíbrio, não para sustentar todo o peso.','Não deixe os pés ultrapassarem perigosamente a borda do degrau.']],
    ];
}
/** @return list<array{id:string,name:string,query:string,equipment:string,tips:list<string>}> */
function training_machine_public_catalog(): array {
    $items = [];
    foreach (training_machine_catalog() as $id => $item) {
        $items[] = ['id'=>$id] + $item;
    }
    usort($items, static fn(array $a, array $b): int => strcasecmp((string)$a['name'], (string)$b['name']));
    return $items;
}

function training_machine_image_data_url(mixed $raw): string {
    if (!is_string($raw) || strlen($raw) > 2_800_000) throw new InvalidArgumentException('Imagem inválida ou muito grande.');
    if (preg_match('/\Adata:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/=]+)\z/D', $raw, $matches) !== 1) {
        throw new InvalidArgumentException('Use foto JPEG, PNG ou WebP.');
    }
    $bytes = base64_decode($matches[2], true);
    if ($bytes === false || strlen($bytes) < 8_000 || strlen($bytes) > 1_800_000) {
        throw new InvalidArgumentException('A foto deve ter entre 8 KB e 1,8 MB.');
    }
    $info = @getimagesizefromstring($bytes);
    if (!is_array($info) || (string)($info['mime'] ?? '') !== $matches[1]
        || (int)($info[0] ?? 0) < 120 || (int)($info[1] ?? 0) < 120
        || (int)$info[0] > 4096 || (int)$info[1] > 4096) {
        throw new InvalidArgumentException('Dimensões de imagem inválidas.');
    }
    return $raw;
}

function training_machine_prompt(): string {
    $catalog = training_machine_catalog();
    $choices = implode(', ', array_map(
        static fn(string $id, array $item): string => $id . '=' . $item['name'],
        array_keys($catalog), array_values($catalog),
    ));
    return 'Classifique apenas o aparelho de academia mais visível na foto. '
        . 'Escolha somente um dos IDs permitidos ou null se não houver confiança. IDs: ' . $choices . '. '
        . 'Não dê conselhos, não identifique pessoas e ignore rostos/textos pessoais. '
        . 'Responda SOMENTE JSON: {"machineId":"id-ou-null","confidence":0.0,"alternatives":["id"]}. '
        . 'confidence representa confiança visual de 0 a 1; no máximo 3 alternativas.';
}
/** @return array{machineId:?string,confidence:float,alternatives:list<string>} */
function training_machine_parse_model_text(string $text): array {
    $trim = trim($text);
    if (preg_match('/\{.*\}/s', $trim, $match) === 1) $trim = $match[0];
    $data = json_decode($trim, true);
    if (!is_array($data)) throw new UnexpectedValueException('machine_vision_invalid_json');
    $catalog = training_machine_catalog();
    $machineId = $data['machineId'] ?? null;
    if ($machineId !== null && (!is_string($machineId) || !isset($catalog[$machineId]))) $machineId = null;
    $confidence = is_numeric($data['confidence'] ?? null) ? (float)$data['confidence'] : 0.0;
    $confidence = max(0.0, min(1.0, $confidence));
    $alternatives = [];
    foreach ((array)($data['alternatives'] ?? []) as $candidate) {
        if (is_string($candidate) && isset($catalog[$candidate]) && $candidate !== $machineId
            && !in_array($candidate, $alternatives, true)) $alternatives[] = $candidate;
        if (count($alternatives) >= 3) break;
    }
    return ['machineId'=>$machineId, 'confidence'=>round($confidence, 3), 'alternatives'=>$alternatives];
}

function training_machine_response_text(array $response): string {
    $content = $response['choices'][0]['message']['content'] ?? null;
    if (!is_string($content) || trim($content) === '') {
        throw new UnexpectedValueException('machine_vision_empty_response');
    }
    return trim($content);
}
/** @return array<string,mixed> */
function training_machine_recognize(string $imageDataUrl): array {
    $image = training_machine_image_data_url($imageDataUrl);
    $payload = [
        'messages'=>[
            ['role'=>'system','content'=>training_machine_prompt()],
            ['role'=>'user','content'=>[
                ['type'=>'text','text'=>'Identifique o aparelho desta foto conforme a taxonomia.'],
                ['type'=>'image_url','image_url'=>['url'=>$image,'detail'=>'low']],
            ]],
        ],
        'temperature'=>0, 'max_tokens'=>180,
    ];
    $failures = [];
    foreach (assistant_providers() as $provider) {
        try {
            $parsed = training_machine_parse_model_text(training_machine_response_text($provider->complete($payload)));
            $catalog = training_machine_catalog();
            $id = $parsed['machineId'];
            $machine = $id !== null ? $catalog[$id] : null;
            $alternatives = array_map(static fn(string $candidate): array =>
                ['id'=>$candidate] + $catalog[$candidate], $parsed['alternatives']);
            return [
                'recognized'=>$machine !== null && $parsed['confidence'] >= 0.55,
                'machine'=>$machine !== null ? ['id'=>$id] + $machine : null,
                'confidence'=>$parsed['confidence'], 'alternatives'=>$alternatives,
                'provider'=>$provider->name(),
            ];
        } catch (LlmProviderException|UnexpectedValueException|InvalidArgumentException $error) {
            $failures[] = $error instanceof LlmProviderException ? $error->kind : 'response';
        }
    }
    throw new AssistantProvidersExhausted('Reconhecimento visual indisponível.', array_map(
        static fn(string $kind): array => ['kind'=>$kind,'http_status'=>0], $failures,
    ));
}
