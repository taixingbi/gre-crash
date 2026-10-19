#!/usr/bin/env python3
"""Recover answer choices printed as an unlettered boxed column.

Some verbal pages list their choices in a table with no A-I letters, and draw
the blank as a line that OCR cannot read. structure_questions.py finds neither,
so those questions end up with no choices and the choice words glued onto the
prompt. This rebuilds only those questions from their OCR, leaving the rest of
the bank untouched. Pass --write to save; without it, it only prints.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OCR = ROOT / "content" / "ocr"
BANK = ROOT / "content" / "questions.json"

BLANK = "________"
SINGLE = "Select one entry for the blank. Fill the blank in the way that best completes the text."
MULTI = "For each blank select one entry from the corresponding column of choices. Fill all blanks in the way that best completes the text."
EQUIVALENCE = (
    "Select the two answer choices that, when used to complete the sentence, fit the meaning of the sentence as a whole "
    "and produce completed sentences that are alike in meaning."
)
DIRECTION = re.compile(r"^(for each blank|select one entry|select the two|consider each|that best completes|best completes|way that best)", re.I)
NUMBER = re.compile(r"^\d{1,2}\.\s*")
WORDS = re.compile(r"[A-Za-z][A-Za-z' -]*")

# Blanks drawn at a line break or the end of a line leave no trace in the OCR, and
# a few words come back misread. Each fix was checked against content/pages/<id>.png.
FIXES = {
    "verbal-009": [("theof an", f"the {BLANK} of an")],
    "verbal-010": [("scientists? approach", f"scientists' {BLANK} approach"), ("other species", "other species.")],
    "verbal-012": [("forgiving", "for giving")],
    "verbal-017": [(f"her her {BLANK} tenacious", f"her {BLANK} her tenacious")],
    "verbal-018": [(f"{BLANK} or society", f"{BLANK} of society")],
    "verbal-019": [(f"typically. {BLANK}", f"typically {BLANK}")],
    "verbal-020": [("peoplemight", "people might"), ("relatively and physics", f"relatively {BLANK} and physics")],
    "verbal-021": [("as Dreyer", f"as {BLANK}, Dreyer")],
    "verbal-030": [("a str ategic", "a strategic"), ("deliberately", f"deliberately {BLANK}.")],
}


def tokens(path: Path) -> list[dict]:
    found = []
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        parts = raw.split("\t")
        if len(parts) < 6:
            continue
        text = "\t".join(parts[5:]).strip()
        x, y, w = float(parts[1]), float(parts[2]), float(parts[3])
        if not text or text.lower() == "ans" or y > 0.84 and re.match(r"^\d{3}", text):
            continue
        found.append({"text": text, "x": x, "y": y, "w": w})
    return found


def is_direction(token: dict) -> bool:
    return bool(DIRECTION.match(NUMBER.sub("", token["text"])))


def is_choice(token: dict) -> bool:
    center = token["x"] + token["w"] / 2
    return 0.25 < center < 0.75 and token["w"] < 0.25 and bool(WORDS.fullmatch(token["text"])) and len(token["text"].split()) <= 4


def choice_columns(found: list[dict]) -> list[list[dict]]:
    # The choice box is the topmost run of short, centred rows; anything below it
    # (directions, the next question's passage) is not part of this question.
    candidates = sorted((token for token in found if is_choice(token)), key=lambda token: -token["y"])
    if not candidates:
        return []
    run = [candidates[0]]
    for token in candidates[1:]:
        if run[-1]["y"] - token["y"] > 0.1:
            break
        run.append(token)
    groups: list[list[dict]] = []
    for token in sorted(run, key=lambda token: token["x"] + token["w"] / 2):
        center = token["x"] + token["w"] / 2
        if groups and abs(center - (groups[-1][-1]["x"] + groups[-1][-1]["w"] / 2)) < 0.08:
            groups[-1].append(token)
        else:
            groups.append([token])
    return [sorted(group, key=lambda token: -token["y"]) for group in groups]


def passage_text(body: list[dict]) -> str:
    rows: list[list[dict]] = []
    for token in sorted(body, key=lambda token: (-token["y"], token["x"])):
        if rows and abs(rows[-1][0]["y"] - token["y"]) <= 0.012:
            rows[-1].append(token)
        else:
            rows.append([token])
    has_blank = any("_" in token["text"] for token in body)
    pieces = []
    for row in rows:
        row.sort(key=lambda token: token["x"])
        for index, token in enumerate(row):
            if index and not has_blank and token["x"] - (row[index - 1]["x"] + row[index - 1]["w"]) > 0.02:
                pieces.append(BLANK)
            pieces.append(token["text"])
    text = NUMBER.sub("", " ".join(pieces).strip())
    text = re.sub(r"_+(?:\s*[—-]?\s*_+)*", f" {BLANK} ", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([.,;:])", r"\1", text)
    return text.strip()


def direction_for(question: dict) -> str:
    if "Sentence Equivalence" in question["category"]:
        return EQUIVALENCE
    if "Multi-Blank" in question["category"]:
        return MULTI
    return SINGLE


def repair(question: dict) -> dict | None:
    path = OCR / f"{question['id']}.tsv"
    if not path.exists():
        return None
    found = tokens(path)
    groups = choice_columns(found)
    if not groups or any(len(group) < 2 for group in groups) or sum(len(group) for group in groups) < 5:
        return None
    top = max(token["y"] for group in groups for token in group)
    body = [token for token in found if token["y"] > top + 0.02 and not is_direction(token)]
    passage = passage_text(body)
    for old, new in FIXES.get(question["id"], []):
        if old not in passage:
            raise SystemExit(f"{question['id']}: expected {old!r} in {passage!r}")
        passage = passage.replace(old, new)
    if BLANK not in passage:
        return None
    items = [{"letter": "ABCDEFGHI"[index], "text": token["text"]} for index, token in enumerate(t for group in groups for t in group)]
    prompt = f"{direction_for(question)} {passage}"
    return {"prompt": prompt, "stem": prompt, "choiceItems": items, "choices": [item["letter"] for item in items]}


def main() -> None:
    write = "--write" in sys.argv
    bank = json.loads(BANK.read_text())
    fixed, skipped = [], []
    for question in bank["questions"]:
        if question["section"] != "verbal" or question.get("choiceItems"):
            continue
        patch = repair(question)
        if not patch:
            skipped.append(question["id"])
            continue
        fixed.append(question["id"])
        print(f"{question['id']} ({question['answer']}): {patch['prompt']}")
        print("   " + " | ".join(f"{item['letter']}. {item['text']}" for item in patch["choiceItems"]))
        question.update(patch)
    print(f"fixed {len(fixed)}, could not recover {len(skipped)}: {' '.join(skipped)}")
    if write:
        BANK.write_text(json.dumps(bank, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
