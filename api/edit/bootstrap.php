<?php
declare(strict_types=1);

final class EditApiException extends RuntimeException
{
    public int $httpStatus;

    public function __construct(string $message, int $httpStatus = 400)
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
    }
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

set_exception_handler(static function (Throwable $error): void {
    $status = $error instanceof EditApiException ? $error->httpStatus : 500;
    if ($status >= 500) {
        error_log('Vensis Edit API: ' . $error->getMessage());
    }
    http_response_code($status);
    echo json_encode([
        'ok' => false,
        'error' => $status >= 500 ? 'The edit service could not complete the request.' : $error->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
});

function edit_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function edit_env(string $name): string
{
    $value = getenv($name);
    return is_string($value) ? trim($value) : '';
}

function edit_persistent_config_path(): string
{
    $outsidePublicHtml = '';
    $candidates = [(string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), __DIR__];
    foreach ($candidates as $candidate) {
        $normalized = str_replace('\\', '/', rtrim($candidate, '/\\'));
        $marker = '/public_html';
        $position = strrpos($normalized, $marker);
        $afterMarker = $position === false ? '' : substr($normalized, $position + strlen($marker), 1);
        if ($position !== false && ($afterMarker === '' || $afterMarker === '/')) {
            $outsidePublicHtml = substr($normalized, 0, $position);
            break;
        }
    }
    if ($outsidePublicHtml === '') {
        $base = realpath(__DIR__);
        $base = is_string($base) ? $base : __DIR__;
        $outsidePublicHtml = dirname($base, 4);
    }
    if ($outsidePublicHtml === '' || $outsidePublicHtml === '.' || $outsidePublicHtml === DIRECTORY_SEPARATOR) {
        return '';
    }
    return $outsidePublicHtml . DIRECTORY_SEPARATOR . '.vensis-edit' . DIRECTORY_SEPARATOR . 'config.php';
}

function edit_load_config_file(string $path): array
{
    $loaded = require $path;
    if (!is_array($loaded)) {
        throw new EditApiException('Edit configuration is invalid.', 500);
    }
    return $loaded;
}

function edit_persist_config(array $values, string $path): bool
{
    if ($path === '') {
        return false;
    }
    $directory = dirname($path);
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        return false;
    }
    @chmod($directory, 0700);
    $temporary = @tempnam($directory, '.config-');
    if (!is_string($temporary)) {
        return false;
    }
    $source = "<?php\ndeclare(strict_types=1);\n\nreturn " . var_export($values, true) . ";\n";
    $written = @file_put_contents($temporary, $source, LOCK_EX);
    if ($written === false || !@chmod($temporary, 0600) || !@rename($temporary, $path)) {
        @unlink($temporary);
        return false;
    }
    return true;
}

function edit_config(): array
{
    static $config;
    if (is_array($config)) {
        return $config;
    }

    $defaults = [
        'password_hash' => '',
        'github_token' => '',
        'github_repository' => 'metinvelidedeoglu-maker/vensis-fan-selection',
        'github_branch' => 'main',
        'session_name' => 'vensis_secure_edit',
        'session_ttl' => 1800,
        'session_absolute_ttl' => 7200,
        'login_max_attempts' => 5,
        'login_window_seconds' => 900,
        'login_block_seconds' => 900,
        'runtime_dir' => sys_get_temp_dir() . '/vensis-edit-runtime',
        'data_files' => [
            'data/fans-01.js', 'data/fans-02.js', 'data/fans-03.js', 'data/fans-04.js',
            'data/fans-05.js', 'data/fans-06.js', 'data/fans-07.js',
        ],
        'series_overrides_file' => 'data/series-overrides.js',
    ];

    $explicitConfigPath = edit_env('VENSIS_EDIT_CONFIG');
    $legacyConfigPath = __DIR__ . '/config.local.php';
    $persistentConfigPath = edit_persistent_config_path();
    $configPath = $explicitConfigPath;
    if ($configPath === '') {
        $configPath = is_file($legacyConfigPath)
            ? $legacyConfigPath
            : $persistentConfigPath;
    }
    $local = [];
    $persistentReady = false;
    if ($configPath !== '' && is_file($configPath)) {
        $local = edit_load_config_file($configPath);
        $persistentReady = $configPath === $persistentConfigPath || $explicitConfigPath !== '';
        if ($configPath === $legacyConfigPath && $persistentConfigPath !== '') {
            $shouldMigrate = !is_file($persistentConfigPath)
                || (int) @filemtime($legacyConfigPath) > (int) @filemtime($persistentConfigPath);
            $persistentReady = !$shouldMigrate || edit_persist_config($local, $persistentConfigPath);
        }
    }

    $config = array_replace($defaults, $local);
    $environment = [
        'password_hash' => edit_env('VENSIS_EDIT_PASSWORD_HASH'),
        'github_token' => edit_env('VENSIS_GITHUB_TOKEN'),
        'github_repository' => edit_env('VENSIS_GITHUB_REPOSITORY'),
        'github_branch' => edit_env('VENSIS_GITHUB_BRANCH'),
        'runtime_dir' => edit_env('VENSIS_EDIT_RUNTIME_DIR'),
    ];
    foreach ($environment as $key => $value) {
        if ($value !== '') {
            $config[$key] = $value;
        }
    }
    if ($environment['password_hash'] !== '' && $environment['github_token'] !== '') {
        $persistentReady = true;
    }

    $config['session_ttl'] = max(300, min(86400, (int) $config['session_ttl']));
    $config['session_absolute_ttl'] = max($config['session_ttl'], min(604800, (int) $config['session_absolute_ttl']));
    $config['login_max_attempts'] = max(3, min(20, (int) $config['login_max_attempts']));
    $config['login_window_seconds'] = max(60, min(86400, (int) $config['login_window_seconds']));
    $config['login_block_seconds'] = max(60, min(86400, (int) $config['login_block_seconds']));
    $config['_persistent_config_ready'] = $persistentReady;
    return $config;
}

function edit_is_configured(array $config): bool
{
    $hashInfo = password_get_info((string) $config['password_hash']);
    return !empty($hashInfo['algo'])
        && preg_match('/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/', (string) $config['github_repository']) === 1
        && trim((string) $config['github_branch']) !== ''
        && strlen((string) $config['github_token']) >= 20;
}

function edit_require_configured(array $config): void
{
    if (!edit_is_configured($config)) {
        throw new EditApiException('Edit Mode has not been configured on the server.', 503);
    }
}

function edit_require_persistent_config(array $config): void
{
    if (empty($config['_persistent_config_ready'])) {
        throw new EditApiException('Server settings are not stored outside the deployment folder yet.', 503);
    }
}

function edit_require_method(string $method): void
{
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== strtoupper($method)) {
        header('Allow: ' . strtoupper($method));
        throw new EditApiException('Method not allowed.', 405);
    }
}

