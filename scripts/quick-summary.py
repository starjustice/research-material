#!/usr/bin/env python3
"""Give every lesson a "Quick summary" section made from its own "Remember" lines.

Run from the AiLearner folder after you add or change a lesson:

    python3 scripts/quick-summary.py

The section sits between the lesson's header and its first card, inside two
comment markers, so the script can refresh it later without touching anything
else. A lesson with no "> **Remember:**" lines gets no section from this
script. Write its summary by hand and put it between the same markers with
`<!-- quick-summary:manual -->` as the first line inside, and the script will
leave it alone.
"""
import glob
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

START = "<!-- quick-summary:start -->"
END = "<!-- quick-summary:end -->"
MANUAL = "<!-- quick-summary:manual -->"
BLOCK = re.compile(re.escape(START) + r".*?" + re.escape(END) + r"\n*", re.S)

INTRO = ("Short on time? Read only this. These are the \"Remember\" lines from the cards below, "
         "so you can read the whole lesson in one minute.")


def tidy(line):
    # Remember lines often start in lower case, like "the sync code runs first". Start a list item with a capital.
    return line[:1].upper() + line[1:] if line[:1].islower() else line


def build(lines):
    body = "\n".join("- " + tidy(l) for l in lines)
    return f"{START}\n## Quick summary\n\n> {INTRO}\n\n{body}\n{END}\n\n"


def process(path):
    text = open(path, encoding="utf-8").read()
    existing = BLOCK.search(text)
    if existing and MANUAL in existing.group(0):
        return "manual"
    remember = re.findall(r"^> \*\*Remember:\*\*\s*(.+)$", text, re.M)
    if not remember:
        return "no remember lines"
    stripped = BLOCK.sub("", text)
    first_h2 = re.search(r"^## ", stripped, re.M)
    if not first_h2:
        return "no cards"
    new = stripped[:first_h2.start()] + build(remember) + stripped[first_h2.start():]
    if new == text:
        return "same"
    open(path, "w", encoding="utf-8").write(new)
    return "written"


def main():
    counts = {}
    for path in sorted(glob.glob("learn/*/[0-9][0-9]-*.md")):
        r = process(path)
        counts[r] = counts.get(r, 0) + 1
        if r in ("no remember lines", "no cards"):
            print(f"{r}: {path}")
    print(counts)


if __name__ == "__main__":
    main()
