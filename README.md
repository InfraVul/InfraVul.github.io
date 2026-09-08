# InfraVul.github.io — Agent-CWE Benchmark

Public GitHub Pages website for the Agent-CWE benchmark.

Website URL after deployment:

```text
https://InfraVul.github.io/
```

GitHub repository:

```text
https://github.com/InfraVul/InfraVul.github.io
```

## Public-release policy

This repository contains **aggregate statistics only**. It intentionally does **not** contain the private benchmark JSON or sample-level sensitive material.

Public content currently includes:

- 316 benchmark samples (aggregate count only)
- 466 gold functions (aggregate count only)
- 7-language aggregate distribution
- aggregate pairwise / three-model consensus counts
- leaderboard model placeholders with empty scores
- high-level construction methodology

Not included:

- private benchmark JSON
- internal sample IDs
- repository names
- commit hashes
- file paths
- function names
- before/after source code
- raw curation/audit traces
- internal logs

## Local preview

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8080/` locally, or use SSH port forwarding from your workstation.

## Safety check

Run before every commit/push:

```bash
python3 scripts/check_public_repo.py .
```

Expected:

```text
[OK] no obvious private benchmark payload detected
```

The same check also runs automatically in GitHub Actions before deployment.

## Deployment

See [`DEPLOY_INFRAVUL.md`](DEPLOY_INFRAVUL.md) for the exact first-deployment commands for the `InfraVul` GitHub account.

## Updating leaderboard later

Only edit `data/leaderboard.json`. Null metrics render as `—`.

## Updating aggregate statistics later

Only edit `data/stats.json`, or generate aggregate-only statistics locally using `scripts/build_public_stats.py` while keeping the private source JSON outside this repository.
