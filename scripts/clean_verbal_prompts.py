#!/usr/bin/env python3
"""Tidy verbal questions whose text came out of OCR mangled.

The OCR join left some text-completion prompts starting with the tail of the
directions ("that best completes the text."), ending with the column headers
and choice words ("Blank(i) Blank(ii) decidedly worse than abysmal ..."), and
with "(i)" / "(ii)" markers that lost the drawn blank after them. It also read
the page footer ("$385 ##436 #") into some choices. This repairs only those.
Choices that are nothing but footer are dropped without relettering the rest,
so answer keys keep pointing at the same choices. Pass --write to save;
without it, it only prints.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "content" / "questions.json"

BLANK = "________"
SINGLE = "Select one entry for the blank. Fill the blank in the way that best completes the text."
MULTI = "For each blank select one entry from the corresponding column of choices. Fill all blanks in the way that best completes the text."
EQUIVALENCE = (
    "Select the two answer choices that, when used to complete the sentence, fit the meaning of the sentence as a whole "
    "and produce completed sentences that are alike in meaning."
)
DIRECTIONS = [re.escape(text) + r"\.?" for text in (SINGLE[:-1], MULTI[:-1], EQUIVALENCE[:-1])] + [
    r"For each blank select one entry from the corresponding column of choices\. Fill all blanks in the way that best(?: completes the text\.?)?",
    r"(?:the sentence as a )?whole and produce completed sentences that are alike in meaning\.?",
    r"(?:that |the way that )?best completes the text\.?",
    r"Fill all blanks in the way that best completes the text\.?",
    r"Fill the blank in the way that best completes the text\.?",
    r"alike in meaning\.?",
]
LEADING = re.compile(r"^(?:\s*(?:" + "|".join(DIRECTIONS) + r"))+\s*", re.I)
HEADERS = re.compile(r"\s*Blank\s*\((?:i{1,3}|[123])\).*$", re.I | re.S)
MARKER = re.compile(r"\((i{1,3})\)(?!\s*_)")
FOOTER = re.compile(r"\s+[^A-Za-z\s]*\s*\$*\s*\d{2,3}\s*\S{0,3}\s*#.*$")
ALL_FOOTER = re.compile(r"[^A-Za-z]*\d.*#.*")


def clean_choices(items: list[dict]) -> list[dict]:
    kept = []
    for item in items:
        text = item["text"]
        if ALL_FOOTER.fullmatch(text) and not re.search(r"[A-Za-z]{3,}", text):
            continue
        kept.append({**item, "text": FOOTER.sub("", text).strip()})
    return kept


def strip_choices(prompt: str, items: list[dict]) -> str:
    texts = sorted({item["text"].strip() for item in items if item["text"].strip()}, key=len, reverse=True)
    if not texts:
        return prompt
    first = items[0]["text"].strip()
    at = prompt.rfind(first)
    while at > 0:
        tail = prompt[at:]
        for text in texts:
            tail = tail.replace(text, " ")
        if not tail.strip(" .,;"):
            return prompt[:at].rstrip()
        at = prompt.rfind(first, 0, at)
    return prompt


def direction_for(question: dict) -> str:
    if "Sentence Equivalence" in question["category"]:
        return EQUIVALENCE
    if "Multi-Blank" in question["category"]:
        return MULTI
    return SINGLE


def clean(question: dict) -> str:
    prompt = re.sub(r"\s+", " ", question["prompt"]).strip()
    lead = LEADING.match(prompt)
    fragment = bool(lead) and not any(prompt.startswith(text) for text in (SINGLE, MULTI, EQUIVALENCE)) or bool(
        re.match(r"^For each blank.*the way that best(?! completes)", prompt)
    )
    body = LEADING.sub("", prompt)
    trimmed = strip_choices(HEADERS.sub("", body), question.get("choiceItems") or [])
    marked = MARKER.sub(lambda match: f"({match.group(1)}) {BLANK}", trimmed)
    if not fragment and trimmed == body and marked == trimmed:
        return question["prompt"]
    marked = re.sub(r"\s+([.,;:])", r"\1", marked).strip()
    return f"{direction_for(question)} {marked}"


def main() -> None:
    write = "--write" in sys.argv
    bank = json.loads(BANK.read_text())
    changed = []
    for question in bank["questions"]:
        if question["section"] != "verbal" or not question.get("choiceItems"):
            continue
        items = clean_choices(question["choiceItems"])
        if items != question["choiceItems"]:
            changed.append(question["id"])
            print(f"{question['id']} choices: " + " | ".join(f"{item['letter']}. {item['text']}" for item in items))
            question["choiceItems"] = items
            question["choices"] = [item["letter"] for item in items]
        if not re.search(r"Text Completion|Sentence Equivalence", question["category"]):
            continue
        prompt = clean(question)
        if prompt == question["prompt"]:
            continue
        changed.append(question["id"])
        flag = "" if BLANK in prompt else "   <-- still no blank"
        print(f"{question['id']}: {prompt}{flag}")
        question["prompt"] = prompt
        question["stem"] = prompt
    print(f"cleaned {len(changed)}")
    if write:
        BANK.write_text(json.dumps(bank, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
