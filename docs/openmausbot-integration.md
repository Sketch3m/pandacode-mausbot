# OpenMausBot integration: PandaCode native runtime

This is a fork of [PandaCode](https://github.com/aicodeking/pandacode), experimenting with selected [OpenMausBot](https://github.com/milind-soni/OpenMausBot) features **without** embedding OpenMausBot's Electron desktop, React UI, Node server or full runtime.

## Implemented

The Bots → New bot screen has **Import OpenMausBot team (.json)**.
Choose an OpenMausBot JSON package v2 file (format openmaus.package, version 2), review the confirmation, then import.

- Each package agent becomes a native PandaCode bot using a locally installed coding harness and its default model, separate workspace, **Ask** permissions and disabled heartbeat.
- Identity, role, agent description, team brief, personality and text from referenced playbooks are mapped to native bot fields.
- Each package room becomes a native PandaCode shared channel with the imported agents as members.
- The parser is data-only, capped at 1 MB per file, 32 agents/rooms and native bot text limits.
- Packages do **not** set models, full-access permissions, MCP servers, API credentials, connected apps, scheduled routines, memory, external executable skills, cloud machines, browsers or command grants.
- Imports require manual confirmation and never delete existing bots.

## Limitations

- The current OpenMausBot user-facing **BotMRR Markdown v2 bot.md / team.md folder** export is **not yet supported**. Its YAML parser, skillFiles, pictures, metadata and manifest cross-references require additional validation and an import UI. JSON package v2 is supported first.
- Import is not transactional: if a native bot/channel creation fails partway through, earlier creations remain. Inspect and remove partial entries before retrying. Name conflicts are checked against visible bots, but simultaneous imports and room conflicts still need handling.
- Routines, connected apps, skills, attachments, portable team templates, cloud and voice features are **not migrated**; PandaCode's existing native equivalents keep their behavior.
- Imported instructions are untrusted data; inspect the source and review bots before giving them permissions or enabling schedules. Do not import secrets.
- No measured native desktop RAM, startup, throughput or latency comparison has yet been performed. A successful type check or parser test is **not** an end-to-end desktop benchmark.

## Architecture choice

Retain PandaCode's Tauri/Rust/SQLite runtime, model routing, existing native bot gateway, approval guard, scheduling and UI. Add strictly scoped compatibility adapters at its data boundary. Do not import competing process managers, chat backends, browser runtimes or Electron/Chromium.

Both projects already implement bot identities, memory, schedules and multi-bot collaboration. Duplicating all these systems increases binary size, contention and failure surfaces. Reusing PandaCode does not make an absolute speed guarantee; performance must be measured.

## Validation

- Node 24 remote sandbox: 3/3 importer parser/mapping/safety tests passed November 21, 2026.
- Real upstream fixture validation: OpenMausBot's shared/package-fixtures/full-team.v2.json mapped Sales desk to three native bot definitions (Morgan, Scout, Quill) and Deal desk.
- Parser microbenchmark (Node 24, 1,000 iterations each, remote CPU): 1 agent median 0.0036 ms / p95 0.0052 ms; 8 agents median 0.0167 ms / p95 0.0373 ms; 32 agents median 0.0625 ms / p95 0.112 ms. Microbenchmark excludes file I/O, database writes, IPC and model execution. Run node scripts/mausbot-import-benchmark.mjs to reproduce.
- Full TypeScript type checking: pnpm exec tsc --noEmit passed (remote pnpm installed dependencies with lifecycle scripts disabled).
- Full node --test tests/*.test.mjs first requires dist/ built, because tests/bundle.test.mjs reads dist/index.html. Those build-dependent tests have **not been validated**.
- Vite production build exceeded a remote execution time limit; no compiled desktop binary or end-to-end feature verification is claimed.

On a supported developer machine, use: npm ci; npm run build; npm test; npm run test:rust; npm run desktop. Tauri native development also needs the platform Rust/toolchain and system libraries.

## Performance acceptance plan

Measure upstream PandaCode against this fork on the same CPU, OS, memory constraints, harness, model, token load and agent workload. Run the same scripted workload at least five times, include warm and cold starts, and report spread.

| Metric | Guardrail |
|---|---|
| Idle RSS, launch-to-ready, binary size | Fork no worse than upstream by >5% without documented benefit |
| UI responsiveness p50/p95, Rust-to-UI IPC | No meaningful regression |
| Bot creation and import | Measure 1/8/32 agent imports, bounded parsing |
| 1/4/8 active agents throughput and latency | Same model/backend/token caps; isolate app overhead |
| Runtime safety | Permissions, paused schedules, secret leakage, malformed and duplicate packages |
| Reliability | Crash, cancellation, restart, partial import and channel recovery |

Do not report improved tokens/s unless a model/decoding harness actually changed and was measured.

## Next milestones

1. Import BotMRR Markdown v2 manifest folders with YAML parsing and strict filename/file-size allowlists, secure skill-file handling, trust preview and transactional rollback or undo.
2. Preserve team lead/department role mapping, routines (disabled until manually enabled) and selected lightweight app triggers through existing PandaCode APIs.
3. Port voice/call or mobile features only where required and behind optional feature flags; no second resident server.
4. Run full CI, native desktop smoke tests and reproducible performance comparisons.

## Attribution and licensing

This is a fork of PandaCode: [aicodeking/pandacode](https://github.com/aicodeking/pandacode). Respect its [PandaCode License](../LICENSE) and attribution requirement. OpenMausBot upstream: [milind-soni/OpenMausBot](https://github.com/milind-soni/OpenMausBot), Apache-2.0 for its open-source project; verify individual files and exclude proprietary/enterprise code before any source copy. The current adapter implements compatibility mapping rather than copying Electron code.
