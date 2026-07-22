<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

edit_require_method('POST');
edit_require_same_origin();
$config = edit_config();
edit_require_configured($config);

$retryAfter = edit_login_retry_after($config);
if ($retryAfter > 0) {
    header('Retry-After: ' . $retryAfter);
    throw new EditApiException('Too many password attempts. Try again later.', 429);
}

$data = edit_request_json();
$password = $data['password'] ?? null;
if (!is_string($password) || $password === '' || strlen($password) > 1024) {
    throw new EditApiException('Password is required.', 422);
}

if (!password_verify($password, (string) $config['password_hash'])) {
    $retryAfter = edit_record_login_failure($config);
    edit_audit($config, 'login_failed');
    if ($retryAfter > 0) {
        header('Retry-After: ' . $retryAfter);
        throw new EditApiException('Too many password attempts. Try again later.', 429);
    }
    throw new EditApiException('Password is incorrect.', 401);
}

edit_clear_login_failures($config);
edit_begin_session($config);
session_regenerate_id(true);
$_SESSION['edit_authenticated'] = true;
$_SESSION['edit_created_at'] = time();
$_SESSION['edit_last_activity'] = time();
$_SESSION['edit_csrf'] = bin2hex(random_bytes(32));
edit_audit($config, 'login_success');

edit_json([
    'ok' => true,
    'authenticated' => true,
    'csrf' => $_SESSION['edit_csrf'],
    'expiresIn' => $config['session_ttl'],
]);

