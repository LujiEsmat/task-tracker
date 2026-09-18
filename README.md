# Full-Stack Vibe-Coded Task Tracker

## 1. Architecture Overview (3-Tier)
* **Presentation Tier:** Frontend UI built with HTML5, CSS3, and JavaScript.
* **Application Tier:** Node.js REST API using the Express framework.
* **Database Tier:** Persistent SQLite / PostgreSQL Database for task storage.

## 2. SDLC & Data Flow Diagram
```mermaid
graph TD
    Client[User Browser / Frontend] -->|HTTP Requests| API[Express.js Backend API]
    API -->|Parameterized SQL| DB[(Live SQL Database)]
    API -->|JSON Responses| Client
    
    subgraph CI/CD Pipeline (GitHub Actions)
        GitPush[Git Push to main] --> LintTest[Automated Tests & Coverage]
        LintTest --> SecretScan[Secret Leak Scan]
        SecretScan --> Deploy[Production Deploy to Cloud]
    end
```
