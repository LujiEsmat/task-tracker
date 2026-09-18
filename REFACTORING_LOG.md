# AI Code Refactoring & Security Audit Log

### Entry 1: Secret Leak & Hardcoded Credentials
* **Original AI Output:** Hardcoded database connection strings and API key secrets inside source files.
* **Security Risk:** Credentials exposed in public GitHub repositories (OWASP A07).
* **Correction:** Extracted secrets to a `.env` file and loaded them securely using `process.env`.

### Entry 2: SQL Injection Vulnerability
* **Original AI Output:** Concatenated query string `db.raw("SELECT * FROM tasks WHERE category = '" + req.query.category + "'")`.
* **Security Risk:** Direct string concatenation allows SQL Injection attacks (OWASP A03).
* **Correction:** Refactored query to use parameterized bindings: `db('tasks').where('category', req.query.category)`.
