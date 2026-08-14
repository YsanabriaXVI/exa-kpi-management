# AGENTS.md

## Project
EXA KPI System.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Database: MySQL 8
- DB access: raw SQL with mysql2, no ORM
- Validation: Zod
- Server state: TanStack Query
- Version control: Git
- Containers: Docker

## Architecture rules
- Use modular structure by feature/module.
- Keep business logic out of React components.
- Backend controllers must handle HTTP only.
- Backend services must contain business rules.
- Backend repositories must contain SQL queries.
- Use Zod schemas for request validation.
- Use DTO/types for typed payloads.
- Do not introduce Nest.js or ORM.
- Do not modify unrelated modules when implementing a feature.

## Frontend navigation rules
- Sidebar modules are based on `21-Jul-2026- KPIS EXA Project Structure.docx`.
- Show only placeholder text inside each page until each module is implemented.
- Sidebar expanded items must show vertical connector lines for children/subchildren.
- Active module/item must be highlighted with a light gray background.

## MVP focus
- KPI Definition
- KPI Config
- KPI Pool
- ScoreCards
- Monitoring Results
- Reports
- Roles/Users basic
