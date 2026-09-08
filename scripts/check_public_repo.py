#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fail-fast check for accidentally committed private benchmark content."""

from __future__ import annotations
import argparse
import re
from pathlib import Path

DEFAULT_BLOCKED_NAMES = {
    "benchmark-full.json",
    "private.json",
    "private-benchmark.json",
}

SUSPICIOUS_PATTERNS = [
    re.compile(r'"before_functions"\s*:'),
    re.compile(r'"after_functions"\s*:'),
    re.compile(r'"vulnerable_commit"\s*:'),
    re.compile(r'"fix_commit"\s*:'),
    re.compile(r'"repository"\s*:'),
    re.compile(r'"file_path"\s*:'),
    re.compile(r'"code"\s*:'),
]

ALLOW_FILES = {
    "scripts/check_public_repo.py",
    "scripts/build_public_stats.py",
}

TEXT_SUFFIXES = {".html", ".css", ".js", ".json", ".md", ".yml", ".yaml", ".txt", ".py"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=".")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    problems = []

    for p in root.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(root).as_posix()
        if ".git/" in rel or rel.startswith(".git/"):
            continue
        if rel in ALLOW_FILES:
            continue
        if p.name.lower() in DEFAULT_BLOCKED_NAMES or "private" in p.name.lower():
            problems.append(f"blocked filename: {rel}")
        if p.suffix.lower() not in TEXT_SUFFIXES or p.stat().st_size > 5_000_000:
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for pattern in SUSPICIOUS_PATTERNS:
            if pattern.search(text):
                problems.append(f"suspicious private-data field in {rel}: {pattern.pattern}")
                break

    if problems:
        print("[FATAL] possible private benchmark content detected:")
        for x in problems:
            print(" -", x)
        raise SystemExit(2)

    print("[OK] no obvious private benchmark payload detected")


if __name__ == "__main__":
    main()
