# Contributing

Thank you for your interest in contributing to TravelNest! 🎉

## How to Contribute

### 1. Choose an Area

Areas that need the most help:

- **Test coverage** — Add unit/integration/E2E tests across all packages
- **Deployment & monitoring** — Refine Kubernetes manifests, monitoring, alerting
- **AI features** — Sentiment analysis for reviews, smart recommendations
- **Bug fixes** — Check the issue tracker for open bugs
- **Documentation** — Improve READMEs, wiki pages, API docs

### 2. Branching Strategy

```bash
# Create a feature branch from master
git checkout master
git pull
git checkout -b feat/your-feature-name

# Or for fixes
git checkout -b fix/your-fix-name
```

### 3. Development Workflow

```bash
# Make your changes, then:
yarn lint              # Ensure code style
yarn workspace @travelnest/<package> test   # Run relevant tests

# Commit your changes
git add .
git commit -m "feat: concise description of your change"
```

### 4. Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `test:` — Test additions or fixes
- `refactor:` — Code refactoring
- `chore:` — Build/config/maintenance

### 5. Pull Request Checklist

- [ ] Code follows existing conventions and style
- [ ] Lint passes (`yarn lint`)
- [ ] Tests pass for affected packages
- [ ] New endpoints follow the validator → route → controller → service → repository pattern
- [ ] Environment variables documented in `.env.format` or `.env.example`
- [ ] Database changes include a migration
- [ ] README or wiki updated if adding/changing features

### 6. Code Review

All PRs require review before merging. Reviewers will check:
- Correctness and edge cases
- Test coverage
- Code style and conventions
- Security (no leaked secrets, proper input validation)

## Coding Conventions

### Backend (server/)
- **CommonJS** modules (`require`/`module.exports`)
- Use module aliases: `@services`, `@repositories`, `@models`, `@config`
- Keep controllers thin, services for business logic, repositories for DB access
- Use Joi validators for request validation
- Use `ApiError` + `asyncHandler` patterns
- Stripe webhooks need raw body parsing

### Frontend (client/)
- **ES Modules** (`import`/`export`)
- Update both `en.json` and `vi.json` when adding text
- Vuex stores: split into state/getters/mutations/actions files
- Environment variables must start with `VITE_`

### Admin (admin-client/)
- **ES Modules** + **TypeScript**
- Pinia for state management
- Browser-exposed env vars need `NUXT_PUBLIC_` prefix

## AI Agents

If you are an AI coding agent, please also read the **[AGENT.md](../AGENT.md)** file at the repository root for project-specific instructions and conventions.