function edit_request_json(int $maximumBytes = 65536): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($contentType, 'application/json') !== 0) {
        throw new EditApiException('JSON content type is required.', 415);
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > $maximumBytes) {
        throw new EditApiException('Request body is invalid.', 413);
    }
    try {
        $data = json_decode($raw === '' ? '{}' : $raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new EditApiException('Request contains invalid JSON.', 400);
    }
    if (!is_array($data)) {
        throw new EditApiException('JSON object is required.', 400);
    }
    return $data;
}

function edit_request_scheme(): string
{
    $forwarded = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    if ($forwarded === 'https') {
        return 'https';
    }
    return !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off' ? 'https' : 'http';
}

function edit_require_same_origin(): void
{
    $fetchSite = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($fetchSite !== '' && !in_array($fetchSite, ['same-origin', 'none'], true)) {
        throw new EditApiException('Cross-origin request rejected.', 403);
    }

    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') {
        return;
    }
    $parts = parse_url($origin);
    $requestHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $originHost = strtolower((string) ($parts['host'] ?? ''));
    $originPort = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
    if ($originHost . $originPort !== $requestHost || strtolower((string) ($parts['scheme'] ?? '')) !== edit_request_scheme()) {
        throw new EditApiException('Cross-origin request rejected.', 403);
    }
}

