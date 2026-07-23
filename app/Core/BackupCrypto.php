<?php
declare(strict_types=1);

/**
 * Fase 4C - Primitivas de criptografia autenticada pro artefato de
 * backup. Exclusivamente libsodium secretstream (XChaCha20-Poly1305):
 * stream criptografado autenticado, por chunks, com tag de finalizacao
 * obrigatoria. Sem framework, sem config.php — so recebe a chave ja
 * decodificada (ou le do ambiente via backup_crypto_read_key()).
 *
 * Formato do artefato (todo campo publico e so o estritamente
 * necessario pra decodificar; qualquer coisa que descreva o conteudo —
 * nomes de tabela, contagens, timestamps, schema — fica DENTRO do
 * stream criptografado, nunca no cabecalho):
 *
 *   MAGIC (7 bytes, "ORBYBKP")
 *   VERSION (1 byte)
 *   ALGO (1 byte)
 *   secretstream header (24 bytes, SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES)
 *   frame*  = uint32BE length + ciphertext (length-prefixado, limite maximo por frame)
 *
 * A ultima frame tem TAG_FINAL. Qualquer byte depois dela, EOF antes
 * dela, frame acima do limite, versao/algoritmo desconhecido ou falha
 * de autenticacao (chave errada, header alterado, bit alterado) sao
 * tratados como corrupcao — sempre um BackupCryptoException com
 * mensagem fixa seguem, nunca com dado decifrado ou a chave.
 */

const BACKUP_ARTIFACT_MAGIC = 'ORBYBKP';
const BACKUP_ARTIFACT_VERSION = 1;
const BACKUP_ARTIFACT_ALGO_XCHACHA20POLY1305_SECRETSTREAM = 1;

/** Limite maximo de bytes de ciphertext por frame — protege contra frame gigante/DoS de memoria. */
const BACKUP_CRYPTO_MAX_FRAME_BYTES = 1_048_576; // 1 MiB

const BACKUP_CRYPTO_ENV_KEY_NAME = 'LEVELOS_BACKUP_KEY';
// Instalações antigas exportavam o nome legado; aceito até o rename no servidor.
const BACKUP_CRYPTO_LEGACY_ENV_KEY_NAME = 'ORBY_BACKUP_KEY';

/** Excecao segura: mensagem sempre fixa, nunca inclui a chave, plaintext ou bytes brutos. */
class BackupCryptoException extends RuntimeException {
}

/** Nome de classe seguro pra saida/log: allowlist fechada, nunca get_class() cru. */
function backup_exception_class(Throwable $e): string {
    if ($e instanceof PDOException) return 'PDOException';
    if ($e instanceof JsonException) return 'JsonException';
    if ($e instanceof TypeError) return 'TypeError';
    if ($e instanceof ValueError) return 'ValueError';
    if ($e instanceof InvalidArgumentException) return 'InvalidArgumentException';
    if ($e instanceof LogicException) return 'LogicException';
    if ($e instanceof BackupCryptoException) return 'BackupCryptoException';
    if ($e instanceof RuntimeException) return 'RuntimeException';
    return 'Throwable';
}

/** Falha fechado se ext-sodium (ou a funcao secretstream especifica) nao estiver disponivel. */
function backup_crypto_require_sodium(): void {
    if (!extension_loaded('sodium') || !function_exists('sodium_crypto_secretstream_xchacha20poly1305_init_push')) {
        throw new BackupCryptoException('sodium extension is not available');
    }
}

/**
 * Le e valida a chave de criptografia de uma variavel de ambiente
 * (default LEVELOS_BACKUP_KEY, aceitando o legado ORBY_BACKUP_KEY): precisa ser
 * base64 estrito de exatamente
 * SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_KEYBYTES apos decode.
 * Nunca aceita fallback de VALOR (DB_PASS, valor hardcoded, string curta) e
 * nunca inclui o valor lido na mensagem de erro.
 */
function backup_crypto_read_key(string $envName = BACKUP_CRYPTO_ENV_KEY_NAME): string {
    backup_crypto_require_sodium();

    $raw = getenv($envName);
    if (($raw === false || $raw === '') && $envName === BACKUP_CRYPTO_ENV_KEY_NAME) {
        $raw = getenv(BACKUP_CRYPTO_LEGACY_ENV_KEY_NAME);
    }
    if ($raw === false || $raw === '') {
        throw new BackupCryptoException('backup encryption key is not configured');
    }

    $decoded = base64_decode($raw, true);
    if ($decoded === false || strlen($decoded) !== SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_KEYBYTES) {
        throw new BackupCryptoException('backup encryption key is invalid');
    }

    return $decoded;
}

/**
 * Escreve um artefato de backup criptografado, frame a frame, num
 * stream ja aberto para escrita (o chamador decide o destino real —
 * tipicamente um arquivo temporario, com rename atomico so depois do
 * TAG_FINAL). O cabecalho do container e escrito no construtor.
 */
final class BackupArtifactWriter {
    /** @var resource */
    private $handle;
    private string $state;
    private bool $finalWritten = false;
    private int $bytesWritten = 0;

    /** @param resource $handle */
    public function __construct($handle, string $key) {
        backup_crypto_require_sodium();
        $this->handle = $handle;

        [$state, $header] = sodium_crypto_secretstream_xchacha20poly1305_init_push($key);
        $this->state = $state;

        $this->writeRaw(
            BACKUP_ARTIFACT_MAGIC
            . chr(BACKUP_ARTIFACT_VERSION)
            . chr(BACKUP_ARTIFACT_ALGO_XCHACHA20POLY1305_SECRETSTREAM)
            . $header
        );
    }

