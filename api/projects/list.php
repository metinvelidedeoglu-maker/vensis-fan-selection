<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

project_api_authorize('GET');
$state = project_store_read();

edit_json(array_merge(['ok' => true], project_public_state($state)));

