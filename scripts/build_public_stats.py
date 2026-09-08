#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build ONLY aggregate, public-safe statistics from a private Agent-CWE JSON.

The script intentionally does NOT write:
- sample_id
- repository
- commit hashes
- file paths
- function names
- source code
- messages

By default it writes only aggregate language counts. CWE aggregation is opt-in.
Keep the private input file OUTSIDE the Git repository.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import PurePosixPath
from typing import Any

EXT_TO_LANG = {
    ".py": "Python",
    ".go": "Go",
    ".java": "Java",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".hpp": "C++",
    ".hh": "C++",
    ".hxx": "C++",
    ".c": "C",
    ".h": "C/C++ Header",
    ".vue": "Vue",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".swift": "Swift",
    ".scala": "Scala",
    ".sh": "Shell",
    ".bash": "Shell",
}


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def language_for_path(path: str) -> str:
    ext = PurePosixPath(str(path or "")).suffix.lower()
    if not ext:
        return "Unknown"
    return EXT_TO_LANG.get(ext, f"Other({ext})")


def extract_functions(row: dict[str, Any]) -> list[dict[str, Any]]:
    value = row.get("before_functions") or []
    return [x for x in value if isinstance(x, dict)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input_json", help="PRIVATE benchmark JSON; keep it outside the public repository")
    ap.add_argument("--output", default="data/stats.json")
    ap.add_argument("--version", default="Public aggregate statistics")
    ap.add_argument("--curator-model-count", type=int, default=None)
    ap.add_argument("--include-cwe", action="store_true", help="Opt-in aggregate CWE counts")
    args = ap.parse_args()

    data = load_json(args.input_json)
    if not isinstance(data, list):
        raise SystemExit("[FATAL] expected top-level JSON array")

    sample_language = Counter()
    function_language = Counter()
    mixed_samples = 0
    empty_samples = 0
    cwe_counts = Counter()

    for row in data:
        funcs = extract_functions(row)
        langs = []
        for fn in funcs:
            lang = language_for_path(fn.get("file_path", ""))
            langs.append(lang)
            function_language[lang] += 1

        unique_langs = sorted(set(langs))
        if len(unique_langs) == 1:
            sample_language[unique_langs[0]] += 1
        elif len(unique_langs) > 1:
            sample_language["Mixed"] += 1
            mixed_samples += 1
        else:
            sample_language["Unknown"] += 1
            empty_samples += 1

        if args.include_cwe:
            raw = row.get("manual_cwe_ids")
            if isinstance(raw, str):
                values = [x.strip() for x in raw.replace(";", ",").split(",") if x.strip()]
            elif isinstance(raw, list):
                values = [str(x).strip() for x in raw if str(x).strip()]
            else:
                values = []
            for cwe in values:
                cwe_counts[cwe] += 1

    languages = sorted(
        set(sample_language) | set(function_language),
        key=lambda x: (-sample_language.get(x, 0), x),
    )

    out = {
        "version": args.version,
        "status_text": "Aggregate benchmark statistics are available.",
        "sample_count": len(data),
        "gold_function_count": sum(function_language.values()),
        "language_count": len([x for x in languages if x not in {"Unknown", "Mixed"}]),
        "curator_model_count": args.curator_model_count,
        "language_distribution": [
            {
                "language": lang,
                "samples": sample_language.get(lang, 0),
                "functions": function_language.get(lang, 0),
            }
            for lang in languages
        ],
        "consensus": [],
        "quality_checks": {
            "mixed_language_samples": mixed_samples,
            "empty_or_unknown_samples": empty_samples,
        },
    }
    if args.include_cwe:
        out["cwe_distribution"] = [
            {"cwe": k, "samples": v} for k, v in cwe_counts.most_common()
        ]

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"[OK] wrote aggregate-only stats: {args.output}")
    print(f"[OK] samples={len(data)} functions={sum(function_language.values())}")
    print("[SAFE] no sample_id/repository/commit/file_path/function/code/message written")


if __name__ == "__main__":
    main()