    /** Criptografa e escreve uma frame. $final=true marca TAG_FINAL — nenhuma frame pode vir depois. */
    public function writeFrame(string $plaintext, bool $final = false): void {
        if ($this->finalWritten) {
            throw new BackupCryptoException('cannot write additional frames after the final frame');
        }

        $tag = $final
            ? SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL
            : SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_MESSAGE;
        $cipher = sodium_crypto_secretstream_xchacha20poly1305_push($this->state, $plaintext, '', $tag);

        if (strlen($cipher) > BACKUP_CRYPTO_MAX_FRAME_BYTES) {
            throw new BackupCryptoException('backup artifact frame exceeds the allowed size');
        }

        $this->writeRaw(pack('N', strlen($cipher)) . $cipher);

        if ($final) {
            $this->finalWritten = true;
        }
    }

    public function finalWritten(): bool {
        return $this->finalWritten;
    }

    public function bytesWritten(): int {
        return $this->bytesWritten;
    }

    /**
     * fwrite() pode gravar menos bytes do que pedido numa unica chamada
     * (escrita parcial) — isso NAO e falha, e comportamento normal de
     * stream. Repete ate gravar tudo; so lanca se uma chamada realmente
     * falhar (false) ou parar de progredir (0 bytes, sem ser o fim dos
     * dados a gravar).
     */
    private function writeRaw(string $bytes): void {
        $total = strlen($bytes);
        $offset = 0;
        while ($offset < $total) {
            $written = @fwrite($this->handle, substr($bytes, $offset));
            if ($written === false || $written <= 0) {
                throw new BackupCryptoException('failed to write the backup artifact');
            }
            $offset += $written;
            $this->bytesWritten += $written;
        }
    }
}

/**
 * Le e autentica um artefato de backup, frame a frame, de um stream ja
 * aberto para leitura. Le e valida o cabecalho do container no
 * construtor. Cada readFrame() decifra e autentica exatamente uma
 * frame; retorna null so em EOF limpo, e so depois de TAG_FINAL —
 * qualquer outra condicao de fim/tamanho/autenticacao lanca
 * BackupCryptoException.
 */
final class BackupArtifactReader {
    /** @var resource */
    private $handle;
    private string $state;
    private bool $sawFinal = false;
    private int $bytesRead = 0;

    /** @param resource $handle */
    public function __construct($handle, string $key) {
        backup_crypto_require_sodium();
        $this->handle = $handle;

        $magic = $this->readExact(strlen(BACKUP_ARTIFACT_MAGIC));
        if ($magic !== BACKUP_ARTIFACT_MAGIC) {
            throw new BackupCryptoException('backup artifact has an invalid or unrecognized format');
        }

        $versionByte = $this->readExact(1);
        if (strlen($versionByte) !== 1 || ord($versionByte) !== BACKUP_ARTIFACT_VERSION) {
            throw new BackupCryptoException('backup artifact has an unsupported format version');
        }

        $algoByte = $this->readExact(1);
        if (strlen($algoByte) !== 1 || ord($algoByte) !== BACKUP_ARTIFACT_ALGO_XCHACHA20POLY1305_SECRETSTREAM) {
            throw new BackupCryptoException('backup artifact uses an unsupported algorithm');
        }

        $header = $this->readExact(SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES);
        if (strlen($header) !== SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES) {
            throw new BackupCryptoException('backup artifact is truncated');
        }

        try {
            $this->state = sodium_crypto_secretstream_xchacha20poly1305_init_pull($header, $key);
        } catch (\SodiumException) {
            throw new BackupCryptoException('backup artifact has an invalid header');
        }
    }

    /** @return array{plaintext: string, final: bool}|null null so em EOF limpo apos TAG_FINAL. */
    public function readFrame(): ?array {
        if ($this->sawFinal) {
            $extra = $this->readExact(1);
            if ($extra !== '') {
                throw new BackupCryptoException('backup artifact has trailing data after the final frame');
            }
            return null;
        }

        $lenBytes = $this->readExact(4);
        if (strlen($lenBytes) !== 4) {
            throw new BackupCryptoException('backup artifact ended unexpectedly before the final frame');
        }

        $len = unpack('N', $lenBytes)[1];
        if ($len <= 0 || $len > BACKUP_CRYPTO_MAX_FRAME_BYTES) {
            throw new BackupCryptoException('backup artifact frame exceeds the allowed size');
        }

        $cipher = $this->readExact($len);
        if (strlen($cipher) !== $len) {
            throw new BackupCryptoException('backup artifact frame is truncated');
        }

        $result = sodium_crypto_secretstream_xchacha20poly1305_pull($this->state, $cipher);
        if ($result === false) {
            throw new BackupCryptoException('backup artifact failed authentication (corrupt or tampered)');
        }
        [$plaintext, $tag] = $result;

        $isFinal = $tag === SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL;
        if ($isFinal) {
            $this->sawFinal = true;
        }

        return ['plaintext' => $plaintext, 'final' => $isFinal];
    }

    public function sawFinal(): bool {
        return $this->sawFinal;
    }

    public function bytesRead(): int {
        return $this->bytesRead;
    }

    private function readExact(int $n): string {
        $buf = '';
        while (strlen($buf) < $n) {
            $chunk = fread($this->handle, $n - strlen($buf));
            if ($chunk === false || $chunk === '') {
                break;
            }
            $buf .= $chunk;
        }
        $this->bytesRead += strlen($buf);
        return $buf;
    }
}
