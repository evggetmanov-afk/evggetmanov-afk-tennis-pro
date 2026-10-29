#!/usr/bin/env python3
"""
Сборщик монолита Tennis Pro (scripts/build.py)
Компилирует модульную структуру src/ в единый автономный index.html (Zero-Dependency).
"""

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"
OUTPUT_FILE = ROOT_DIR / "index.html"

def read_file(path: Path) -> str:
    if not path.exists():
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def collect_styles() -> str:
    """Собирает все CSS-файлы из src/css/."""
    css_parts = []
    css_dir = SRC_DIR / "css"
    if not css_dir.exists():
        return ""

    for root, _, files in os.walk(css_dir):
        for file in sorted(files):
            if file.endswith(".css"):
                file_path = Path(root) / file
                css_parts.append(f"/* === {file_path.relative_to(SRC_DIR)} === */")
                css_parts.append(read_file(file_path))
                css_parts.append("")

    return "\n".join(css_parts)

def strip_esm(code: str) -> str:
    """Очищает ES-модули (import/export) для монолитного инлайна."""
    lines = []
    for line in code.splitlines():
        if line.strip().startswith("import "):
            continue
        if line.strip().startswith("export const "):
            line = line.replace("export const ", "const ", 1)
        elif line.strip().startswith("export class "):
            line = line.replace("export class ", "class ", 1)
        elif line.strip().startswith("export function "):
            line = line.replace("export function ", "function ", 1)
        elif line.strip().startswith("export let "):
            line = line.replace("export let ", "let ", 1)
        elif line.strip().startswith("export default "):
            line = line.replace("export default ", "", 1)
        lines.append(line)
    return "\n".join(lines)

def build_monolith():
    print("🔨 Сборка монолита Tennis Pro...")

    if not SRC_DIR.exists():
        print(f"❌ Ошибка: Каталог исходников {SRC_DIR} не найден!", file=sys.stderr)
        sys.exit(1)

    styles = collect_styles()
    storage_js = strip_esm(read_file(SRC_DIR / "js" / "core" / "storage.js"))
    audio_js = strip_esm(read_file(SRC_DIR / "js" / "core" / "audio.js"))
    roster_js = strip_esm(read_file(SRC_DIR / "js" / "modules" / "roster.js"))
    counter_js = strip_esm(read_file(SRC_DIR / "js" / "modules" / "counter.js"))

    js_template = """
/* --- Tennis Pro Core & Modules (Compiled Monolith) --- */
(() => {
    'use strict';

    /* [Core: Storage] */
    __STORAGE_JS__

    /* [Core: Audio Engine] */
    __AUDIO_JS__

    /* [Module 1: Roster & Session] */
    __ROSTER_JS__

    /* [Module 2: Matrix Counter] */
    __COUNTER_JS__

    /* [Application Router & Bootstrap] */
    window.addEventListener("DOMContentLoaded", () => {
        const appContainer = document.getElementById("app-root");
        if (!appContainer) return;

        let activeScreen = null;

        const showRoster = () => {
            activeScreen = new RosterModule(appContainer, (selectedAthletes) => {
                showCounter(selectedAthletes);
            });
        };

        const showCounter = (participants) => {
            activeScreen = new MatrixCounterModule(appContainer, {
                participants: participants,
                onBackToRoster: () => {
                    showRoster();
                }
            });
        };

        // Старт с проверки сохраненной активной сессии
        const session = storage.getActiveSession();
        if (session && Array.isArray(session.participants) && session.participants.length >= 2) {
            showCounter(session.participants);
        } else {
            showRoster();
        }
    });
})();
"""

    bundle_js = (
        js_template
        .replace("__STORAGE_JS__", storage_js)
        .replace("__AUDIO_JS__", audio_js)
        .replace("__ROSTER_JS__", roster_js)
        .replace("__COUNTER_JS__", counter_js)
    )

    html_template = """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Tennis Pro">
    <meta name="format-detection" content="telephone=no">
    <title>Теннисный Полигон (Tennis Pro)</title>
    <style>
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html, body {
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            background-color: #05080c;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #f0f6fc;
            -webkit-font-smoothing: antialiased;
            touch-action: manipulation;
        }
        #app-root {
            width: 100%;
            min-height: 100%;
        }

        /* Скомпилированные стили */
__COMPILED_STYLES__
    </style>
</head>
<body>
    <main id="app-root"></main>
    <script>
__COMPILED_JS__
    </script>
</body>
</html>
"""

    html_content = (
        html_template
        .replace("__COMPILED_STYLES__", styles)
        .replace("__COMPILED_JS__", bundle_js)
    )

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html_content)

    file_size_kb = len(html_content.encode("utf-8")) / 1024
    print(f"✅ Монолит собран: {OUTPUT_FILE} ({file_size_kb:.1f} KB)")

if __name__ == "__main__":
    build_monolith()