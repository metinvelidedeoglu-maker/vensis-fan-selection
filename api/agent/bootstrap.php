<?php
declare(strict_types=1);

final class AgentApiException extends RuntimeException
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
    $status = $error instanceof AgentApiException ? $error->httpStatus : 500;
    if ($status >= 500) {
        error_log('Vensis Agent API: ' . $error->getMessage());
    }
    http_response_code($status);
    echo json_encode([
        'ok' => false,
        'error' => $status >= 500 ? 'The integration service could not complete the request.' : $error->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
});

function agent_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function agent_env(string $name): string
{
    $value = getenv($name);
    return is_string($value) ? trim($value) : '';
}

function agent_private_directory(): string
{
    $override = agent_env('VENSIS_AGENT_PRIVATE_DIR');
    if ($override !== '') {
        return rtrim($override, '/\\');
    }
    $candidates = [(string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), __DIR__];
    foreach ($candidates as $candidate) {
        $normalized = str_replace('\\', '/', rtrim($candidate, '/\\'));
        $position = strrpos($normalized, '/public_html');
        $after = $position === false ? '' : substr($normalized, $position + 12, 1);
        if ($position !== false && ($after === '' || $after === '/')) {
            return substr($normalized, 0, $position) . DIRECTORY_SEPARATOR . '.vensis-edit';
        }
    }
    $base = realpath(__DIR__);
    $base = is_string($base) ? $base : __DIR__;
    return dirname($base, 4) . DIRECTORY_SEPARATOR . '.vensis-edit';
}

function agent_config(): array
{
    static $config;
    if (is_array($config)) {
        return $config;
    }
    $defaults = [
        'identities' => [],
        'signing_key' => '',
        'selection_token_ttl_seconds' => 1800,
        'approval_grant_ttl_seconds' => 900,
        'approval_request_ttl_seconds' => 604800,
        'rate_limit_requests' => 60,
        'rate_limit_window_seconds' => 60,
        'maximum_discount_percent' => 0,
        'require_https' => true,
    ];
    $explicit = agent_env('VENSIS_AGENT_CONFIG');
    $path = $explicit !== '' ? $explicit : agent_private_directory() . DIRECTORY_SEPARATOR . 'agent-config.php';
    $local = [];
    if (is_file($path)) {
        $local = require $path;
        if (!is_array($local)) {
            throw new AgentApiException('Agent configuration is invalid.', 500);
        }
    }
    $config = array_replace($defaults, $local);
    $config['selection_token_ttl_seconds'] = max(300, min(3600, (int) $config['selection_token_ttl_seconds']));
    $config['approval_grant_ttl_seconds'] = max(60, min(3600, (int) $config['approval_grant_ttl_seconds']));
    $config['approval_request_ttl_seconds'] = max(3600, min(2592000, (int) $config['approval_request_ttl_seconds']));
    $config['rate_limit_requests'] = max(5, min(600, (int) $config['rate_limit_requests']));
    $config['rate_limit_window_seconds'] = max(10, min(3600, (int) $config['rate_limit_window_seconds']));
    $config['maximum_discount_percent'] = max(0.0, min(100.0, (float) $config['maximum_discount_percent']));
    return $config;
}

function agent_request_scheme(): string
{
    $forwarded = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    if ($forwarded === 'https') {
        return 'https';
    }
    return !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off' ? 'https' : 'http';
}

function agent_require_post(): void
{
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
        header('Allow: POST');
        throw new AgentApiException('Method not allowed.', 405);
    }
}

function agent_request_json(int $maximumBytes = 65536): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($contentType, 'application/json') !== 0) {
        throw new AgentApiException('JSON content type is required.', 415);
    }
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || strlen($raw) > $maximumBytes) {
        throw new AgentApiException('Request body is invalid.', 413);
    }
    try {
        $data = json_decode($raw === '' ? '{}' : $raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new AgentApiException('Request contains invalid JSON.', 400);
    }
    if (!is_array($data)) {
        throw new AgentApiException('JSON object is required.', 400);
    }
    return $data;
}

function agent_configured(array $config): bool
{
    if (strlen((string) ($config['signing_key'] ?? '')) < 32 || !is_array($config['identities'] ?? null)) {
        return false;
    }
    foreach ($config['identities'] as $id => $identity) {
        if (preg_match('/^[a-z][a-z0-9_-]{2,31}$/', (string) $id) !== 1 || !is_array($identity)) {
            return false;
        }
        $hashInfo = password_get_info((string) ($identity['secret_hash'] ?? ''));
        $sha256 = (string) ($identity['secret_sha256'] ?? '');
        $hasPasswordHash = !empty($hashInfo['algo']);
        $hasSha256 = preg_match('/^[a-f0-9]{64}$/', $sha256) === 1;
        if (!empty($identity['active']) && !$hasPasswordHash && !$hasSha256) {
            return false;
        }
    }
    return true;
}

