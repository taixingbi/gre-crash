#!/usr/bin/env python3
"""Re-read multi-blank choices from their Blank (i) / (ii) / (iii) columns.

The first import let neighbouring columns overlap and lettered straight through
them, so some questions came out with duplicated choices, a lost column, or a
skipped letter that left the answer key pointing at the wrong word. This
rebuilds only those choice lists with the fixed blank_columns, and only when the
rebuild keeps every choice already in the bank; prompts are left alone. Pass --write to save; without it, it only prints.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from structure_questions import blank_columns, clean_choice, load_lines

ROOT = Path(__file__).resolve().parents[1]
OCR = ROOT / "content" / "ocr"
BANK = ROOT / "content" / "questions.json"


def main() -> None:
    write = "--write" in sys.argv
    bank = json.loads(BANK.read_text())
    changed = 0
    for question in bank["questions"]:
        path = OCR / f"{question['id']}.tsv"
        if "Multi-Blank" not in question["category"] or not path.exists():
            continue
        items = [{"letter": item["letter"], "text": clean_choice(item["text"])} for item in blank_columns(load_lines(path))]
        old = question.get("choiceItems") or []
        # Some banks already hold rows the OCR missed; only take a rebuild that keeps every word we had.
        if not items or items == old or not {item["text"] for item in old} <= {item["text"] for item in items}:
            continue
        changed += 1
        print(f"{question['id']} (answer {question['answer']})")
        print("   was: " + " | ".join(f"{item['letter']}. {item['text']}" for item in question.get("choiceItems") or []))
        print("   now: " + " | ".join(f"{item['letter']}. {item['text']}" for item in items))
        question["choiceItems"] = items
        question["choices"] = [item["letter"] for item in items]
    print(f"repaired {changed}")
    if write:
        BANK.write_text(json.dumps(bank, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
