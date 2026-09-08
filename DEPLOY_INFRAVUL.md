# InfraVul.github.io deployment

This release is already configured for:

- GitHub username: `InfraVul`
- repository: `InfraVul.github.io`
- website: `https://InfraVul.github.io/`
- public content: aggregate statistics only
- private benchmark samples: not included

## One-time GitHub step

Create a public repository named exactly `InfraVul.github.io` under the `InfraVul` account. For the cleanest first push, leave it empty (do not initialize README/license/.gitignore).

## Fresh-server layout

Place the zip under `/root/yyr/git/`, then extract it so the repository root becomes:

```text
/root/yyr/git/InfraVul.github.io
```

## Prepare server and SSH

From the repository root:

```bash
bash scripts/prepare_server_git.sh
```

Copy the printed public SSH key into GitHub:

```text
GitHub -> Settings -> SSH and GPG keys -> New SSH key
```

Then test:

```bash
ssh -T git@github.com || true
```

A successful GitHub SSH test normally says that authentication succeeded but shell access is not provided.

## Publish

```bash
bash scripts/publish_to_github.sh
```

## Enable GitHub Pages once

Open:

```text
https://github.com/InfraVul/InfraVul.github.io/settings/pages
```

Set **Build and deployment -> Source -> GitHub Actions**.

The included workflow deploys every push to `main` after the privacy guard passes.
