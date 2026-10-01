<?php
declare(strict_types=1);
require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Training/TrainingKnowledgeService.php';

return static function (): void {
    test_assert_same('supino com halteres', training_knowledge_key('Supino com Hálteres!'),
        'Search normalization must preserve accented words.');
    test_assert_true(in_array('bench press', training_knowledge_search_needles('supino reto'), true),
        'Brazilian exercise names must expand to useful English aliases.');
    test_assert_true(in_array('leg extension', training_knowledge_search_needles('cadeira extensora'), true),
        'Machine aliases must support Portuguese searches over English upstream content.');

    $row = [
        'id'=>75, 'category'=>['name'=>'Chest'],
        'muscles'=>[['name_en'=>'Pectoralis major']], 'muscles_secondary'=>[],
        'equipment'=>[['name'=>'Dumbbell'],['name'=>'Bench']],
        'license'=>['short_name'=>'CC-BY-SA 3','url'=>'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
        'license_author'=>'source author',
        'images'=>[['is_main'=>true,'image'=>'https://wger.de/media/exercise.webp',
            'thumbnails'=>['medium'=>'https://wger.de/media/exercise.medium.png'],
            'license'=>2,'license_author'=>'Imagem']],
        'videos'=>[['video'=>'https://wger.de/media/exercise-video/75/demo.MP4',
            'codec'=>'h264','is_main'=>true,'duration'=>'14.16','license'=>2,'license_author'=>'Goulart']],
        'translations'=>[
            ['language'=>2,'name'=>'Dumbbell Bench Press','description_source'=>'English description','license_author'=>'English author'],
            ['language'=>7,'name'=>'Supino com halteres','description_source'=>'Controle a descida e mantenha os pés apoiados.',
                'license_author'=>'Autor PT'],
        ],
    ];
    $item = training_knowledge_normalize($row);
    test_assert_true(is_array($item), 'Valid Wger exercise must normalize.');
    test_assert_same('Supino com halteres', $item['name'], 'Portuguese translation must have priority.');
    test_assert_same('pt', $item['language'], 'Portuguese source must be labeled.');
    test_assert_same('Peito', $item['group'], 'Chest exercise must map to Peito.');
    test_assert_same(['Halteres','Banco'], $item['equipment'], 'Equipment must be localized.');
    test_assert_same('https://wger.de/media/exercise.medium.png', $item['imageUrl'], 'Only Wger images are accepted.');
    test_assert_same('CC-BY-SA 4', $item['imageLicense'], 'Image-specific license must be preserved.');
    test_assert_same('https://wger.de/media/exercise-video/75/demo.MP4', $item['video']['url'], 'Licensed Wger video is preserved.');
    test_assert_same('Goulart', $item['video']['author'], 'Video attribution is preserved.');
    test_assert_same('CC-BY-SA 4', $item['video']['license'], 'Video-specific license must be preserved.');
    test_assert_same('CC-BY-SA 3', $item['license'], 'Exercise license metadata is preserved.');

    $row['translations'] = [['language'=>2,'name'=>'Bench Press','description_source'=>'English only']];
    $fallback = training_knowledge_normalize($row);
    test_assert_same('fallback', $fallback['language'], 'English fallback must be explicit, not presented as Portuguese.');

    $row['images'][0]['image'] = 'https://example.com/image.webp';
    $row['images'][0]['thumbnails'] = [];
    test_assert_same(null, training_knowledge_normalize($row)['imageUrl'], 'Foreign image hosts are rejected.');

    $free = training_reference_normalize_free([
        'id'=>'Barbell_Curl', 'name'=>'Barbell Curl', 'category'=>'strength', 'equipment'=>'barbell',
        'primaryMuscles'=>['biceps'], 'secondaryMuscles'=>['forearms'],
        'instructions'=>['Keep the elbows stable.'], 'images'=>['Barbell_Curl/0.jpg'],
    ]);
    test_assert_true(is_array($free), 'Free Exercise DB entries with images must normalize.');
    test_assert_true(str_starts_with((string)$free['imageUrl'], TRAINING_REFERENCE_FREE_DB_ASSET_BASE),
        'Free Exercise DB image must stay on the canonical GitHub raw host.');
    test_assert_same('Braços', $free['group'], 'Free Exercise DB muscles must map to Level OS groups.');
    test_assert_same('free-exercise-db', $free['source'], 'Free Exercise DB source attribution must be preserved.');
    test_assert_same(null, training_reference_normalize_free([
        'id'=>'No_Image','name'=>'No Image','category'=>'strength','equipment'=>'barbell',
        'primaryMuscles'=>['biceps'],'secondaryMuscles'=>[],'instructions'=>[],'images'=>[],
    ]), 'Image-less Free Exercise DB records must never enter the public library.');

    $rep = training_reference_normalize_repdb([
        'id'=>'kettlebell-halo', 'name_en'=>'Kettlebell Halo', 'category'=>'strength',
        'equipment'=>'kettlebell', 'body_part'=>'shoulders', 'primary_muscles'=>['deltoids'],
        'secondary_muscles'=>[], 'instructions_en'=>['Move with control.'],
        'images'=>['flat'=>['start'=>'images/flat/kettlebell-halo-start.webp']],
    ]);
    test_assert_true(is_array($rep), 'RepDB illustrated entries must normalize.');
    test_assert_same('Ombros', $rep['group'], 'RepDB body-part metadata must map to Level OS groups.');
    test_assert_same('RepDB Free Tier License v1.0', $rep['imageLicense'], 'RepDB image license must remain explicit.');
    test_assert_same('repdb', $rep['source'], 'RepDB source attribution must be preserved.');
    test_assert_same(null, training_reference_asset_url(TRAINING_REFERENCE_REPDB_ASSET_BASE, '../secret.webp'),
        'Reference asset paths must reject traversal.');
};
