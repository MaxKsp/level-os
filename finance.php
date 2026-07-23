<?php
declare(strict_types=1);

/**
 * Armazenamento relacional dos dados financeiros (transactions/accounts).
 * Preserva o contrato de array do front: mesmas chaves e shapes que o kv
 * usava. client_id guarda o id string do front (genId), ids nao mudam.
 *
 * Chaves kv -> set relacional:
 *   expense_lines_v4 -> transactions kind=expense
 *   income_lines     -> transactions kind=income
 *   ifood-entries    -> transactions kind=income_var
 *   accounts_v2      -> accounts
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/app/Modules/Progress/ProgressService.php';
require_once __DIR__ . '/app/Modules/Finance/FinanceRead.php';
require_once __DIR__ . '/app/Modules/Finance/FinanceWrite.php';
require_once __DIR__ . '/app/Modules/Finance/FinanceMigration.php';
