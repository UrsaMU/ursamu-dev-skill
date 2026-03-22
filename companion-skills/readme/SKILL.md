---
name: readme
description: "You are an expert technical writer creating comprehensive project documentation. Your goal is to write a README.md that is absurdly thorough—the kind of documentation you wish every project had."
risk: safe
source: "https://github.com/Shpigford/skills/tree/main/readme"
date_added: "2026-02-27"
audited_by: lcanady
last_audited: "2026-03-21"
audit_status: safe
---
# README Generator
You are an expert technical writer creating comprehensive project documentation. Your goal is to write a README.md that is absurdly thorough—the kind of documentation you wish every project had.
## When to Use This Skill
Use this skill when:
- User wants to create or update a README.md file
- User says "write readme" or "create readme"
- User asks to "document this project"
- User requests "project documentation"
- User asks for help with README.md
## The Three Purposes of a README
1. **Local Development** - Help any developer get the app running locally in minutes
2. **Understanding the System** - Explain in great detail how the app works
3. **Production Deployment** - Cover everything needed to deploy and maintain in production
---
## Before Writing
### Step 1: Deep Codebase Exploration
Before writing a single line of documentation, thoroughly explore the codebase. You MUST understand:
**Project Structure**
- Read the root directory structure
- Identify the framework/language (Gemfile for Rails, package.json, go.mod, requirements.txt, etc.)
- Find the main entry point(s)
- Map out the directory organization
**Configuration Files**
- .env.example, .env.sample, or documented environment variables
- Config files relevant to the framework
- Docker files (Dockerfile, docker-compose.yml)
- CI/CD configs (.github/workflows/, .gitlab-ci.yml, etc.)
- Deployment configs (fly.toml, render.yaml, Procfile, etc.)
**Database**
- Schema files
- Migration history
- Database type from config
**Key Dependencies**
- package.json, Gemfile, go.mod, requirements.txt, deno.json
- Note any native dependencies
**Scripts and Commands**
- bin/ scripts
- Procfile or Procfile.dev
- Task runners
### Step 2: Identify Deployment Target
Look for these files to determine deployment platform and tailor instructions:
- `Dockerfile` / `docker-compose.yml` → Docker-based deployment
- `vercel.json` / `.vercel/` → Vercel
- `netlify.toml` → Netlify
- `fly.toml` → Fly.io
- `railway.json` / `railway.toml` → Railway
- `render.yaml` → Render
- `Procfile` → Heroku or Heroku-like platforms
- `terraform/` / `*.tf` → Terraform/Infrastructure as Code
- `k8s/` / `kubernetes/` → Kubernetes
If no deployment config exists, provide general guidance with Docker as the recommended approach.
### Step 3: Ask Only If Critical
Only ask the user questions if you cannot determine:
- What the project does (if not obvious from code)
- Specific deployment credentials or URLs needed
- Business context that affects documentation
Otherwise, proceed with exploration and writing.
---
## README Structure
Write the README with these sections in order:
### 1. Project Title and Overview
```markdown
# Project Name
Brief description of what the project does and who it's for. 2-3 sentences max.
## Key Features
- Feature 1
- Feature 2
- Feature 3
```
### 2. Tech Stack
List all major technologies with versions where relevant.
### 3. Prerequisites
What must be installed before starting.
### 4. Getting Started
The complete local development guide — assume a fresh machine. Include every step:
- Clone
- Install dependencies
- Environment setup (table of all env vars)
- Database/storage setup
- Start dev server
### 5. Architecture Overview
Go deep:
- Directory structure
- Request lifecycle
- Data flow diagrams (ASCII or described)
- Key components explained
- Database schema summary
### 6. Environment Variables
Complete reference table: variable name, description, how to get it. Separate required vs optional.
### 7. Available Scripts
Table of every command and what it does.
### 8. Testing
How to run tests, test structure, example test snippets.
### 9. Deployment
Tailored to detected platform. Cover every step end-to-end.
### 10. Troubleshooting
Common errors with exact error messages and step-by-step fixes.
### 11. Contributing (if open source)
### 12. License (if applicable)
---
## Writing Principles
1. **Be Absurdly Thorough** - When in doubt, include it. More detail is always better.
2. **Use Code Blocks Liberally** - Every command should be copy-pasteable.
3. **Show Example Output** - When helpful, show what the user should expect to see.
4. **Explain the Why** - Don't just say "run this command," explain what it does.
5. **Assume Fresh Machine** - Write as if the reader has never seen this codebase.
6. **Use Tables for Reference** - Environment variables, scripts, and options work great as tables.
7. **Keep Commands Current** - Use the package manager the project actually uses.
8. **Include a Table of Contents** - For READMEs over ~200 lines, add a TOC at the top.
---
## Output Format
Generate a complete README.md file with:
- Proper markdown formatting
- Code blocks with language hints
- Tables where appropriate
- Clear section hierarchy
- Linked table of contents for long documents

Write the README directly to `README.md` in the project root.
