# 0001: Three layers, public client, private data

Status: Accepted (Lars, 2026-11-14)

## Context

The game is for Lars, family and friends. Not commercial. The code can be public; personal cards cannot.

## Decision

- **Client:** a static site in a public GitHub repo, served by GitHub Pages.
- **Data:** a database behind a small API, hosted privately. The host is decided in ADR 0007.
- **Infrastructure:** GitHub Actions builds, tests and deploys.

## Consequences

- Nothing secret can live in the client or the repo. Any key shipped to a browser is readable by anyone, so access control happens on the server (ADR 0003).
- The client needs a bundled fixture deck so it can be built, tested and previewed before the backend exists.
