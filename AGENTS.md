# Isolated task repository

- Work only in this repository. Never access or modify LifeOS or other formal projects.
- Use the current Codex process only. Do not delegate to other agents or invoke paid model services.
- Implement the supplied task, write meaningful automated tests, and run `npm test` plus `npm run build`.
- Keep the project dependency-free. Use browser APIs and Node's built-in test runner.
- Do not edit `.github/`, `AGENTS.md`, or `scripts/build.mjs`.
- Do not perform network calls, Git pushes, merges, releases, credential changes, or package installation. The trusted delivery bridge handles Git delivery.
- Read UTF-8 task/context files with Node. For non-ASCII output, prefer JSON with escaped Unicode rather than legacy PowerShell decoding.
- Finish with a factual summary and test results. Do not claim remote commits or PRs; those are verified after your process exits.