function edit_begin_session(array $config): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Strict');
    session_name((string) $config['session_name']);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => edit_request_scheme() === 'https',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function edit_session_authenticated(array $config, bool $touch = true): bool
{
    edit_begin_session($config);
    if (empty($_SESSION['edit_authenticated'])) {
        return false;
    }
    $now = time();
    $created = (int) ($_SESSION['edit_created_at'] ?? 0);
    $last = (int) ($_SESSION['edit_last_activity'] ?? 0);
    if ($created < $now - $config['session_absolute_ttl'] || $last < $now - $config['session_ttl']) {
        edit_destroy_session($config);
        return false;
    }
    if ($touch) {
        $_SESSION['edit_last_activity'] = $now;
    }
    return true;
}

function edit_require_session(array $config): void
{
    if (!edit_session_authenticated($config)) {
        throw new EditApiException('Edit session has expired. Sign in again.', 401);
    }
}

function edit_csrf_token(): string
{
    if (empty($_SESSION['edit_csrf'])) {
        $_SESSION['edit_csrf'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['edit_csrf'];
}

function edit_require_csrf(): void
{
    $provided = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = (string) ($_SESSION['edit_csrf'] ?? '');
    if ($provided === '' || $expected === '' || !hash_equals($expected, $provided)) {
        throw new EditApiException('Security token is invalid. Refresh and sign in again.', 403);
    }
}

function edit_destroy_session(array $config): void
{
    edit_begin_session($config);
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'] ?: '/',
            'domain' => $params['domain'] ?: '',
            'secure' => (bool) $params['secure'],
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }
    session_destroy();
}

function edit_runtime_dir(array $config): string
{
    $directory = rtrim((string) $config['runtime_dir'], DIRECTORY_SEPARATOR);
    if ($directory === '' || (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory))) {
        throw new EditApiException('Edit runtime directory is unavailable.', 500);
    }
    return $directory;
}

function edit_client_fingerprint(array $config): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return hash('sha256', $config['github_repository'] . '|' . $ip);
}

function edit_rate_state(array $config, callable $mutator): array
{
    $path = edit_runtime_dir($config) . '/login-' . edit_client_fingerprint($config) . '.json';
    $handle = fopen($path, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        throw new EditApiException('Login protection is unavailable.', 500);
    }
    $raw = stream_get_contents($handle);
    $state = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
    if (!is_array($state)) {
        $state = [];
    }
    $state = $mutator($state);
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($state, JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    return $state;
}

function edit_login_retry_after(array $config): int
{
    $now = time();
    $state = edit_rate_state($config, static function (array $state) use ($config, $now): array {
        $state['attempts'] = array_values(array_filter(
            is_array($state['attempts'] ?? null) ? $state['attempts'] : [],
            static fn ($timestamp): bool => is_int($timestamp) && $timestamp >= $now - $config['login_window_seconds']
        ));
        if ((int) ($state['blocked_until'] ?? 0) <= $now) {
            $state['blocked_until'] = 0;
        }
        return $state;
    });
    return max(0, (int) ($state['blocked_until'] ?? 0) - $now);
}

function edit_record_login_failure(array $config): int
{
    $now = time();
    $state = edit_rate_state($config, static function (array $state) use ($config, $now): array {
        $attempts = array_values(array_filter(
            is_array($state['attempts'] ?? null) ? $state['attempts'] : [],
            static fn ($timestamp): bool => is_int($timestamp) && $timestamp >= $now - $config['login_window_seconds']
        ));
        $attempts[] = $now;
        $state['attempts'] = $attempts;
        if (count($attempts) >= $config['login_max_attempts']) {
            $state['blocked_until'] = $now + $config['login_block_seconds'];
        }
        return $state;
    });
    return max(0, (int) ($state['blocked_until'] ?? 0) - $now);
}

function edit_clear_login_failures(array $config): void
{
    edit_rate_state($config, static fn (array $state): array => []);
}

function edit_audit(array $config, string $event, array $details = []): void
{
    $record = array_merge([
        'time' => gmdate('c'),
        'event' => $event,
        'client' => substr(edit_client_fingerprint($config), 0, 16),
    ], $details);
    @file_put_contents(
        edit_runtime_dir($config) . '/edit-audit.log',
        json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL,
        FILE_APPEND | LOCK_EX
    );
}

function edit_github_request(array $config, string $method, string $path, ?array $payload = null): array
{
    if (!function_exists('curl_init')) {
        throw new EditApiException('Server cURL support is required.', 500);
    }
    $url = 'https://api.github.com' . $path;
    $curl = curl_init($url);
    $headers = [
        'Accept: application/vnd.github+json',
        'Authorization: Bearer ' . $config['github_token'],
        'X-GitHub-Api-Version: 2022-11-28',
        'User-Agent: Vensis-Secure-Edit',
    ];
    if ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
    }
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    if ($payload !== null) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }
    $body = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if (!is_string($body)) {
        throw new EditApiException('GitHub connection failed: ' . ($curlError !== '' ? 'network error' : 'empty response'), 502);
    }
    try {
        $decoded = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new EditApiException('GitHub returned an invalid response.', 502);
    }
    if (!is_array($decoded) || $status < 200 || $status >= 300) {
        $publicStatus = in_array($status, [409, 422], true) ? 409 : 502;
        throw new EditApiException($publicStatus === 409 ? 'The catalog data changed on GitHub. Reload the page and try again.' : 'GitHub could not save the change.', $publicStatus);
    }
    return $decoded;
}

