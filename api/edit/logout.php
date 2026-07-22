<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

edit_require_method('POST');
edit_require_same_origin();
$config = edit_config();
edit_require_session($config);
edit_require_csrf();
edit_audit($config, 'logout');
edit_destroy_session($config);
edit_json(['ok' => true]);

