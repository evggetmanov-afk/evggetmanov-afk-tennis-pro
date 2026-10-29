"""
НАЗНАЧЕНИЕ: Безопасное атомарное сохранение содержимого буфера обмена на SSD полигона.
ПРОБЛЕМА: Исключение ручной вставки через heredoc (cat << 'EOF'), защита от выхода за пределы репозитория (Path Traversal) и предотвращение повреждения файлов при сбоях записи.
ВХОД: Системный буфер обмена macOS (pbpaste). Первая строка (или одна из первых пяти) обязана содержать маркер '### FILE: <относительный_путь>'.
ВЫХОД: Атомарно записанный файл на диске, звуковое уведомление macOS, отчет в stdout с относительным путем и размером.
ЗАВИСИМОСТИ: Python 3.8+, утилиты macOS (pbpaste, afplay, osascript).
"""

import os
import re
import sys
import subprocess
from pathlib import Path

VAULT_DIR = Path(__file__).resolve().parent.parent


def play_sound(sound_name: str) -> None:
    sound_path = Path(f"/System/Library/Sounds/{sound_name}.aiff")
    if sound_path.exists():
        subprocess.run(
            ["afplay", str(sound_path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def notify(title: str, message: str) -> None:
    script = f'display notification "{message}" with title "{title}"'
    subprocess.run(
        ["osascript", "-e", script],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def get_clipboard() -> str:
    try:
        res = subprocess.run(["pbpaste"], capture_output=True, text=True, check=True)
        return res.stdout
    except Exception as e:
        play_sound("Sosumi")
        notify("Лабораторный полигон", f"Ошибка pbpaste: {e}")
        print(f"❌ Ошибка чтения буфера обмена: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    # 1. Запрет аргументов командной строки
    if len(sys.argv) > 1:
        play_sound("Sosumi")
        notify("Лабораторный полигон", "Запрещено передавать путь аргументом")
        print(
            "❌ КРИТИЧЕСКОЕ НАРУШЕНИЕ РЕГЛАМЕНТА: передача аргументов командной строки запрещена!\n"
            "   Путь обязан передаваться внутри буфера обмена: '### FILE: <относительный_путь>'.\n"
            "   Вызов команды в терминале строго без параметров: save",
            file=sys.stderr,
        )
        sys.exit(1)

    text = get_clipboard()
    if not text.strip():
        play_sound("Basso")
        notify("Лабораторный полигон", "Буфер обмена пуст")
        print("⚠️ Буфер обмена пуст.", file=sys.stderr)
        sys.exit(1)

    # 2. Поиск маркера пути в первых 5 строках
    target_path_raw = None
    content_to_write = text

    lines = text.splitlines(keepends=True)
    for i in range(min(5, len(lines))):
        line = lines[i].strip()
        m = re.match(r"^(?:### FILE:|<<<FILE_PATH:)\s*([^\s]+)", line)
        if m:
            target_path_raw = m.group(1)
            content_to_write = "".join(lines[i + 1 :])
            content_to_write = re.sub(
                r"<<<FILE_CONTENT_END>>>\s*$", "", content_to_write
            )
            break

    if not target_path_raw:
        play_sound("Basso")
        notify("Лабораторный полигон", "Маркер пути не найден (### FILE: <путь>)")
        print(
            '❌ Путь не определен. Добавь в начало буфера строку: "### FILE: <относительный_путь>" и вызови save',
            file=sys.stderr,
        )
        sys.exit(1)

    # 3. Валидация пути и защита от Path Traversal
    raw_path_obj = Path(target_path_raw)
    if raw_path_obj.is_absolute():
        play_sound("Sosumi")
        notify("Лабораторный полигон", "Запрещены абсолютные пути")
        print(
            f"❌ Ошибка безопасности: путь '{target_path_raw}' является абсолютным. "
            "Разрешены только относительные пути внутри репозитория.",
            file=sys.stderr,
        )
        sys.exit(1)

    final_path = (VAULT_DIR / raw_path_obj).resolve()

    try:
        final_path.relative_to(VAULT_DIR)
    except ValueError:
        play_sound("Sosumi")
        notify("Лабораторный полигон", "Выход за пределы репозитория")
        print(
            f"❌ Ошибка безопасности: путь '{target_path_raw}' выходит за пределы корня репозитория ({VAULT_DIR}). "
            "Операция отменена.",
            file=sys.stderr,
        )
        sys.exit(1)

    # 4. Атомарная запись через временный файл
    tmp_path = final_path.parent / f".{final_path.name}.tmp"
    try:
        final_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path.write_text(content_to_write, encoding="utf-8")
        os.replace(tmp_path, final_path)
    except Exception as e:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass
        play_sound("Sosumi")
        notify("Лабораторный полигон", f"Ошибка диска: {e}")
        print(f"❌ Ошибка транзакционной записи в {final_path}: {e}", file=sys.stderr)
        sys.exit(1)

    rel_path_str = str(final_path.relative_to(VAULT_DIR))
    report = f"✅ [SAVE] Записано на диск: {rel_path_str} ({len(content_to_write)} симв.)"
    print(report)
    play_sound("Glass")
    notify("Лабораторный полигон", f"Записано: {rel_path_str}")


if __name__ == "__main__":
    main()