function edit_encode_path(string $value): string
{
    return implode('/', array_map('rawurlencode', explode('/', $value)));
}

function edit_github_file(array $config, string $path): array
{
    $repository = edit_encode_path((string) $config['github_repository']);
    $file = edit_encode_path($path);
    $branch = rawurlencode((string) $config['github_branch']);
    $result = edit_github_request($config, 'GET', "/repos/{$repository}/contents/{$file}?ref={$branch}");
    $content = base64_decode(str_replace(["\r", "\n"], '', (string) ($result['content'] ?? '')), true);
    if (!is_string($content) || empty($result['sha'])) {
        throw new EditApiException('GitHub file content is unavailable.', 502);
    }
    return ['content' => $content, 'sha' => (string) $result['sha']];
}

function edit_github_write_file(
    array $config,
    string $path,
    string $content,
    string $message,
    ?string $sha = null
): array {
    $repository = edit_encode_path((string) $config['github_repository']);
    $file = edit_encode_path($path);
    $payload = [
        'message' => substr($message, 0, 240),
        'content' => base64_encode($content),
        'branch' => (string) $config['github_branch'],
    ];
    if (is_string($sha) && $sha !== '') {
        $payload['sha'] = $sha;
    }
    return edit_github_request($config, 'PUT', "/repos/{$repository}/contents/{$file}", $payload);
}

