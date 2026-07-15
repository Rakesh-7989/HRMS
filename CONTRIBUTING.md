# Contributing to WellZo HRMS

## Development Workflow

1. Create a branch from `main`: `git checkout -b feat/your-feature`
2. Make changes, commit with conventional commits
3. Push and open a PR to `main`
4. CI runs typecheck + lint + build automatically
5. Merge to `main`, then deploy via `prod` branch

## Commit Messages

```
feat: add new feature
fix: correct a bug
chore: tooling, dependencies
docs: documentation only
refactor: code change with no behavioral change
test: adding or updating tests
style: formatting, missing semicolons (not CSS)
```

## Code Standards

- **TypeScript**: Avoid `any`. Prefer proper types. Run `npm run typecheck`.
- **Components**: Use `React.FC<Props>` pattern. Colocate styles with Tailwind.
- **API Calls**: Use services from `src/services/`. Never call axios directly in pages.
- **i18n**: Use `t('namespace.key')` for all user-facing strings.
- **Loading/Error**: Handle `isLoading`, `isError`, and empty states in every page.

## Before Submitting a PR

```bash
cd frontend
npm run typecheck    # No TS errors
npm run lint         # No lint errors
npm run test         # All tests pass
npm run build        # Builds successfully
```

## Project Structure

```
frontend/src/
├── components/  # UI & feature components
│   └── ui/     # Reusable design system atoms
├── contexts/   # React contexts
├── pages/      # Route pages (lazy-loaded)
├── services/   # API service modules
└── utils/      # Utilities & helpers
```
