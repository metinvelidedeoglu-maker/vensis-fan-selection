<?php
declare(strict_types=1);

return [
    // When this legacy file is loaded, Edit Mode automatically writes a protected
    // static copy outside public_html so Hostinger deployments cannot delete it.
    // Generate with: php -r "echo password_hash('YOUR_PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
    'password_hash' => 'PASTE_PASSWORD_HASH_HERE',

    // Fine-grained GitHub token: only this repository, Contents = Read and write.
    'github_token' => 'github_pat_REPLACE_ME',
    'github_repository' => 'metinvelidedeoglu-maker/vensis-fan-selection',
    'github_branch' => 'main',

    // Optional. Defaults are shown here for clarity.
    'session_ttl' => 1800,
    'session_absolute_ttl' => 7200,
    'login_max_attempts' => 5,
    'login_window_seconds' => 900,
    'login_block_seconds' => 900,
    // Prefer a directory outside public_html when Hostinger provides one.
    // 'runtime_dir' => '/home/USERNAME/.vensis-edit',
];
