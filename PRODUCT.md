# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

API developers and product teams designing, previewing, testing, and collaborating on OpenAPI specifications in the browser.

## Product Purpose

Modern API Studio provides a visual workflow for creating API definitions, converting formats, previewing documentation, testing endpoints, and sharing workspaces.

## Operating Context

Users work in a dense desktop editor for long sessions, with a project dashboard, endpoint navigation, schema controls, preview panels, and collaboration tools.

## Capabilities and Constraints

- React and Vite frontend in a pnpm monorepo.
- Supabase authentication, persistence, and realtime collaboration.
- Existing editor behavior remains unchanged during incremental UI refactoring.
- The component lab is available directly at `/lab` without authentication.

## Brand Commitments

- Keep the existing dark purple editor character.
- Adapt Bitech's professional blue, teal, spacing, typography, and component discipline to the dark product UI.
- Product name remains Modern API Studio.

## Evidence on Hand

- Existing frontend implementation under `apps/client/src`.
- Bitech reference system at `D:/bitech-project/bi-agent/DESIGN.md` and its `src/components/ui` primitives.

## Product Principles

- Optimize for scanability and long-session comfort.
- Make reusable primitives accessible and consistent before migrating screens.
- Preserve working product behavior during visual refactors.
- Keep technical data and API methods immediately distinguishable.
