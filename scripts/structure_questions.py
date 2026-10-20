#!/usr/bin/env python3
"""Turn Apple Vision OCR into a prompt, choices, and an optional table."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OCR = ROOT / "content" / "ocr"
BANK = ROOT / "content" / "questions.json"

SKIP_LINE = re.compile(
    r"^(ans|click to|arithmetic /|algebra /|number properties|geometry /|statistics /|probability /|"
    r"text completion|sentence equivalence|short reading|long reading|part \d|verbal reasoning).*$",
    re.I,
)
CHOICE = re.compile(r"^([A-I])[\.\)]\s*(.*)$")
PAGE_NO = re.compile(r"^第?\s*\d+\s*页")
QUESTION_NO = re.compile(r"^\d{1,3}\.?$")


def load_lines(path: Path) -> list[dict]:
    tokens = []
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        parts = raw.split("\t")
        if len(parts) < 6:
            continue
        conf, x, y, w, h, text = parts[0], parts[1], parts[2], parts[3], parts[4], "\t".join(parts[5:])
        text = text.strip()
        if not text or text.lower() == "ans":
            continue
        tokens.append(
            {
                "text": text,
                "x": float(x),
                "y": float(y),
                "w": float(w),
                "h": float(h),
                "conf": float(conf),
            }
        )
    tokens.sort(key=lambda token: (-token["y"], token["x"]))
    rows: list[dict] = []
    for token in tokens:
        if rows and abs(rows[-1]["y"] - token["y"]) <= 0.012:
            rows[-1]["tokens"].append(token)
        else:
            rows.append({"y": token["y"], "tokens": [token]})
    built = []
    for row in rows:
        ordered = sorted(row["tokens"], key=lambda token: token["x"])
        groups: list[list[dict]] = [[ordered[0]]]
        for token in ordered[1:]:
            previous = groups[-1][-1]
            if token["x"] - (previous["x"] + previous["w"]) > 0.08:
                groups.append([token])
            else:
                groups[-1].append(token)
        for group in groups:
            text = " ".join(token["text"] for token in group)
            text = re.sub(r"\s+", " ", text).strip().replace("_", "________")
            if not text or SKIP_LINE.match(text) or PAGE_NO.match(text):
                continue
            if QUESTION_NO.match(text) and row["y"] > 0.84:
                continue
            if re.fullmatch(r"\d{3}", text) and row["y"] > 0.84:
                continue
            width = group[-1]["x"] + group[-1]["w"] - group[0]["x"]
            built.append({"text": text, "y": row["y"], "x": group[0]["x"], "w": width, "tokens": group})
    return built


def choice_runs(lines: list[dict]) -> list[list[dict]]:
    runs: list[list[dict]] = []
    current: list[dict] = []
    for line in lines:
        match = CHOICE.match(line["text"])
        text = match.group(2).strip() if match else ""
        if match and text and (not current or match.group(1) > current[-1]["letter"]):
            if match.group(1) == "A" and current:
                runs.append(current)
                current = []
            current.append({"letter": match.group(1), "text": text, "y": line["y"], "x": line["x"]})
            continue
        if current and not match and line["x"] >= current[-1]["x"] - 0.02 and len(line["text"]) < 90 and not is_prose(line["text"]):
            if not re.match(r"^(blank\s*\(|select |for each )", line["text"], re.I):
                current[-1]["text"] = f"{current[-1]['text']} {line['text']}".strip()
            continue
        if current and match and match.group(1) == "A":
            runs.append(current)
            current = [{"letter": "A", "text": text, "y": line["y"], "x": line["x"]}] if text else []
    if current:
        runs.append(current)
    return [run for run in runs if len(run) >= 2]


def blank_columns(lines: list[dict]) -> list[dict]:
    headers = [line for line in lines if re.search(r"blank\s*\((i{1,3}|1|2|3)\)", line["text"], re.I)]
    if len(headers) < 2:
        return []
    headers.sort(key=lambda line: line["x"])
    bottom = min(line["y"] for line in headers) - 0.015
    options = [
        line
        for line in lines
        if line["y"] < bottom and not CHOICE.match(line["text"]) and not re.search(r"blank\s*\(", line["text"], re.I)
    ]
    # Each option belongs to the header it sits under. Columns are always lettered A-C, D-F, G-I, so a row lost
    # to a cropped page leaves a gap instead of shifting the next column's letters.
    centers = [header["x"] + header["w"] / 2 for header in headers]
    columns: list[list[dict]] = [[] for _ in headers]
    for line in options:
        if "#" in line["text"] or "$" in line["text"] or not re.search(r"[A-Za-z]{2,}", line["text"]):
            continue
        center = line["x"] + line["w"] / 2
        columns[min(range(len(centers)), key=lambda index: abs(centers[index] - center))].append(line)
    letters = "ABCDEFGHI"
    choices = []
    for index, column in enumerate(columns):
        column.sort(key=lambda line: -line["y"])
        for row, line in enumerate(column[:3]):
            choices.append({"letter": letters[index * 3 + row], "text": line["text"], "y": line["y"], "x": line["x"]})
    return choices if len(choices) >= 4 else []


def is_prose(text: str) -> bool:
    return len(text) > 55 and not CHOICE.match(text)


CELL = re.compile(r"^(?:\$)?\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^[A-G]$")


def question_ceiling(lines: list[dict]) -> float | None:
    marked = [line for line in lines if "?" in line["text"] and not CHOICE.match(line["text"])]
    if not marked:
        return None
    ceiling = marked[0]["y"]
    changed = True
    while changed:
        changed = False
        for line in lines:
            if CHOICE.match(line["text"]):
                continue
            if ceiling < line["y"] <= ceiling + 0.055 and line["x"] < 0.25 and len(line["text"]) > 30:
                ceiling = line["y"]
                changed = True
    return ceiling


def clean_cell(text: str) -> str:
    if re.fullmatch(r"S\d[\d,.]*", text):
        text = "$" + text[1:]
    if re.fullmatch(r"\$\d+,\d{1,2}", text):
        text = text.replace(",", ".")
    match = re.fullmatch(r"\$(\d+)\.(\d{3})", text)
    if match:
        text = f"${match.group(1)},{match.group(2)}"
    return text


def table_from(lines: list[dict]) -> dict | None:
    ceiling = question_ceiling(lines)
    if ceiling is None:
        return None
    tokens = []
    for line in lines:
        if line["y"] <= ceiling + 0.02:
            continue
        tokens.extend(line["tokens"])
    cells = []
    for token in tokens:
        cleaned = clean_cell(token["text"])
        if CELL.fullmatch(cleaned):
            cells.append({**token, "text": cleaned})
    if len(cells) < 8:
        return None
    cells.sort(key=lambda token: token["x"])
    columns: list[list[dict]] = [[cells[0]]]
    for cell in cells[1:]:
        if cell["x"] - columns[-1][-1]["x"] > 0.045:
            columns.append([cell])
        else:
            columns[-1].append(cell)
    if len(columns) < 3:
        return None
    centers = [sum(item["x"] for item in column) / len(column) for column in columns]
    cells.sort(key=lambda token: -token["y"])
    row_groups: list[list[dict]] = [[cells[0]]]
    for cell in cells[1:]:
        if row_groups[-1][0]["y"] - cell["y"] > 0.016:
            row_groups.append([cell])
        else:
            row_groups[-1].append(cell)
    if len(row_groups) < 3:
        return None
    grid = []
    for group in row_groups:
        row = [""] * len(columns)
        for cell in group:
            index = min(range(len(centers)), key=lambda item: abs(centers[item] - cell["x"]))
            row[index] = cell["text"]
        grid.append(row)
    if len(grid) <= 7:
        present = [(index, row[0]) for index, row in enumerate(grid) if re.fullmatch(r"[A-G]", row[0])]
        if present and all(ord(letter) - ord("A") == index for index, letter in present):
            for index, row in enumerate(grid):
                if not row[0]:
                    row[0] = chr(ord("A") + index)
    data_top = max(cell["y"] for cell in cells)
    header_tokens = [
        token
        for token in tokens
        if token["y"] > data_top + 0.012 and not CELL.fullmatch(token["text"]) and len(token["text"]) > 1
    ]
    caption = None
    headers = [""] * len(columns)
    if header_tokens:
        peak = max(token["y"] for token in header_tokens)
        title = [token for token in header_tokens if token["y"] >= peak - 0.025]
        rest = [token for token in header_tokens if token not in title]
        caption = " ".join(token["text"] for token in sorted(title, key=lambda token: token["x"]))
        rest.sort(key=lambda token: -token["y"])
        for token in rest:
            words = token["text"].split()
            width = token["w"] / max(len(token["text"]), 1)
            cursor = token["x"]
            for word in words:
                center = cursor + width * len(word) / 2
                index = min(range(len(centers)), key=lambda item: abs(centers[item] - center))
                headers[index] = f"{headers[index]} {word}".strip()
                cursor += width * (len(word) + 1)
    if not any("$" in cell for row in grid for cell in row):
        return None
    return {"caption": caption, "headers": headers, "rows": grid}


def clean_choice(text: str) -> str:
    text = text.replace("В", "B").replace("А", "A").replace("С", "C")
    text = re.sub(r"\s+best completes the text\.?$", "", text, flags=re.I)
    text = re.sub(r"\s+\d+\s*ø$", "", text)
    return re.sub(r"\s+", " ", text).strip()


def expand_choices(choices: list[dict]) -> list[dict]:
    expanded = []
    for item in choices:
        parts = re.split(r"\s+([A-I])[\.\)]\s+", item["text"])
        expanded.append({**item, "text": parts[0].strip()})
        for letter, text in zip(parts[1::2], parts[2::2]):
            if text.strip():
                expanded.append({"letter": letter, "text": text.strip(), "y": item["y"], "x": item["x"]})
    return expanded


def structure(lines: list[dict]) -> dict:
    runs = choice_runs(lines)
    choices = runs[-1] if runs else blank_columns(lines)
    for item in choices:
        item["text"] = clean_choice(item["text"])
    choices = expand_choices(choices)
    choice_ys = {item["y"] for item in choices} if choices and "y" in choices[0] else set()
    asked = [line for line in lines if "?" in line["text"] and not CHOICE.match(line["text"])]
    question_y = asked[0]["y"] if asked else None
    body = []
    for line in lines:
        if line["y"] in choice_ys:
            continue
        if CHOICE.match(line["text"]) and any(item["letter"] == CHOICE.match(line["text"]).group(1) for item in choices):
            continue
        if re.match(r"^(select one|select the two|for each blank|indicate all|questions \d|best completes)", line["text"], re.I):
            continue
        if re.search(r"blank\s*\((i{1,3}|\d)\)", line["text"], re.I) and len(line["text"]) < 24:
            continue
        if any(line["text"] == item["text"] for item in choices):
            continue
        body.append(line)
    table = table_from(lines)
    ceiling = question_ceiling(lines)
    if table and ceiling is not None:
        body = [line for line in body if line["y"] <= ceiling + 0.012]
    prompt = " ".join(line["text"] for line in body)
    prompt = re.sub(r"[-.•]{4,}", " ", prompt)
    prompt = re.sub(r"\s+\d+\s*ø", " ", prompt)
    prompt = re.sub(r"\s+", " ", prompt).strip()
    prompt = re.sub(r"^\d{3}\s*[\"“”•]*\s*", "", prompt)
    prompt = re.sub(r"^\d{1,2}[\.\)]\s+", "", prompt)
    prompt = re.sub(r"\s+best completes the text\.?$", "", prompt, flags=re.I)
    prompt = re.sub(r"(?:\s+[A-IВ][\.\)])\s+\$[\d,.]+(?:\s+[A-IВ][\.\)]\s+\$[\d,.]+)*$", "", prompt)
    clean_choices = [{"letter": item["letter"], "text": item["text"]} for item in choices]
    return {"prompt": prompt, "choiceItems": clean_choices, "table": table}


def main() -> None:
    bank = json.loads(BANK.read_text())
    missing = 0
    with_choices = 0
    with_tables = 0
    for question in bank["questions"]:
        path = OCR / f"{question['id']}.tsv"
        if not path.exists() or path.stat().st_size == 0:
            missing += 1
            continue
        parsed = structure(load_lines(path))
        question["prompt"] = parsed["prompt"]
        question["choiceItems"] = parsed["choiceItems"]
        question["table"] = parsed["table"]
        if parsed["choiceItems"]:
            with_choices += 1
        if parsed["table"]:
            with_tables += 1
    BANK.write_text(json.dumps(bank, indent=2), encoding="utf-8")
    print(f"choices {with_choices} tables {with_tables} missing {missing}")


if __name__ == "__main__":
    main()
