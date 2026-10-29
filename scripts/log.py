import sys
import os
from datetime import datetime

if len(sys.argv) < 2:
    print("Ошибка: укажите, что сделано.")
    print("Пример: python3 log.py "добавили кнопку старта"")
    sys.exit(1)

message = " ".join(sys.argv[1:])
now = datetime.now().strftime("%Y-%m-%d %H:%M")
entry = f"- [{now}] {message}\n"

# Дописываем в журнал
with open("CHANGELOG.md", "a", encoding="utf-8") as f:
    f.write(entry)

print(f"Записано в CHANGELOG.md: {message}")

# Автоматически фиксируем в Git
os.system("git add .")
os.system(f"git commit -m \"{message}\"")
os.system("git push origin main")