function edit_parse_series_overrides(string $source): array
{
    if (!preg_match('/^\s*window\.VensisSeriesOverrides\s*=\s*(\{.*\})\s*;\s*$/s', $source, $matches)) {
        throw new EditApiException('Series override file format is not recognized.', 500);
    }
    try {
        $overrides = json_decode($matches[1], true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new EditApiException('Series override file contains invalid data.', 500);
    }
    if (!is_array($overrides)) {
        throw new EditApiException('Series override file contains invalid records.', 500);
    }
    return $overrides;
}

function edit_serialize_series_overrides(array $overrides): string
{
    ksort($overrides, SORT_NATURAL | SORT_FLAG_CASE);
    return 'window.VensisSeriesOverrides=' . json_encode(
        $overrides,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    ) . ';' . PHP_EOL;
}

function edit_parse_models(string $source): array
{
    if (!preg_match('/^\s*window\.models\.push\(\.\.\.(\[.*\])\);\s*$/s', $source, $matches)) {
        throw new EditApiException('Fan data file format is not recognized.', 500);
    }
    try {
        $models = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new EditApiException('Fan data file contains invalid data.', 500);
    }
    if (!is_array($models)) {
        throw new EditApiException('Fan data file contains invalid models.', 500);
    }
    return $models;
}

function edit_serialize_models(array $models): string
{
    return 'window.models.push(...' . json_encode(
        $models,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR
    ) . ');' . PHP_EOL;
}

function edit_locate_model_file(array $config, string $modelKey): string
{
    $root = dirname(__DIR__, 2);
    $needle = json_encode($modelKey, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    foreach ($config['data_files'] as $relativePath) {
        $path = $root . '/' . $relativePath;
        $source = is_file($path) ? file_get_contents($path) : false;
        if (is_string($source) && strpos($source, '"key":' . $needle) !== false) {
            return $relativePath;
        }
    }
    throw new EditApiException('Model was not found.', 404);
}

function edit_locate_series_file(array $config, string $seriesKey): string
{
    $root = dirname(__DIR__, 2);
    foreach ($config['data_files'] as $relativePath) {
        $path = $root . '/' . $relativePath;
        $source = is_file($path) ? file_get_contents($path) : false;
        if (!is_string($source)) {
            continue;
        }
        foreach (edit_parse_models($source) as $model) {
            if (is_array($model) && hash_equals((string) ($model['series'] ?? ''), $seriesKey)) {
                return $relativePath;
            }
        }
    }
    throw new EditApiException('Series was not found.', 404);
}

function edit_normalize_changes(array $changes): array
{
    $numeric = [
        'price' => [0.0, 10000000.0, false],
        'kw' => [0.0, 100000.0, false],
        'rpm' => [0.0, 100000.0, true],
        'amps' => [0.0, 1000000.0, false],
        'spl' => [0.0, 200.0, false],
        'nominal' => [0.0, 10000000.0, true],
    ];
    $strings = ['model', 'voltage', 'frequency', 'fire', 'fanTypeEn', 'mountTypeEn', 'ipClass'];
    $normalized = [];
    foreach ($changes as $field => $value) {
        if (isset($numeric[$field])) {
            if (!is_int($value) && !is_float($value) && !(is_string($value) && is_numeric($value))) {
                throw new EditApiException("Invalid value for {$field}.", 422);
            }
            $number = (float) $value;
            [$minimum, $maximum, $integer] = $numeric[$field];
            if (!is_finite($number) || $number < $minimum || $number > $maximum) {
                throw new EditApiException("Value for {$field} is outside the allowed range.", 422);
            }
            $normalized[$field] = $integer ? (int) round($number) : $number;
            continue;
        }
        if (in_array($field, $strings, true)) {
            if (!is_string($value)) {
                throw new EditApiException("Invalid value for {$field}.", 422);
            }
            $value = trim($value);
            if (strlen($value) > 120 || preg_match('/[\x00-\x1F\x7F]/', $value)) {
                throw new EditApiException("Invalid value for {$field}.", 422);
            }
            if ($field === 'model' && $value === '') {
                throw new EditApiException('Model name cannot be empty.', 422);
            }
            $normalized[$field] = $value;
            continue;
        }
        throw new EditApiException("Field {$field} cannot be edited.", 422);
    }
    if ($normalized === []) {
        throw new EditApiException('No editable fields were supplied.', 422);
    }
    return $normalized;
}

function edit_apply_changes(array &$model, array $changes): array
{
    $changed = [];
    foreach ($changes as $field => $value) {
        $current = $model[$field] ?? null;
        $same = is_numeric($current) && is_numeric($value)
            ? abs((float) $current - (float) $value) < 0.0000001
            : $current === $value;
        if (!$same) {
            $model[$field] = $value;
            $changed[] = $field;
        }
    }
    return $changed;
}

function edit_commit_model(array $config, string $modelKey, array $changes): array
{
    $relativePath = edit_locate_model_file($config, $modelKey);
    $remote = edit_github_file($config, $relativePath);
    $models = edit_parse_models($remote['content']);
    $modelIndex = null;
    foreach ($models as $index => $model) {
        if (is_array($model) && hash_equals((string) ($model['key'] ?? ''), $modelKey)) {
            $modelIndex = $index;
            break;
        }
    }
    if ($modelIndex === null) {
        throw new EditApiException('Model was not found in the current GitHub version.', 409);
    }

    $changedFields = edit_apply_changes($models[$modelIndex], $changes);
    if ($changedFields === []) {
        return ['unchanged' => true, 'path' => $relativePath, 'fields' => []];
    }

    $modelName = trim((string) ($models[$modelIndex]['model'] ?? 'fan model'));
    $repository = edit_encode_path((string) $config['github_repository']);
    $file = edit_encode_path($relativePath);
    $payload = [
        'message' => 'Edit ' . substr($modelName, 0, 80) . ': ' . implode(', ', $changedFields),
        'content' => base64_encode(edit_serialize_models($models)),
        'sha' => $remote['sha'],
        'branch' => (string) $config['github_branch'],
    ];
    $result = edit_github_request($config, 'PUT', "/repos/{$repository}/contents/{$file}", $payload);
    return [
        'unchanged' => false,
        'path' => $relativePath,
        'fields' => $changedFields,
        'model' => $modelName,
        'commitSha' => (string) ($result['commit']['sha'] ?? ''),
        'commitUrl' => (string) ($result['commit']['html_url'] ?? ''),
    ];
}

function edit_commit_new_model(array $config, string $seriesKey, array $values): array
{
    $relativePath = edit_locate_series_file($config, $seriesKey);
    $remote = edit_github_file($config, $relativePath);
    $models = edit_parse_models($remote['content']);
    $template = null;
    foreach ($models as $model) {
        if (is_array($model) && hash_equals((string) ($model['series'] ?? ''), $seriesKey)) {
            $template = $model;
            break;
        }
    }
    if (!is_array($template)) {
        throw new EditApiException('Series was not found in the current GitHub version. Reload the page and try again.', 409);
    }

    $modelName = trim((string) ($values['model'] ?? ''));
    $nominal = (int) ($values['nominal'] ?? 0);
    foreach ($models as $model) {
        if (!is_array($model) || !hash_equals((string) ($model['series'] ?? ''), $seriesKey)) {
            continue;
        }
        if (strcasecmp(trim((string) ($model['model'] ?? '')), $modelName) === 0
            && abs((float) ($model['nominal'] ?? 0) - $nominal) < 0.0000001) {
            throw new EditApiException('A product with the same model name and airflow already exists in this series.', 409);
        }
    }

    try {
        $randomKey = bin2hex(random_bytes(8));
    } catch (Throwable) {
        throw new EditApiException('A secure product key could not be generated.', 500);
    }
    $key = 'manual|' . $seriesKey . '|' . gmdate('YmdHis') . '|' . $randomKey;
    $display = $modelName . ($nominal > 0 ? ' (' . $nominal . ' m³/h)' : '');
    $fanType = (string) ($values['fanTypeEn'] ?? '');
    $mountType = (string) ($values['mountTypeEn'] ?? '');
    $fanTypeEn = $fanType !== '' ? $fanType : (string) ($template['fanTypeEn'] ?? $template['fanType'] ?? '');
    $mountTypeEn = $mountType !== '' ? $mountType : (string) ($template['mountTypeEn'] ?? $template['mountType'] ?? '');

    $newModel = [
        'key' => $key,
        'display' => $display,
        'model' => $modelName,
        'brand' => (string) ($template['brand'] ?? 'Vitlo'),
        'series' => $seriesKey,
        'fanType' => (string) ($template['fanType'] ?? $fanTypeEn),
        'mountType' => (string) ($template['mountType'] ?? $mountTypeEn),
        'productGroup' => (string) ($template['productGroup'] ?? ''),
        'atex' => (bool) ($template['atex'] ?? false),
        'nominal' => $nominal,
        'kw' => (float) ($values['kw'] ?? 0),
        'rpm' => (int) ($values['rpm'] ?? 0),
        'amps' => (float) ($values['amps'] ?? 0),
        'spl' => (float) ($values['spl'] ?? 0),
        'price' => (float) ($values['price'] ?? 0),
        'pole' => null,
        'fire' => (string) ($values['fire'] ?? ''),
        'voltage' => (string) ($values['voltage'] ?? ''),
        'frequency' => (string) ($values['frequency'] ?? ''),
        'ipClass' => (string) ($values['ipClass'] ?? ''),
        'points' => [],
        'sourcePage' => null,
        'tags' => is_array($template['tags'] ?? null) ? $template['tags'] : [],
        'catalogNameEn' => (string) ($template['catalogNameEn'] ?? $seriesKey),
        'tagsEn' => is_array($template['tagsEn'] ?? null) ? $template['tagsEn'] : [],
        'fanTypeEn' => $fanTypeEn,
        'mountTypeEn' => $mountTypeEn,
        'productGroupEn' => (string) ($template['productGroupEn'] ?? ''),
        'catalogOnly' => true,
        'sourcePoints' => [],
    ];
    $models[] = $newModel;

    $result = edit_github_write_file(
        $config,
        $relativePath,
        edit_serialize_models($models),
        'Add catalog product ' . substr($modelName, 0, 100),
        $remote['sha']
    );
    return [
        'path' => $relativePath,
        'modelKey' => $key,
        'model' => $modelName,
        'series' => $seriesKey,
        'commitSha' => (string) ($result['commit']['sha'] ?? ''),
        'commitUrl' => (string) ($result['commit']['html_url'] ?? ''),
    ];
}

function edit_series_exists(array $config, string $seriesKey): bool
{
    $root = dirname(__DIR__, 2);
    foreach ($config['data_files'] as $relativePath) {
        $path = $root . '/' . $relativePath;
        $source = is_file($path) ? file_get_contents($path) : false;
        if (!is_string($source)) {
            continue;
        }
        foreach (edit_parse_models($source) as $model) {
            if (is_array($model) && hash_equals((string) ($model['series'] ?? ''), $seriesKey)) {
                return true;
            }
        }
    }
    return false;
}

function edit_normalize_series_list(mixed $value, string $field, int $maximumItems, int $maximumLength): array
{
    $isList = is_array($value) && ($value === [] || array_keys($value) === range(0, count($value) - 1));
    if (!$isList || count($value) > $maximumItems) {
        throw new EditApiException("Invalid value for {$field}.", 422);
    }
    $normalized = [];
    foreach ($value as $item) {
        if (!is_string($item)) {
            throw new EditApiException("Invalid value for {$field}.", 422);
        }
        $item = trim($item);
        if ($item === '') {
            continue;
        }
        if (strlen($item) > $maximumLength || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $item)) {
            throw new EditApiException("Invalid value for {$field}.", 422);
        }
        if (!in_array($item, $normalized, true)) {
            $normalized[] = $item;
        }
    }
    return $normalized;
}

function edit_normalize_series_changes(array $changes): array
{
    $stringFields = ['code', 'manufacturer', 'title'];
    $listFields = [
        'categories' => [24, 120],
        'general' => [80, 1200],
        'motor' => [80, 1200],
        'applications' => [80, 1200],
    ];
    $normalized = [];
    foreach ($changes as $field => $value) {
        if (in_array($field, $stringFields, true)) {
            if (!is_string($value)) {
                throw new EditApiException("Invalid value for {$field}.", 422);
            }
            $value = trim($value);
            if ($value === '' || strlen($value) > 180 || preg_match('/[\x00-\x1F]/', $value)) {
                throw new EditApiException("Invalid value for {$field}.", 422);
            }
            $normalized[$field] = $value;
            continue;
        }
        if (isset($listFields[$field])) {
            [$maximumItems, $maximumLength] = $listFields[$field];
            $normalized[$field] = edit_normalize_series_list($value, $field, $maximumItems, $maximumLength);
            continue;
        }
        throw new EditApiException("Field {$field} cannot be edited.", 422);
    }
    return $normalized;
}

function edit_normalize_series_image(mixed $value): ?array
{
    if ($value === null) {
        return null;
    }
    if (!is_array($value) || !is_string($value['dataUrl'] ?? null)) {
        throw new EditApiException('Series image is invalid.', 422);
    }
    $dataUrl = $value['dataUrl'];
    $separator = strpos($dataUrl, ',');
    if ($separator === false || $separator > 80) {
        throw new EditApiException('Series image is invalid.', 422);
    }
    $header = substr($dataUrl, 0, $separator);
    $encoded = substr($dataUrl, $separator + 1);
    if (!preg_match('/^data:image\/(jpeg|png|webp);base64$/i', $header, $matches)) {
        throw new EditApiException('Only JPEG, PNG or WebP images can be uploaded.', 422);
    }
    $bytes = base64_decode($encoded, true);
    if (!is_string($bytes) || $bytes === '' || strlen($bytes) > 3 * 1024 * 1024) {
        throw new EditApiException('Series image must be smaller than 3 MB.', 422);
    }
    $info = @getimagesizefromstring($bytes);
    $mime = strtolower((string) ($info['mime'] ?? ''));
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $width = (int) ($info[0] ?? 0);
    $height = (int) ($info[1] ?? 0);
    if (!isset($extensions[$mime]) || $width < 1 || $height < 1 || $width > 6000 || $height > 6000 || $width * $height > 36000000) {
        throw new EditApiException('Series image dimensions or format are invalid.', 422);
    }
    return [
        'bytes' => $bytes,
        'extension' => $extensions[$mime],
        'mime' => $mime,
        'width' => $width,
        'height' => $height,
    ];
}

function edit_apply_series_changes(array &$record, array $changes, ?string $imagePath): array
{
    $changed = [];
    foreach (['code', 'manufacturer', 'title', 'categories'] as $field) {
        if (!array_key_exists($field, $changes)) {
            continue;
        }
        if (($record[$field] ?? null) !== $changes[$field]) {
            $record[$field] = $changes[$field];
            $changed[] = $field;
        }
    }
    foreach (['general', 'motor', 'applications'] as $field) {
        if (!array_key_exists($field, $changes)) {
            continue;
        }
        if (!isset($record['description']) || !is_array($record['description'])) {
            $record['description'] = [];
        }
        if (($record['description'][$field] ?? null) !== $changes[$field]) {
            $record['description'][$field] = $changes[$field];
            $changed[] = $field;
        }
    }
    if ($imagePath !== null && ($record['image'] ?? null) !== $imagePath) {
        $record['image'] = $imagePath;
        $changed[] = 'image';
    }
    return $changed;
}

function edit_commit_series(array $config, string $seriesKey, array $changes, ?array $image): array
{
    if (!edit_series_exists($config, $seriesKey)) {
        throw new EditApiException('Series was not found.', 404);
    }

    $relativePath = (string) $config['series_overrides_file'];
    $remote = edit_github_file($config, $relativePath);
    $overrides = edit_parse_series_overrides($remote['content']);
    $record = $overrides[$seriesKey] ?? [];
    if (!is_array($record)) {
        throw new EditApiException('Series override record is invalid.', 500);
    }

    $imagePath = null;
    $imageCommitSha = '';
    if ($image !== null) {
        $slug = strtolower((string) preg_replace('/[^A-Za-z0-9]+/', '-', $seriesKey));
        $slug = trim($slug, '-') ?: 'series';
        $imagePath = 'assets/products/custom/' . $slug . '-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $image['extension'];
        $imageResult = edit_github_write_file(
            $config,
            $imagePath,
            $image['bytes'],
            'Upload catalog image for ' . substr($seriesKey, 0, 80)
        );
        $imageCommitSha = (string) ($imageResult['commit']['sha'] ?? '');
    }

    $changedFields = edit_apply_series_changes($record, $changes, $imagePath);
    if ($changedFields === []) {
        return ['unchanged' => true, 'path' => $relativePath, 'fields' => [], 'series' => $seriesKey];
    }
    $overrides[$seriesKey] = $record;
    $label = trim((string) ($record['code'] ?? $record['title'] ?? $seriesKey));
    $result = edit_github_write_file(
        $config,
        $relativePath,
        edit_serialize_series_overrides($overrides),
        'Edit series ' . substr($label, 0, 80) . ': ' . implode(', ', $changedFields),
        $remote['sha']
    );
    return [
        'unchanged' => false,
        'path' => $relativePath,
        'fields' => $changedFields,
        'series' => $label,
        'imagePath' => $imagePath,
        'imageCommitSha' => $imageCommitSha,
        'commitSha' => (string) ($result['commit']['sha'] ?? ''),
        'commitUrl' => (string) ($result['commit']['html_url'] ?? ''),
    ];
}
