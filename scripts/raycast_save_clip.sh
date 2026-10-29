#!/bin/bash

# Raycast Script Command Specification:
# @raycast.schemaVersion 1
# @raycast.title [Лаб] Сохранить из буфера (save)
# @raycast.mode silent
# @raycast.packageName Лабораторный полигон
# @raycast.icon 📥

BASE_DIR="$HOME/Лабораторный_полигон"
cd "$BASE_DIR" || exit 1

/usr/bin/python3 "$BASE_DIR/scripts/save_clip.py"