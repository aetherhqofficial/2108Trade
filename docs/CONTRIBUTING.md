# Contributing to 2108Trade

Thank you for your interest in contributing to 2108Trade! We welcome contributions of all kinds — code, docs, bug reports, and feature ideas.

## Code of Conduct

Be respectful, inclusive, and constructive. Harassment of any kind will not be tolerated.

## How to Contribute

1. **Fork the repository** and clone your fork locally.
2. **Create a feature branch** from `main`: `feat/my-feature` or `fix/my-fix`.
3. **Make your changes** — follow the conventions in `CLAUDE.md`.
4. **Write tests** for any new functionality.
5. **Run lint and type-check**: `bun run lint && bun run typecheck`.
6. **Commit** with a clear, descriptive message.
7. **Push** and open a pull request against `main`.

## Pull Request Guidelines

- One focused change per PR
- PR title should summarize the change
- PR body should include: what changed, why, and how to test
- Link any related issues

## Development Setup

```bash
# Install dependencies
bun install

# Start all apps in development
bun run dev

# Run lint and type-check
bun run lint
bun run typecheck
```

## Project Structure

- `apps/web` — Main trading application (Next.js)
- `apps/landing` — Marketing landing page (Next.js, static export)
- `packages/shared` — Shared types, utilities, and constants
- `docs/` — Documentation

## License

By contributing, you agree that your contributions will be licensed under the GNU AGPL v3.0.
