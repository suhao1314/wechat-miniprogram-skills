#!/usr/bin/env python3
"""Initialize persistent mini program planning files without overwriting user work."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    if not project_dir.is_dir():
        print(f"ERROR: project directory does not exist: {project_dir}")
        return 1

    skill_dir = Path(__file__).resolve().parent.parent
    template_dir = skill_dir / "assets" / "project-docs"
    output_dir = project_dir / "docs" / "miniapp"
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "prototype").mkdir(exist_ok=True)

    for source in sorted(template_dir.glob("*.md")):
        target = output_dir / source.name
        if target.exists():
            print(f"SKIP: {target}")
            continue
        shutil.copy2(source, target)
        print(f"CREATE: {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
