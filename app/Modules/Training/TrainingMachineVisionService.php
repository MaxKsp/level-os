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
        'seated_leg_curl'=>['name'=>'Cadeira flexora sentada','query'=>'Seated Leg Curl','equipment'=>'Leg curl',
            'tips'=>['Alinhe os joelhos ao eixo da máquina.','Ajuste o rolo próximo aos tornozelos sem pressionar o tendão.','Mantenha costas e quadril apoiados durante a flexão.']],
        'lying_leg_curl'=>['name'=>'Mesa flexora deitada','query'=>'Lying Leg Curl','equipment'=>'Leg curl',
            'tips'=>['Alinhe os joelhos ao eixo da máquina.','Ajuste o rolo logo acima dos calcanhares.','Mantenha quadril e abdômen apoiados no banco.']],
        'hack_squat'=>['name'=>'Hack squat','query'=>'Hack Squat','equipment'=>'Hack squat',
            'tips'=>['Apoie costas e ombros nos suportes.','Escolha posição dos pés que permita trajetória confortável dos joelhos.','Desça sob controle sem perder o contato do quadril com o encosto.']],
        'pendulum_squat'=>['name'=>'Pendulum squat','query'=>'Pendulum Squat','equipment'=>'Pendulum squat',
            'tips'=>['Ajuste a plataforma antes de carregar.','Mantenha costas e ombros firmes no apoio.','Controle a descida respeitando a trajetória curva da máquina.']],
        'v_squat'=>['name'=>'V-squat / leverage squat','query'=>'V Squat','equipment'=>'V squat',
            'tips'=>['Ajuste ombreiras e plataforma antes de iniciar.','Mantenha tronco apoiado e pés firmes.','Use as travas de segurança em todas as séries.']],
        'smith_machine'=>['name'=>'Smith machine','query'=>'Smith Machine','equipment'=>'Smith machine',
            'tips'=>['Confira travas, ganchos e limitadores antes da série.','Posicione o corpo considerando a trajetória fixa da barra.','Teste o movimento sem carga alta antes de progredir.']],
        'lat_pulldown'=>['name'=>'Puxada alta / lat pulldown','query'=>'Lat Pulldown','equipment'=>'Lat pulldown',
            'tips'=>['Prenda as coxas sob o apoio sem comprimir excessivamente.','Mantenha peito elevado e tronco estável.','Puxe à frente do corpo de forma controlada; evite usar balanço.']],
        'seated_row'=>['name'=>'Remada sentada','query'=>'Seated Row','equipment'=>'Cable / row',
            'tips'=>['Ajuste apoios para alcançar a pega sem arredondar excessivamente a coluna.','Inicie com tronco estável e ombros controlados.','Evite transformar cada repetição em impulso do corpo.']],
        'plate_loaded_row'=>['name'=>'Remada articulada / plate-loaded row','query'=>'Machine Row','equipment'=>'Plate loaded row',
            'tips'=>['Ajuste peito e assento antes de carregar.','Mantenha o tronco apoiado durante a puxada.','Controle os dois braços e evite girar o corpo.']],
        'chest_press'=>['name'=>'Chest press','query'=>'Chest Press','equipment'=>'Chest press',
            'tips'=>['Ajuste o banco para as manoplas ficarem na linha média do peito.','Mantenha punhos neutros e escápulas apoiadas.','Controle a volta sem deixar a carga puxar os ombros para frente.']],
        'incline_chest_press'=>['name'=>'Chest press inclinado','query'=>'Incline Chest Press','equipment'=>'Incline chest press',
            'tips'=>['Ajuste o assento para as manoplas iniciarem na parte alta do peito.','Mantenha escápulas apoiadas.','Evite elevar os ombros durante a pressão.']],
        'plate_loaded_chest_press'=>['name'=>'Supino articulado / plate-loaded press','query'=>'Machine Chest Press','equipment'=>'Plate loaded chest press',
            'tips'=>['Confira anilhas e travas dos braços articulados.','Ajuste o banco para a pega ficar alinhada ao peito.','Controle os dois lados sem deixar um braço disparar à frente.']],
        'pec_deck'=>['name'=>'Peck deck / voador','query'=>'Pec Deck','equipment'=>'Pec deck',
            'tips'=>['Ajuste o assento para braços e ombros ficarem confortáveis.','Mantenha o tronco apoiado e ombros longe das orelhas.','Não force amplitude além do ponto confortável do ombro.']],
        'rear_delt_machine'=>['name'=>'Posterior de ombro / reverse fly','query'=>'Reverse Fly Machine','equipment'=>'Rear delt machine',
            'tips'=>['Ajuste o assento para as pegadas ficarem na linha dos ombros.','Mantenha peito apoiado quando houver encosto frontal.','Abra os braços sem compensar com a lombar.']],
        'lateral_raise_machine'=>['name'=>'Elevação lateral na máquina','query'=>'Lateral Raise Machine','equipment'=>'Lateral raise machine',
            'tips'=>['Ajuste o assento para os apoios ficarem próximos aos cotovelos.','Mantenha ombros baixos durante a elevação.','Suba apenas até uma amplitude confortável.']],
        'shoulder_press'=>['name'=>'Shoulder press','query'=>'Shoulder Press','equipment'=>'Shoulder press',
            'tips'=>['Ajuste o assento para as pegadas iniciarem próximas à altura dos ombros.','Mantenha punhos alinhados e tronco apoiado.','Evite compensar com arqueamento excessivo da lombar.']],
        'biceps_curl_machine'=>['name'=>'Rosca bíceps na máquina','query'=>'Biceps Curl Machine','equipment'=>'Biceps curl machine',
            'tips'=>['Ajuste o banco para cotovelos alinharem ao pivô.','Mantenha braços apoiados durante toda a repetição.','Evite tirar os cotovelos do apoio para completar a carga.']],
        'triceps_extension_machine'=>['name'=>'Tríceps na máquina','query'=>'Triceps Extension Machine','equipment'=>'Triceps machine',
            'tips'=>['Ajuste banco e apoio dos braços antes de carregar.','Mantenha cotovelos estáveis durante a extensão.','Controle o retorno sem bater as placas.']],
        'dip_machine'=>['name'=>'Mergulho / dip machine','query'=>'Dip Machine','equipment'=>'Dip machine',
            'tips'=>['Ajuste assento e pegadas para manter ombros confortáveis.','Desça sem forçar amplitude do ombro.','Mantenha o tronco estável durante a pressão.']],
        'cable_machine'=>['name'=>'Polia / crossover','query'=>'Cable','equipment'=>'Cabo / polia',
            'tips'=>['Confira pino, mosquetões e acessórios antes de puxar.','Ajuste a altura da polia antes de selecionar carga alta.','Mantenha distância suficiente da torre para o cabo correr livre.']],
        'hip_abduction'=>['name'=>'Máquina abdutora','query'=>'Hip Abduction','equipment'=>'Hip abduction',
            'tips'=>['Ajuste o encosto e a abertura inicial sem forçar o quadril.','Mantenha pelve e tronco apoiados.','Abra e retorne de forma controlada, sem bater as placas.']],
        'hip_adduction'=>['name'=>'Máquina adutora','query'=>'Hip Adduction','equipment'=>'Hip adduction',
            'tips'=>['Ajuste a abertura inicial dentro de uma amplitude confortável.','Mantenha costas e quadril apoiados.','Feche e retorne as pernas lentamente, evitando impulso.']],
        'hip_thrust'=>['name'=>'Máquina de hip thrust','query'=>'Hip Thrust','equipment'=>'Hip thrust',
            'tips'=>['Ajuste apoio de costas e faixa/almofada sobre o quadril.','Mantenha pés firmes e joelhos acompanhando a direção dos pés.','Eleve o quadril sem hiperestender a lombar no topo.']],
        'glute_kickback'=>['name'=>'Coice de glúteo na máquina','query'=>'Glute Kickback Machine','equipment'=>'Glute kickback',
            'tips'=>['Ajuste o apoio do pé e do tronco antes da carga.','Mantenha a pelve estável durante a extensão.','Evite hiperestender a lombar para ganhar amplitude.']],
        'assisted_pullup'=>['name'=>'Barra fixa / mergulho assistido','query'=>'Assisted Pull-Up','equipment'=>'Assisted pull-up',
            'tips'=>['Selecione assistência suficiente para manter controle.','Suba e desça da plataforma com apoio nas alças.','Evite balanço e reduza a assistência gradualmente.']],
        'back_extension'=>['name'=>'Extensão lombar','query'=>'Back Extension','equipment'=>'Back extension',
            'tips'=>['Ajuste o apoio abaixo da dobra do quadril.','Mantenha coluna neutra e movimento vindo do quadril.','Pare a subida ao alinhar o tronco; evite hiperextensão.']],
        'ab_crunch'=>['name'=>'Abdominal na máquina','query'=>'Ab Crunch','equipment'=>'Ab crunch',
            'tips'=>['Ajuste assento e apoios antes de selecionar carga.','Expire ao flexionar o tronco de forma controlada.','Evite puxar com braços ou usar impulso.']],
        'torso_rotation'=>['name'=>'Rotação de tronco / rotary torso','query'=>'Torso Rotation Machine','equipment'=>'Rotary torso',
            'tips'=>['Ajuste assento e amplitude antes de iniciar.','Mantenha quadril fixo no apoio.','Gire de forma controlada sem usar impulso.']],
        'calf_raise'=>['name'=>'Panturrilha em pé na máquina','query'=>'Standing Calf Raise','equipment'=>'Calf raise',
            'tips'=>['Ajuste ombreiras/apoios sem comprimir a articulação.','Mantenha a parte anterior dos pés estável na plataforma.','Faça subida e descida controladas, sem quicar.']],
        'seated_calf_raise'=>['name'=>'Panturrilha sentada','query'=>'Seated Calf Raise','equipment'=>'Seated calf raise',
            'tips'=>['Ajuste o apoio sobre as coxas sem pressionar o joelho.','Mantenha a parte anterior dos pés apoiada.','Use amplitude controlada sem quicar.']],
        'treadmill'=>['name'=>'Esteira','query'=>'Treadmill','equipment'=>'Esteira',
            'tips'=>['Comece em velocidade baixa antes de aumentar ritmo ou inclinação.','Use o clipe de segurança quando disponível.','Olhe à frente e evite subir ou descer com a lona em alta velocidade.']],
        'stationary_bike'=>['name'=>'Bicicleta vertical','query'=>'Stationary Bike','equipment'=>'Bicicleta ergométrica',
            'tips'=>['Ajuste o selim para pedalar sem estender totalmente o joelho.','Prenda os pés quando houver tiras.','Comece com resistência leve para conferir a posição.']],
        'recumbent_bike'=>['name'=>'Bicicleta horizontal / reclinada','query'=>'Recumbent Bike','equipment'=>'Bicicleta reclinada',
            'tips'=>['Ajuste a distância do banco para manter leve flexão do joelho.','Mantenha lombar apoiada no encosto.','Comece com resistência leve antes de aumentar.']],
        'rower'=>['name'=>'Remo ergométrico','query'=>'Rower','equipment'=>'Remo',
            'tips'=>['Prenda os pés e ajuste o apoio antes de iniciar.','Coordene pernas, tronco e braços sem puxões bruscos.','Retorne de forma controlada mantendo a corrente/cabo alinhado.']],
        'elliptical'=>['name'=>'Elíptico','query'=>'Elliptical','equipment'=>'Elíptico',
            'tips'=>['Suba segurando os apoios e inicie devagar.','Mantenha os pés apoiados e postura estável.','Aumente resistência apenas após encontrar ritmo confortável.']],
        'stair_climber'=>['name'=>'Escada / stair climber','query'=>'Stair Climber','equipment'=>'Escada',
            'tips'=>['Comece devagar e mantenha o corpo centralizado nos degraus.','Use corrimãos para equilíbrio, não para sustentar todo o peso.','Não deixe os pés ultrapassarem perigosamente a borda do degrau.']],
        'ski_erg'=>['name'=>'Ski erg','query'=>'Ski Erg','equipment'=>'Ski erg',
            'tips'=>['Confira cordas e pegadores antes de iniciar.','Mantenha os pés estáveis e o movimento coordenado.','Evite puxões bruscos no início de cada repetição.']],
    ];
}

