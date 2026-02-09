# Project Guidelines

## Code Style
- Use TypeScript for all source code (see `packages/*/src/`).
- Formatting is enforced via Prettier and Nx (`pnpm nx format:write`).
- Import sorting is handled by `@trivago/prettier-plugin-sort-imports`.
- Linting is managed by ESLint with Angular and Nx plugins (see `eslint.config.mjs_PLAN`).
- Example: see `packages/common/src/index.ts` for idiomatic exports and imports.

## Architecture
- Nx monorepo structure: all libraries/packages are under `packages/`.
- Each package is an independent Angular library or utility, with its own `project.json`, `ng-package.json`, and `tsconfig.json`.
- Shared utilities live in `packages/common`.
- Build artifacts are output to `dist/packages/*`.

## Build and Test
- Install: `pnpm install`
- Build all libs: `pnpm build:libs` or `pnpm nx run-many -t build --projects=packages/*`
- Test all: `pnpm nx run-many -t test`
- Format: `pnpm nx format:write`
- Release: `pnpm release` (see root `package.json` for release workflow)

## Project Conventions
- Use `nx` CLI for all build, test, and code generation tasks.
- Prefer named exports in all modules.
- Keep package dependencies in sync using `syncpack` (see `pnpm before:release:syncpack`).
- All packages should have their own `README.md` and `package.json`.
- Use `ng-packagr` for Angular package builds.

## Integration Points
- Angular (v20.x) is the primary framework.
- Storybook is used for UI component development (see `@storybook/*` dependencies).
- Nx plugins: `@nx/angular`, `@nx/workspace`, etc.
- Peer dependencies: see root and package-level `package.json` for required external libs.

## Security
- No secrets or credentials should be committed.
- Release tokens are referenced via environment variables (see `release-it` config in root `package.json`).
- Publishing is handled via `pnpm release:publish` and requires OTP for npm.
