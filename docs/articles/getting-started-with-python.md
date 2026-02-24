---
title: Getting Started with Python
description: A beginner-friendly introduction to Python covering essential syntax, data structures, and best practices.
tags:
  - python
  - beginner
  - tutorial
---

# Getting Started with Python :snake:

Python is one of the most popular programming languages in the world — and for good reason. It's readable, versatile, and has a massive ecosystem. Whether you want to automate tasks, build web apps, or dive into data science, Python is a great first language.

---

## Why Python?

- **Readable syntax** — code that looks almost like English
- **Huge standard library** — batteries included
- **Active community** — endless packages on PyPI
- **Versatile** — web, automation, security, ML, and more

---

## Installation

=== "macOS / Linux"

    ```bash
    # Check if Python is installed
    python3 --version

    # Install via package manager (Ubuntu/Debian)
    sudo apt update && sudo apt install python3 python3-pip
    ```

=== "Windows"

    Download the installer from [python.org](https://www.python.org/downloads/) and follow the setup wizard. Make sure to check **Add Python to PATH** during installation.

---

## Your First Script

Create a file called `hello.py`:

```python title="hello.py"
# My first Python script
name = input("What's your name? ")  # (1)!
print(f"Hello, {name}! Welcome to Python.")  # (2)!
```

1. `input()` reads a string from the user.
2. f-strings let you embed expressions directly in string literals.

Run it:

```bash
python3 hello.py
```

---

## Data Types

Python has several built-in data types. Here are the ones you'll use most:

| Type | Example | Description |
|------|---------|-------------|
| `str` | `"hello"` | Text strings |
| `int` | `42` | Integer numbers |
| `float` | `3.14` | Decimal numbers |
| `bool` | `True` / `False` | Boolean values |
| `list` | `[1, 2, 3]` | Ordered, mutable sequence |
| `dict` | `{"key": "value"}` | Key-value pairs |
| `tuple` | `(1, 2, 3)` | Ordered, immutable sequence |

---

## Control Flow

```python title="control_flow.py"
scores = [95, 72, 88, 61, 100]

for score in scores:
    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    else:
        grade = "F"
    print(f"Score: {score} → Grade: {grade}")
```

---

## Functions

```python title="functions.py"
def greet(name: str, formal: bool = False) -> str:
    """Return a greeting for the given name."""
    if formal:
        return f"Good day, {name}."
    return f"Hey, {name}!"


print(greet("Alice"))           # Hey, Alice!
print(greet("Bob", formal=True)) # Good day, Bob.
```

---

## Working with Lists

```python title="lists.py"
fruits = ["apple", "banana", "cherry"]

# Add an item
fruits.append("date")

# List comprehension — create a new list from an existing one
upper_fruits = [f.upper() for f in fruits]
print(upper_fruits)  # ['APPLE', 'BANANA', 'CHERRY', 'DATE']

# Filter with a comprehension
long_fruits = [f for f in fruits if len(f) > 5]
print(long_fruits)  # ['banana', 'cherry']
```

---

## Error Handling

```python title="errors.py"
def divide(a: float, b: float) -> float:
    """Divide a by b, raising a clear error on division by zero."""
    if b == 0:
        raise ValueError("Cannot divide by zero.")
    return a / b


try:
    result = divide(10, 0)
except ValueError as e:
    print(f"Error: {e}")
finally:
    print("Division attempted.")
```

---

## Next Steps

!!! tip "Keep going"
    Once you're comfortable with the basics, explore these topics next:

    - **Object-Oriented Programming** — classes and inheritance
    - **File I/O** — reading and writing files
    - **Virtual environments** — `python3 -m venv .venv`
    - **Popular libraries** — `requests`, `pandas`, `flask`

---

!!! info "Resources"
    - [Official Python Docs](https://docs.python.org/3/)
    - [Real Python Tutorials](https://realpython.com/)
    - [Python Package Index (PyPI)](https://pypi.org/)