function agent_authorization_header(): string
{
    $header = trim((string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
    if ($header === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $header = trim((string) ($headers['Authorization'] ?? $headers['authorization'] ?? ''));
    }
    return $header;
}

function agent_runtime_file(string $name): string
{
    $directory = agent_private_directory();
    if ($directory === '' || (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory))) {
        throw new AgentApiException('Private integration storage is unavailable.', 500);
    }
    @chmod($directory, 0700);
    return $directory . DIRECTORY_SEPARATOR . $name;
}

function agent_rate_limit(array $config, string $identityId): void
{
    $fingerprint = hash('sha256', $identityId . '|' . (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $path = agent_runtime_file('agent-rate-' . substr($fingerprint, 0, 32) . '.json');
    $handle = @fopen($path, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        throw new AgentApiException('Rate limit protection is unavailable.', 500);
    }
    try {
        $raw = stream_get_contents($handle);
        $state = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
        $now = time();
        $window = (int) $config['rate_limit_window_seconds'];
        $hits = array_values(array_filter(is_array($state['hits'] ?? null) ? $state['hits'] : [], static fn($hit): bool => (int) $hit > $now - $window));
        if (count($hits) >= (int) $config['rate_limit_requests']) {
            $retryAfter = max(1, $window - ($now - (int) min($hits)));
            header('Retry-After: ' . $retryAfter);
            throw new AgentApiException('Too many requests. Try again later.', 429);
        }
        $hits[] = $now;
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode(['hits' => $hits], JSON_UNESCAPED_SLASHES));
        fflush($handle);
        @chmod($path, 0600);
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function agent_authorize_any(array $requiredScopes): array
{
    agent_require_post();
    $config = agent_config();
    if (!agent_configured($config)) {
        throw new AgentApiException('Agent integration has not been configured on the server.', 503);
    }
    if (!empty($config['require_https']) && agent_request_scheme() !== 'https') {
        throw new AgentApiException('HTTPS is required.', 403);
    }
    $header = agent_authorization_header();
    if (preg_match('/^Bearer\s+([a-z][a-z0-9_-]{2,31})\.([A-Za-z0-9_-]{24,256})$/', $header, $matches) !== 1) {
        header('WWW-Authenticate: Bearer realm="Vensis Selection API"');
        throw new AgentApiException('Unauthorized.', 401);
    }
    $identityId = $matches[1];
    $identity = $config['identities'][$identityId] ?? null;
    $secret = $matches[2];
    $passwordHash = is_array($identity) ? (string) ($identity['secret_hash'] ?? '') : '';
    $sha256 = is_array($identity) ? (string) ($identity['secret_sha256'] ?? '') : '';
    $passwordValid = $passwordHash !== '' && password_verify($secret, $passwordHash);
    $sha256Valid = preg_match('/^[a-f0-9]{64}$/', $sha256) === 1 && hash_equals($sha256, hash('sha256', $secret));
    if (!is_array($identity) || empty($identity['active']) || (!$passwordValid && !$sha256Valid)) {
        throw new AgentApiException('Unauthorized.', 401);
    }
    $scopes = is_array($identity['scopes'] ?? null) ? $identity['scopes'] : [];
    $matchedScopes = array_values(array_intersect($requiredScopes, $scopes));
    if (!$matchedScopes) {
        throw new AgentApiException('This API identity does not have the required scope.', 403);
    }
    agent_rate_limit($config, $identityId);
    return ['id' => $identityId, 'identity' => $identity, 'config' => $config, 'matchedScopes' => $matchedScopes];
}

function agent_authorize(string $requiredScope): array
{
    return agent_authorize_any([$requiredScope]);
}

function agent_audit(string $identityId, string $action, array $request, array $details = []): void
{
    $path = agent_runtime_file('agent-audit.jsonl');
    $record = [
        'at' => gmdate('c'),
        'identity' => $identityId,
        'action' => $action,
        'requestHash' => hash('sha256', json_encode($request, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)),
        'clientHash' => substr(hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown')), 0, 16),
        'details' => $details,
    ];
    if (@file_put_contents($path, json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX) === false) {
        throw new AgentApiException('Audit logging is unavailable.', 500);
    }
    @chmod($path, 0600);
}

