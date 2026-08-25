<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

customer_api_authorize('GET');
edit_json(array_merge(['ok' => true], customer_public_state(customer_store_read())));
