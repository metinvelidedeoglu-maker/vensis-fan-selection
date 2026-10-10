<?php
declare(strict_types=1);

return [
    // Store the deployed copy outside public_html as .vensis-edit/agent-config.php.
    // Generate a secret: php -r "echo rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='), PHP_EOL;"
    // Hash it:          php -r "echo password_hash('PASTE_SECRET', PASSWORD_DEFAULT), PHP_EOL;"
    'identities' => [
        'erman' => [
            'active' => true,
            'secret_hash' => 'PASTE_PASSWORD_HASH_HERE',
            'scopes' => ['fan:select', 'quote:draft', 'approval:request'],
            // Keep zero until Metin explicitly approves a commercial discount ceiling.
            'maximum_discount_percent' => 0,
        ],
        // Use a different secret and person-controlled connector for decisions.
        'metin_approver' => [
            'active' => false,
            'secret_hash' => 'PASTE_A_DIFFERENT_PASSWORD_HASH_HERE',
            'scopes' => ['approval:review'],
        ],
    ],
    // Generate independently from the identity secret; at least 32 random characters.
    'signing_key' => 'PASTE_AN_INDEPENDENT_RANDOM_SIGNING_KEY_HERE',
    'selection_token_ttl_seconds' => 1800,
    'approval_grant_ttl_seconds' => 900,
    'approval_request_ttl_seconds' => 604800,
    'rate_limit_requests' => 60,
    'rate_limit_window_seconds' => 60,
    'maximum_discount_percent' => 0,
    'require_https' => true,
];
