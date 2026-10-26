#!/usr/bin/env python3
"""Rebuild index.html (the study hub) from the folders.

Run from the AiLearner folder after adding lessons, guides or company notes:

    python3 scripts/build-hub.py

It scans learn/, interview/ and my-learning/. Card titles come from
scripts/hub-descriptions.json when a file is listed there, otherwise from the
file's first heading and, for lessons, the "You will be able to" line.
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
DESC = json.load(open("scripts/hub-descriptions.json", encoding="utf-8"))
GH = "https://github.com/starjustice/research-material/tree/main/"

SUBJECTS = [
    ("javascript", "JavaScript"), ("typescript", "TypeScript"), ("react", "React"),
    ("react-native", "React Native"), ("backend-api", "Backend and API"), ("database", "Database"),
    ("system-design", "System Design"), ("networking", "Networking"), ("devops-cloud", "DevOps and Cloud"),
    ("problem-solving", "Problem Solving"), ("other-stacks", "Other Stacks"),
]


def esc(s):
    return html.escape(s, quote=True)


def first_heading(path):
    try:
        for line in open(path, encoding="utf-8"):
            if line.startswith("# "):
                return line[2:].strip()
    except OSError:
        pass
    return os.path.basename(path)


def lesson_goal(path):
    for line in open(path, encoding="utf-8"):
        m = re.search(r"\*\*You will be able to:\*\*\s*(.+)", line)
        if m:
            return m.group(1).strip()
    return ""


def viewer(path):
    return "viewer.html?note=" + path[:-3]


def card(href, tag, cls, title, sub):
    return (f'<a class="card" href="{esc(href)}">\n  <span class="tag {cls}">{tag}</span>\n'
            f"  <b>{esc(title)}</b>\n  <span>{esc(sub)}</span>\n</a>\n")


def info(path, default_sub=""):
    if path in DESC:
        return DESC[path]
    return [first_heading(path) if path.endswith(".md") else os.path.basename(path), default_sub]


def subject_block(slug, name):
    base = f"learn/{slug}"
    if not os.path.isdir(base):
        return ""
    files = sorted(os.listdir(base))
    out = [f'<details class="subject"><summary><b>{esc(name)}</b>']
    lessons = [f for f in files if re.match(r"\d\d-.*\.md$", f)]
    guides = [f for f in files if f.endswith(".md") and f != "README.md" and f not in lessons]
    sheets = [f for f in files if f.endswith(".html")]
    examples = sorted(os.listdir(base + "/examples")) if os.path.isdir(base + "/examples") else []
    visuals = sorted(f for f in os.listdir(base + "/visuals") if f.endswith(".html")) if os.path.isdir(base + "/visuals") else []
    counts = []
    if lessons:
        counts.append(f"{len(lessons)} lesson" + ("s" if len(lessons) != 1 else ""))
    if guides:
        counts.append(f"{len(guides)} guide" + ("s" if len(guides) != 1 else ""))
    if visuals:
        counts.append(f"{len(visuals)} visual" + ("s" if len(visuals) != 1 else ""))
    if sheets:
        counts.append(f"{len(sheets)} cheatsheet" + ("s" if len(sheets) != 1 else ""))
    out.append(f'<small>{esc(", ".join(counts) or "lesson plan ready")}</small></summary>\n')
    out.append(card(viewer(base + "/README.md"), "MAP", "map", f"{name}: map and lesson list",
                    "Every concept in order, one per file, with status"))
    for f in lessons:
        p = f"{base}/{f}"
        out.append(card(viewer(p), "LESSON " + f[:2], "lesson", first_heading(p), lesson_goal(p)))
    for f in visuals:
        p = f"{base}/visuals/{f}"
        t, s = info(p, "Interactive page")
        out.append(card(p, "VISUAL", "app", t, s))
    for f in guides:
        p = f"{base}/{f}"
        t, s = info(p, "Longer guide")
        out.append(card(viewer(p), "GUIDE", "note", t, s))
    for f in sheets:
        p = f"{base}/{f}"
        t, s = info(p, "Visual cheatsheet")
        out.append(card(p, "CHEATSHEET", "sheet", t, s))
    for e in examples:
        p = f"{base}/examples/{e}"
        t, s = info(p, "Example project")
        out.append(card(GH + p, "CODE", "app", t, s))
    out.append("</details>\n")
    return "".join(out)


def interview_block():
    out = []
    comp = "interview/companies"
    for c in sorted(os.listdir(comp)) if os.path.isdir(comp) else []:
        files = sorted(os.listdir(f"{comp}/{c}"))
        out.append(f'<details class="subject"><summary><b>{esc(c.replace("-", " ").title())}</b>'
                   f"<small>{len(files)} files</small></summary>\n")
        for f in files:
            p = f"{comp}/{c}/{f}"
            if f.endswith(".md"):
                t, s = info(p, "")
                tag = "REPORT" if f.startswith(("mock-", "exam-", "live-coding-", "advanced-interview-")) else "PREP"
                out.append(card(viewer(p), tag, "note", t, s))
            elif f.endswith(".html"):
                t, s = info(p, "Visual cheatsheet")
                out.append(card(p, "CHEATSHEET", "sheet", t, s))
        out.append("</details>\n")
    for folder, label in (("interview/my-projects", "My projects"), ("interview/practice-reports", "Practice reports")):
        if not os.path.isdir(folder):
            continue
        files = sorted(f for f in os.listdir(folder) if f.endswith(".md"))
        out.append(f'<details class="subject"><summary><b>{label}</b><small>{len(files)} files</small></summary>\n')
        for f in files:
            p = f"{folder}/{f}"
            t, s = info(p, "")
            out.append(card(viewer(p), "STORY" if "projects" in folder else "REPORT", "note", t, s))
        out.append("</details>\n")
    return "".join(out)


STYLE = """
  /* Palette (light and dark) and page layout. The Calm look itself lives in calm.css, section "Hub". */
  :root {
    --bg: #faf6ee; --card: #fff; --ink: #1e3a4c; --muted: #6b7a86;
    --accent: #f5c542; --green: #3a9d6e; --blue-soft: #dbeafe; --violet: #ede4ff;
    --border: #e6dfd2; --radius: 14px;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #14181d; --card: #1d232a; --ink: #e8edf3; --muted: #9aa7b4;
      --accent: #c99a12; --green: #4cc38a; --blue-soft: #1d3150; --violet: #2f2550; --border: #2c343d; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 760px; margin: 0 auto; padding: 28px 16px 60px; }
"""


def main():
    parts = [f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Study Hub</title>
<style>{STYLE}</style>
<link rel="stylesheet" href="calm.css">
</head>
<body class="calm page-hub can-dark">

<header>
  <h1>Study Hub</h1>
  <p>Learn the concept first, then practice saying it</p>
</header>

<h2>Start here</h2>
<p>Pick what to learn, track your steps, and see what is due for review.</p>
"""]
    parts.append(card("study.html", "START HERE", "map", *DESC.get("study.html", ["Study Route", ""])))
    parts.append(card("speak.html", "PRACTICE", "note", *DESC.get("speak.html", ["Say it out loud", ""])))
    parts.append(card(viewer("my-learning/learner-profile.md"), "ME", "note", "How I learn",
                      "The rules every skill and agent follows when teaching me"))
    parts.append('\n<h2>Learn</h2>\n<p>One folder per subject. Open a subject to see its map, lessons, guides, cheatsheets and code.</p>\n')
    for slug, name in SUBJECTS:
        parts.append(subject_block(slug, name))
    parts.append('\n<h2>Interview</h2>\n<p>Practice saying it under pressure. One folder per company, plus your project stories.</p>\n')
    parts.append(interview_block())
    parts.append('\n<h2>My learning</h2>\n<p>What you understand and what still needs review.</p>\n')
    for p, t, s in (("my-learning/review-list.md", "Review list", "Questions to answer again on day 1, 3, 7 and 21"),
                    ("my-learning/my-explanations.md", "My explanations", "Your best explanations, in your own words"),
                    ("my-learning/study-method-and-weekly-plan.md", "Study method and weekly plan", "The learning loop and the four part answer")):
        if os.path.exists(p):
            parts.append(card(viewer(p), "LOG", "note", t, s))
    rec = "my-learning/recordings"
    for f in sorted(os.listdir(rec)) if os.path.isdir(rec) else []:
        if f.endswith(".md") and f != "README.md":
            parts.append(card(viewer(f"{rec}/{f}"), "RECORDING", "note", first_heading(f"{rec}/{f}"), "My spoken explanation and the coach feedback"))
    parts.append('\n<footer>Built by scripts/build-hub.py from the folders.</footer>\n</body>\n</html>\n')
    open("index.html", "w", encoding="utf-8").write("".join(parts))
    print("index.html rebuilt")


if __name__ == "__main__":
    main()
