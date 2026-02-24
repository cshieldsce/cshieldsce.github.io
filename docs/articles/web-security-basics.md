---
title: Web Security Basics
description: An introduction to common web vulnerabilities, attack vectors, and practical defenses every developer should know.
tags:
  - security
  - web
  - beginner
---

# Web Security Basics :shield:

Web security is not just the responsibility of security engineers — it's every developer's job. Understanding common vulnerabilities helps you write safer code from day one.

This article covers the most important concepts from the [OWASP Top 10](https://owasp.org/www-project-top-ten/) and gives you practical code examples of both vulnerable and secure patterns.

---

## The Attacker's Mindset

Before learning defenses, it helps to think like an attacker. Attackers look for:

- **Input that isn't validated** — anything a user can control
- **Secrets stored in plain text** — passwords, API keys, tokens
- **Overly permissive permissions** — users who can do more than they should
- **Outdated dependencies** — known CVEs in libraries you use

---

## SQL Injection

SQL injection happens when user input is concatenated directly into a SQL query.

=== "Vulnerable :x:"

    ```python title="vulnerable.py"
    # NEVER do this — user input directly in query string
    username = request.form["username"]
    query = f"SELECT * FROM users WHERE username = '{username}'"
    db.execute(query)
    ```

    An attacker could input `' OR '1'='1` to bypass authentication entirely.

=== "Secure :white_check_mark:"

    ```python title="secure.py"
    # Use parameterized queries — always
    # Placeholder syntax varies by driver: ? for sqlite3, %s for psycopg2
    username = request.form["username"]

    # sqlite3
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))

    # psycopg2 (PostgreSQL)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    ```

    Parameterized queries ensure user input is treated as data, never as SQL.

---

## Cross-Site Scripting (XSS)

XSS allows attackers to inject malicious scripts into pages viewed by other users.

=== "Vulnerable :x:"

    ```python title="vulnerable_xss.py"
    # Rendering raw user input as HTML
    comment = request.args.get("comment")
    return f"<p>{comment}</p>"
    ```

=== "Secure :white_check_mark:"

    ```python title="secure_xss.py"
    from markupsafe import escape

    comment = request.args.get("comment")
    return f"<p>{escape(comment)}</p>"
    ```

!!! warning "Content Security Policy"
    Even with output encoding, always set a strong `Content-Security-Policy` header to limit what scripts can run on your page.

---

## Insecure Password Storage

Passwords must never be stored in plain text or with weak hashing algorithms like MD5 or SHA-1.

=== "Vulnerable :x:"

    ```python title="vulnerable_passwords.py"
    import hashlib

    # MD5 is broken — do not use for passwords
    hashed = hashlib.md5(password.encode()).hexdigest()
    ```

=== "Secure :white_check_mark:"

    ```python title="secure_passwords.py"
    import bcrypt

    # bcrypt is slow by design — that's the point
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    # Verify
    if bcrypt.checkpw(password.encode(), hashed):
        print("Password matches!")
    ```

---

## Broken Access Control

Just because a user is authenticated doesn't mean they should access every resource.

```python title="access_control.py"
from functools import wraps
from flask import abort, session

def require_role(role: str):
    """Decorator that restricts access to users with a specific role."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_role = session.get("role")
            if user_role != role:
                abort(403)  # Forbidden
            return f(*args, **kwargs)
        return decorated
    return decorator


@app.route("/admin")
@require_role("admin")
def admin_dashboard():
    return "Welcome, admin!"
```

---

## Sensitive Data Exposure

Never hard-code secrets in source code.

=== "Vulnerable :x:"

    ```python title="vulnerable_secrets.py"
    API_KEY = "sk-super-secret-key-12345"  # Committed to git — disaster
    DATABASE_URL = "postgres://user:password@host/db"
    ```

=== "Secure :white_check_mark:"

    ```python title="secure_secrets.py"
    import os

    API_KEY = os.environ["API_KEY"]  # Loaded from environment
    DATABASE_URL = os.environ["DATABASE_URL"]
    ```

    Use a `.env` file locally (and add it to `.gitignore`), and inject secrets via environment variables in production.

---

## Security Headers

A few HTTP headers go a long way:

```python title="headers.py"
@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

---

## Quick Reference Checklist

!!! success "Security checklist for web apps"
    - [x] Use parameterised queries for all database access
    - [x] Escape all user input rendered in HTML
    - [x] Hash passwords with bcrypt, scrypt, or Argon2
    - [x] Enforce authorisation on every endpoint — don't rely on the UI
    - [x] Store secrets in environment variables, never in code
    - [x] Set security-related HTTP headers
    - [x] Keep dependencies up to date (`pip audit`, `npm audit`)
    - [x] Use HTTPS everywhere

---

!!! info "Further reading"
    - [OWASP Top 10](https://owasp.org/www-project-top-ten/)
    - [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
    - [PortSwigger Web Security Academy](https://portswigger.net/web-security)
