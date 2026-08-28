<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

custom_product_api_authorize('GET');
edit_json(array_merge(['ok' => true], custom_product_public_state(custom_product_store_read())));
