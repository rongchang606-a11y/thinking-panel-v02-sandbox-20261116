# Thinking Panel V0.2 isolated sandbox

This repository contains disposable development test code only. It is not LifeOS or any production project.

The baseline is a minimal dependency-free Web scaffold. Actual features and tests are implemented by the background Codex task on `automation/task-*` branches.

`npm test` runs Node's built-in test runner; `npm run build` creates a static Web build.

The trusted delivery workflow tests task branches and opens or updates a PR after successful CI. Acceptance in Thinking Panel records the exact commit; no automatic merge or production release is performed.
