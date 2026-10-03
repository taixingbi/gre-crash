#!/usr/bin/env python3
"""Turn the three local GRE PDFs into content/questions.json, writing.json, and page images."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "sources"
OUT = ROOT / "content"
PAGES = OUT / "pages"

QUANT_RULES = [
    ("Arithmetic", "Arithmetic / Percent / Ratio / Rate"),
    ("Algebra", "Algebra / Equations / Functions"),
    ("Number Properties", "Number Properties / Remainder / Digits"),
    ("Geometry", "Geometry / Coordinate Geometry"),
    ("Statistics", "Statistics / Data Interpretation"),
    ("Probability", "Probability / Counting"),
]
VERBAL_RULES = [
    ("Single-Blank", "Text Completion - Single-Blank"),
    ("Multi-Blank", "Text Completion - Multi-Blank"),
    ("Sentence Equivalence", "Sentence Equivalence"),
    ("Short Reading", "Short Reading"),
    ("Long Reading", "Long Reading / Argument"),
]


def decode_pdf_text(value: object) -> str:
    return str(value or "").strip()


def answer_from_annot(annot: object) -> str | None:
    obj = annot.get_object()
    tu = decode_pdf_text(obj.get("/TU"))
    if tu.lower().startswith("correct answer:"):
        return tu.split(":", 1)[1].strip()
    ap = obj.get("/AP")
    if ap is None:
        return None
    normal = ap.get_object().get("/N")
    if normal is None:
        return None
    yes = normal.get_object().get("/Yes")
    if yes is None:
        return None
    data = yes.get_object().get_data()
    match = re.search(rb"\(Ans:\s*([^)]+)\)", data)
    if not match:
        return None
    return match.group(1).decode("latin1").strip()


def page_answer(page: object) -> str:
    annots = page.get("/Annots") or []
    found: list[str] = []
    for annot in annots:
        try:
            value = answer_from_annot(annot)
        except Exception:
            continue
        if value and not value.lower().startswith("click"):
            found.append(value)
    return found[-1] if found else ""


def classify(answer: str) -> tuple[str, list[str], str]:
    cleaned = re.sub(r"\s+", "", answer).upper()
    if not cleaned:
        return "single", list("ABCDE"), "missing_answer"
    if re.fullmatch(r"-?\d+(\.\d+)?", cleaned) or re.fullmatch(r"-?\d+/\d+", answer.strip()):
        return "numeric", [], "ok"
    if len(answer.strip()) > 12:
        return "single", list("ABCDE"), "review"
    if re.fullmatch(r"[A-I]", cleaned):
        return "single", list("ABCDE"), "ok"
    if re.fullmatch(r"[A-F]{2}", cleaned):
        return "multi", list("ABCDEF"), "ok"
    if re.fullmatch(r"[A-I]{2,}", cleaned):
        return "multi", list("ABCDEFGHI"), "ok"
    return "single", list("ABCDE"), "unparsed_answer"


def category_for(text: str, rules: list[tuple[str, str]], previous: str) -> str:
    for needle, label in rules:
        if needle.lower() in text.lower():
            return label
    return previous


def import_bank(pdf_name: str, section: str, rules: list[tuple[str, str]]) -> list[dict]:
    pdf_path = SOURCES / pdf_name
    reader = PdfReader(str(pdf_path))
    prefix = PAGES / section
    subprocess.check_call(
        ["pdftoppm", "-png", "-r", "120", "-f", "2", str(pdf_path), str(prefix)],
    )
    # pdftoppm uses the PDF page number. Page 2 is question 1.
    for number in range(1, len(reader.pages)):
        page_file = PAGES / f"{section}-{number + 1:03d}.png"
        question_file = PAGES / f"{section}-{number:03d}.png"
        if page_file.exists():
            page_file.replace(question_file)
    questions: list[dict] = []
    category = rules[0][1]
    number = 0
    for index, page in enumerate(reader.pages):
        if index == 0:
            continue
        number += 1
        text = page.extract_text() or ""
        stem = subprocess.check_output(
            ["pdftotext", "-layout", "-f", str(index + 1), "-l", str(index + 1), "-nopgbrk", str(pdf_path), "-"],
            text=True,
        ).strip()[:4000]
        category = category_for(text, rules, category)
        answer = page_answer(page)
        question_type, choices, status = classify(answer)
        qid = f"{section}-{number:03d}"
        target = PAGES / f"{qid}.png"
        if not target.exists():
            status = "missing_image" if status == "ok" else status
        questions.append(
            {
                "id": qid,
                "section": section,
                "category": category,
                "number": number,
                "questionType": question_type,
                "choices": choices,
                "answer": re.sub(r"\s+", "", answer).upper() if question_type != "numeric" else answer.strip(),
                "hasImage": target.exists(),
                "stem": stem,
                "parseStatus": status,
            }
        )
    return questions


def import_writing() -> dict:
    pdf_path = SOURCES / "GRE_Writing_10Day_with_Templates.pdf"
    text = subprocess.check_output(["pdftotext", "-layout", str(pdf_path), "-"], text=True)
    template = text
    start = text.find("GRE Issue Essay - Core Template")
    end = text.find("GRE Writing - 10 Day")
    if start != -1 and end != -1:
        template = text[start:end].strip()
    prompts = []
    for match in re.finditer(
        r"Day\s+(\d+)\s*\|\s*([^\n]+)\n+Issue prompt\n+(.*?)\n+Task\n+(.*?)(?=\n\s*Click to reveal|\n\s*Day\s+\d+\s*\||\Z)",
        text,
        re.S,
    ):
        def squash(value: str) -> str:
            lines = [re.sub(r"\s+", " ", line).strip() for line in value.splitlines()]
            return " ".join(line for line in lines if line)

        prompts.append(
            {
                "day": int(match.group(1)),
                "theme": squash(match.group(2)),
                "prompt": squash(match.group(3)),
                "task": squash(match.group(4)),
            }
        )
    return {"template": template, "prompts": prompts}


def main() -> None:
    PAGES.mkdir(parents=True, exist_ok=True)
    quant = import_bank(
        "GRE_Math_150_Tight_Reclassified_ClickAnswers.pdf",
        "quant",
        QUANT_RULES,
    )
    verbal = import_bank(
        "GRE_Verbal_150_Tight_Reclassified_ClickAnswers.pdf",
        "verbal",
        VERBAL_RULES,
    )
    writing = import_writing()
    bank = {"questions": quant + verbal}
    (OUT / "questions.json").write_text(json.dumps(bank, indent=2), encoding="utf-8")
    (OUT / "writing.json").write_text(json.dumps(writing, indent=2), encoding="utf-8")
    missing = [q["id"] for q in bank["questions"] if q["parseStatus"] != "ok"]
    print(f"quant {len(quant)} verbal {len(verbal)} writing prompts {len(writing['prompts'])}")
    print(f"needs review {len(missing)}: {', '.join(missing[:20])}")


if __name__ == "__main__":
    main()
