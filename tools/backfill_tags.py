import json
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def main():
    for path in sorted(DATA_DIR.glob("*.json")):
        with path.open(encoding="utf-8") as file:
            questions = json.load(file)

        updated = False
        for question in questions:
            if isinstance(question, dict) and "tags" not in question:
                topic = question.get("topic")
                question["tags"] = [topic] if topic else []
                updated = True

        if updated:
            with path.open("w", encoding="utf-8", newline="\n") as file:
                json.dump(questions, file, indent=2, ensure_ascii=False)
                file.write("\n")
            print(f"Updated {path.name}")


if __name__ == "__main__":
    main()
