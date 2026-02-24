---
title: Building CLI Tools with Python
description: How to build useful command-line tools using Python — from argument parsing to packaging and distribution.
tags:
  - python
  - cli
  - tools
---

# Building CLI Tools with Python :computer:

Command-line tools are some of the most useful programs you can build. They're composable, scriptable, and work everywhere. Python makes it surprisingly easy to go from an idea to a polished, distributable CLI tool.

This article walks through building a CLI tool from scratch, covering argument parsing, error handling, output formatting, and packaging.

---

## Why Build CLI Tools?

- **Automation** — script repetitive tasks
- **Portability** — runs anywhere Python does
- **Composability** — pipes well with other Unix tools
- **Speed** — faster to invoke than a GUI for power users

---

## The Simplest Possible CLI

```python title="hello_cli.py"
#!/usr/bin/env python3
import sys

if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "World"
    print(f"Hello, {name}!")
```

```bash
python3 hello_cli.py Alice
# Hello, Alice!
```

This works, but `sys.argv` gets unwieldy fast. Let's use a proper argument parser.

---

## Using `argparse`

`argparse` is part of Python's standard library and handles argument parsing, validation, and help text generation automatically.

```python title="greet.py"
#!/usr/bin/env python3
"""Greet one or more people from the command line."""

import argparse


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Greet people from the command line.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  greet Alice
  greet Alice Bob --formal
  greet --count 3 Charlie
        """,
    )
    parser.add_argument("names", nargs="+", help="Names to greet")
    parser.add_argument(
        "--formal", "-f", action="store_true", help="Use a formal greeting"
    )
    parser.add_argument(
        "--count", "-n", type=int, default=1, metavar="N",
        help="Repeat the greeting N times (default: 1)"
    )
    return parser


def greet(name: str, formal: bool = False) -> str:
    if formal:
        return f"Good day, {name}."
    return f"Hey, {name}!"


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    for name in args.names:
        message = greet(name, formal=args.formal)
        for _ in range(args.count):
            print(message)


if __name__ == "__main__":
    main()
```

```bash
python3 greet.py Alice Bob --formal --count 2
# Good day, Alice.
# Good day, Alice.
# Good day, Bob.
# Good day, Bob.

python3 greet.py --help
# usage: greet.py [-h] [--formal] [--count N] names [names ...]
# ...
```

---

## Proper Exit Codes

Exit codes matter in scripts and CI pipelines. Use `0` for success, non-zero for errors.

```python title="exit_codes.py"
import sys

def main() -> None:
    try:
        result = do_work()
        print(result)
        sys.exit(0)  # Success
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)  # General error
    except PermissionError as e:
        print(f"Permission denied: {e}", file=sys.stderr)
        sys.exit(126)  # Permission problem
```

!!! tip
    Always write error messages to `stderr` (`file=sys.stderr`) so they don't pollute the standard output that other programs may consume.

---

## Rich Output with `rich`

The [`rich`](https://github.com/Textualize/rich) library makes terminal output beautiful with zero effort.

```bash
pip install rich
```

```python title="rich_example.py"
from rich.console import Console
from rich.table import Table
from rich.progress import track

console = Console()

# Styled text
console.print("[bold green]✓[/bold green] Build succeeded")
console.print("[bold red]✗[/bold red] Tests failed")

# Tables
table = Table(title="Scan Results")
table.add_column("File", style="cyan")
table.add_column("Issues", style="red", justify="right")
table.add_column("Status", justify="center")

table.add_row("main.py", "0", "[green]✓ Clean[/green]")
table.add_row("utils.py", "2", "[yellow]⚠ Warning[/yellow]")
table.add_row("auth.py", "1", "[red]✗ Error[/red]")

console.print(table)

# Progress bar
for item in track(range(100), description="Processing..."):
    pass  # your work here
```

---

## Packaging Your Tool

Make your tool installable with `pip` by adding a `pyproject.toml`:

```toml title="pyproject.toml"
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "greet"
version = "0.1.0"
description = "Greet people from the command line"
requires-python = ">=3.10"

[project.scripts]
greet = "greet:main"
```

Now users can install and run it as a regular command:

```bash
pip install .
greet Alice --formal
```

---

## Project Structure

```
my-cli/
├── pyproject.toml
├── README.md
├── src/
│   └── mycli/
│       ├── __init__.py
│       ├── __main__.py   ← enables `python -m mycli`
│       └── cli.py
└── tests/
    └── test_cli.py
```

---

## Testing Your CLI

```python title="tests/test_cli.py"
import subprocess
import sys


def run_cli(*args):
    """Helper to run the CLI and return (returncode, stdout, stderr)."""
    result = subprocess.run(
        [sys.executable, "-m", "mycli", *args],
        capture_output=True,
        text=True,
    )
    return result


def test_greet_default():
    result = run_cli("Alice")
    assert result.returncode == 0
    assert "Alice" in result.stdout


def test_greet_formal():
    result = run_cli("Bob", "--formal")
    assert result.returncode == 0
    assert "Good day, Bob." in result.stdout


def test_missing_name_exits_nonzero():
    result = run_cli()
    assert result.returncode != 0
```

---

!!! success "You're ready to build"
    With these building blocks — `argparse`, proper exit codes, rich output, and packaging — you have everything you need to build professional, distributable CLI tools.

!!! info "Further reading"
    - [argparse docs](https://docs.python.org/3/library/argparse.html)
    - [Rich documentation](https://rich.readthedocs.io/)
    - [Python Packaging Guide](https://packaging.python.org/)
    - [Click](https://click.palletsprojects.com/) — a popular alternative to argparse