/** Características visuais usadas somente para classificação; nunca viram orientação ao usuário. */
function training_machine_visual_signatures(): array {
    return [
        'leg_press'=>'banco reclinado ou sentado voltado para plataforma grande de pés; trilhos ou plataforma móvel para empurrar com as pernas',
        'leg_extension'=>'assento com encosto; pivô lateral próximo ao joelho; rolo único à frente das canelas/tornozelos',
        'seated_leg_curl'=>'assento com encosto; rolo sobre as coxas e outro atrás/abaixo das pernas; flexão de joelho sentado',
        'lying_leg_curl'=>'banco longo horizontal/deitado; rolo atrás dos tornozelos; usuário fica de bruços',
        'hack_squat'=>'plataforma inclinada, encosto grande deslizante e ombreiras; carrinho corre em trilhos inclinados',
        'pendulum_squat'=>'ombro/encosto preso a braço longo pivotante em arco; plataforma fixa; movimento pendular',
        'v_squat'=>'braços articulados em alavanca com ombreiras; plataforma de pés; sem carrinho em trilhos',
        'smith_machine'=>'barra horizontal presa a dois trilhos verticais; ganchos giratórios e limitadores; estrutura aberta',
        'lat_pulldown'=>'torre alta de cabos; barra suspensa acima da cabeça; banco com apoio de coxas',
        'seated_row'=>'banco baixo voltado a cabo/pega horizontal; apoio de pés à frente; puxada na altura do tronco',
        'plate_loaded_row'=>'braços articulados carregados com anilhas; apoio de peito e assento; alças de puxada independentes',
        'chest_press'=>'assento com encosto e duas manoplas à frente do peito ligadas a pilha de pesos',
        'incline_chest_press'=>'assento inclinado ou pegas altas; braços pressionam para cima e à frente em diagonal',
        'plate_loaded_chest_press'=>'braços articulados com pinos para anilhas dos dois lados; assento/encosto e pegas de empurrar',
        'pec_deck'=>'assento central com dois braços acolchoados ou alças laterais que fecham à frente do peito',
        'rear_delt_machine'=>'assento voltado para apoio frontal/peito; alças partem à frente e abrem para trás na linha dos ombros',
        'shoulder_press'=>'assento com encosto; pegadas ao lado/acima dos ombros; braços da máquina sobem verticalmente',
        'lateral_raise_machine'=>'assento com apoios acolchoados junto aos cotovelos/antebraços; braços abrem lateralmente',
        'biceps_curl_machine'=>'assento com apoio inclinado para braços/cotovelos; alavanca de rosca à frente',
        'triceps_extension_machine'=>'assento com apoio de braços/cotovelos; alavanca empurrada para baixo/à frente pela extensão do cotovelo',
        'dip_machine'=>'assento ou plataforma com pegadores laterais paralelos; movimento de pressão para baixo',
        'cable_machine'=>'uma ou duas torres altas com polias ajustáveis, cabos, mosquetões e várias alturas de pega',
        'hip_abduction'=>'assento com encosto e almofadas na parte externa dos joelhos; pernas abrem para fora',
        'hip_adduction'=>'assento com encosto e almofadas na parte interna dos joelhos; pernas fecham para dentro',
        'hip_thrust'=>'banco/apoio curto para costas e grande almofada/cinto sobre o quadril; plataforma para os pés',
        'glute_kickback'=>'apoio de tronco/antebraço e plataforma ou rolo para um pé empurrar para trás',
        'assisted_pullup'=>'estrutura alta com barras de puxada e barras de mergulho mais plataforma móvel para joelhos/pés assistidos',
        'back_extension'=>'apoio inclinado ou horizontal para quadril/coxa e plataforma de pés; tronco fica livre para flexão/extensão',
        'ab_crunch'=>'assento com encosto, apoios/alças próximos aos ombros e alavanca que fecha tronco e quadril',
        'torso_rotation'=>'assento com joelhos/quadril fixos e apoio superior que gira o tronco para os lados',
        'calf_raise'=>'plataforma pequena para ponta dos pés com ombreiras acima; exercício em pé',
        'seated_calf_raise'=>'assento baixo com apoio acolchoado sobre as coxas/joelhos e plataforma para ponta dos pés',
        'treadmill'=>'esteira longa com lona/correia horizontal e console frontal',
        'stationary_bike'=>'bicicleta vertical com selim alto sobre pedais e guidão/console à frente',
        'recumbent_bike'=>'banco baixo largo com encosto e pedais posicionados à frente do corpo',
        'rower'=>'trilho longo com banco deslizante, apoio de pés e puxador ligado a corrente/cabo',
        'elliptical'=>'duas plataformas grandes para pés e braços móveis altos; trajetória elíptica',
        'stair_climber'=>'degraus reais em movimento contínuo ou pedais tipo escada com corrimãos altos',
        'ski_erg'=>'torre vertical alta com duas cordas/pegadores descendo de polias superiores; usuário permanece em pé',
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
    $signatures = training_machine_visual_signatures();
    $lines = [];
    foreach ($catalog as $id => $item) {
        $lines[] = $id . '=' . $item['name'] . ' | pistas visuais: ' . ($signatures[$id] ?? $item['equipment']);
    }
    return 'Você é um classificador visual de aparelhos de academia. Analise geometria, apoios, trilhos, cabos, braços, plataforma e posição do usuário. '
        . 'Não use marca, cor ou texto como evidência principal. Primeiro avalie se a foto mostra o aparelho inteiro com nitidez suficiente; depois compare as classes visualmente mais parecidas. '
        . 'Se o enquadramento estiver cortado, muito escuro/desfocado ou a classe não estiver na taxonomia, use machineId null e imageQuality poor quando aplicável. '
        . 'Taxonomia fechada:' . "\n" . implode("\n", $lines) . "\n"
        . 'Não dê conselhos, não identifique pessoas e ignore rostos/textos pessoais. '
        . 'Responda SOMENTE JSON: {"machineId":"id-ou-null","confidence":0.0,"alternatives":["id"],'
        . '"imageQuality":"good|poor","evidence":["característica visual"],"retakeReason":"motivo curto ou vazio"}. '
        . 'confidence vai de 0 a 1; no máximo 3 alternativas e 3 evidências visuais objetivas.';
}
/** @return array{machineId:?string,confidence:float,alternatives:list<string>,imageQuality:string,evidence:list<string>,retakeReason:string} */
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
    $imageQuality = ($data['imageQuality'] ?? '') === 'poor' ? 'poor' : 'good';
    $evidence = [];
    foreach ((array)($data['evidence'] ?? []) as $item) {
        if (!is_string($item)) continue;
        $clean = trim(strip_tags($item));
        if ($clean !== '') $evidence[] = mb_substr($clean, 0, 160, 'UTF-8');
        if (count($evidence) >= 3) break;
    }
    $retakeReason = is_string($data['retakeReason'] ?? null)
        ? mb_substr(trim(strip_tags((string)$data['retakeReason'])), 0, 180, 'UTF-8') : '';
    if ($imageQuality === 'poor') $confidence = min($confidence, 0.49);
    return [
        'machineId'=>$machineId, 'confidence'=>round($confidence, 3), 'alternatives'=>$alternatives,
        'imageQuality'=>$imageQuality, 'evidence'=>$evidence, 'retakeReason'=>$retakeReason,
    ];
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
                ['type'=>'text','text'=>'Identifique o aparelho desta foto. Compare estrutura, apoios, trilhos, cabos e posição de uso com as pistas da taxonomia. Se a foto estiver ruim ou a máquina não estiver coberta, prefira null em vez de chutar.'],
                ['type'=>'image_url','image_url'=>['url'=>$image,'detail'=>'high']],
            ]],
        ],
        'temperature'=>0, 'max_tokens'=>320,
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
                'recognized'=>$machine !== null && $parsed['imageQuality'] === 'good' && $parsed['confidence'] >= 0.65,
                'machine'=>$machine !== null ? ['id'=>$id] + $machine : null,
                'confidence'=>$parsed['confidence'], 'alternatives'=>$alternatives,
                'imageQuality'=>$parsed['imageQuality'], 'evidence'=>$parsed['evidence'],
                'retakeReason'=>$parsed['retakeReason'], 'provider'=>$provider->name(),
            ];
        } catch (LlmProviderException|UnexpectedValueException|InvalidArgumentException $error) {
            $failures[] = $error instanceof LlmProviderException ? $error->kind : 'response';
        }
    }
    throw new AssistantProvidersExhausted('Reconhecimento visual indisponível.', array_map(
        static fn(string $kind): array => ['kind'=>$kind,'http_status'=>0], $failures,
    ));
}
