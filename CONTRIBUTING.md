# Contributing to SAM

Build from a fresh checkout using the commands in the [README](README.md). Keep changes focused and describe what you changed and which checks passed.

For bug reports, include the SAM version, Windows version, steps to reproduce, and visible error. Screenshots with fictional or redacted account details are welcome. Keep account stores, cookies, passwords, authentication tickets, private server links, and personal paths out of issues and pull requests.

Run the checks relevant to your change.

```powershell
pnpm run test:background-recovery
pnpm run test:quiet-launch
pnpm run test:game-library
pnpm run test:badge-dates
pnpm run build:portable
```
