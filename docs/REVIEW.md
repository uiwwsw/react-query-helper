# Repository Review for 2.0.0

Review baseline: published 1.3.0, commit 270fa82. Compatibility target: the npm
stable TanStack Query 5.102.8 release, React 18/19, Node 22/24.

The latest baseline publish workflow succeeded. Older failed workflow logs have
expired (GitHub returned HTTP 410), so their exact causes are not reconstructed
from speculation.

## Findings and Resolution

| Priority | Observed problem in 1.3.0                                                 | Resolution                                                                | Verification                                               |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| P1       | Init references missing plugin files and assumes an application alias     | Minimal executable starter config                                         | Init/generate/check installed-package test                 |
| P1       | Query/infinite share a cache key despite different data shapes            | Distinct kind segments and grouped arguments                              | Actual QueryClient caches and collision regression         |
| P1       | Files in the same folder can share a function key                         | Include the filename in path-style prefixes                               | Generator regression                                       |
| P1       | Array-valued mutation variables are spread as multiple arguments          | Single variable by default; explicit multi-argument mapping               | Array/default/optional/rest tests                          |
| P1       | Infinite return types claim a page instead of InfiniteData                | Correct data/pageParam generics and selection                             | Runtime pagination and compile-time type tests             |
| P1       | Generated imports can reference private/default exports incorrectly       | Export-aware metadata, alias/default handling, reject private imports     | Generated TypeScript compilation                           |
| P1       | Output under source can be ingested recursively                           | Exclude output; reject destructive path overlaps and symlink destinations | Nested-output and symlink tests                            |
| P1       | File generation catches errors but exits successfully                     | Fail batches before writes and return nonzero status                      | Broken config/source/plugin tests                          |
| P2       | QueryClient policy is overridden by infinite cache and stale times        | Delegate defaults to TanStack/QueryClient                                 | QueryClient default policy test                            |
| P2       | Result annotations discard select/cache-key/error inference               | Official options helpers and portable public return types                 | select, initialData, suspense, data-tag and Register tests |
| P2       | Custom callbacks omit newer context fields                                | Forward full query/mutation context                                       | Cancellation and optimistic rollback tests                 |
| P2       | Synchronous API errors escape promise wrapping                            | Async wrappers convert throws to rejection                                | Runtime failure tests                                      |
| P2       | Optional/rest/overload metadata produces invalid mutations                | Optional properties, tuple mode, one overload implementation              | Generated-code compilation                                 |
| P2       | Config loader has shallow checks and fragile TS/CommonJS loading          | Validated configuration and Jiti module loading                           | Six config formats and relative imports                    |
| P2       | Ignore globs mishandle root-level double-star matches                     | Standard glob matcher                                                     | Root/nested ignore tests                                   |
| P2       | Empty artifacts silently enable all artifacts                             | Honor empty arrays; add function-specific overrides                       | Generator regression                                       |
| P2       | Removed sources/exports leave stale output                                | Prune files bearing this generator's matching ownership header            | Delete/private-export/watch tests                          |
| P2       | Concurrent watch callbacks can write obsolete output                      | Serialized generation with debouncing and recovery                        | Watch recovery test                                        |
| P2       | Build/test require unavailable Bun; lockfiles disagree                    | Node/esbuild plus one npm lockfile                                        | Clean npm ci/test/packed install                           |
| P2       | Publish has no test gate or tag/version check                             | CI matrix and gated publish with provenance                               | CI and installed-package checks                            |
| P3       | README describes hooks/EJS, wrong Node baseline and dev-only installation | Rewrite bilingual docs, examples and migration guide                      | Consumer tests for documented core flows                   |
| P3       | Obsolete scripts, fs placeholder and ambient Bun types add noise          | Remove unused files/dependencies                                          | Build/type checks                                          |

## Intentional Boundaries

The regular type suite and installed-package NodeNext check enable declaration
checking. The separate Register augmentation suite uses skipLibCheck because
TanStack Query 5.102.8's own queriesObserver declarations instantiate a broad key
that conflicts with a narrowed application Register. It still checks all consumer
calls and expected errors against this package's exposed types.

These are documented constraints, not claims of universal TypeScript analysis:

- HTTP semantics cannot be deduced reliably from function names; override artifact selection.
- Re-export barrels, methods and higher-order factory results require explicit wrappers or custom analysis.
- Generic relationships and all overload variants are not preserved by every option factory; specialize API functions where needed.
- Watch does not recursively discover imported configuration dependencies. Restart for those changes.
- File writes are atomic individually; generation is not a directory-wide filesystem transaction.
- Legacy unmarked generated files require manual migration. Ownership is not inferred from filenames.
- Generated TypeScript uses bundler module resolution; direct execution as Node ESM is outside its scope.
- Pagination cursors, request cancellation, secret-free cache keys, and mutation invalidation depend on the consuming API and must be configured explicitly.
- A successful workflow dispatch or tag push is not proof of npm publication. The release must be checked in Actions and the registry.
