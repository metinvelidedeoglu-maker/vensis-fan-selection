<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

edit_require_method('GET');
$config = edit_config();
$configured = edit_is_configured($config);
$authenticated = $configured && edit_session_authenticated($config);

edit_json([
    'ok' => true,
    'configured' => $configured,
    'authenticated' => $authenticated,
    'csrf' => $authenticated ? edit_csrf_token() : null,
    'expiresIn' => $authenticated ? $config['session_ttl'] : 0,
]);

