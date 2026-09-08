# Changelog

## 2.0.1

The v2.0.0 tag was not published to npm. This release includes all of the 2.0.0
changes below, including the breaking changes for applications upgrading from 1.x.

- Simplify Korean/English onboarding and move detailed configuration and recipes into reference guides.
- Introduce the Q symbol, light/dark README banners, and documented brand assets.
- Add regression tests for documentation links, SVG assets, and generated/typechecked README examples.
- Refresh release guidance and source-install examples for 2.0.1.

## 2.0.0

### Breaking Changes

- Require TanStack Query >=5.102.8 <6. Node 22 remains the minimum CLI runtime.
- Generated path keys now include filenames. Query/infinite keys use separate kind segments and nested argument tuples. Invalidate persisted 1.x caches and update manually constructed keys.
- Remove forced infinite cache/stale times and disabled focus refetching. QueryClient defaults now apply.
- Single-array mutation payloads are passed intact. Direct multi-argument helpers require an explicit mapper or tuple mode.
- Refuse to overwrite output without this generator's ownership marker. Move legacy generated files aside and regenerate.
- Built-in generation rejects private imports, invalid identifiers, duplicate names and invalid configuration.

### Fixed

- Starter configs no longer reference missing plugins or assume an application alias.
- Correct InfiniteData, pageParam, select, default error, cache data-tag and optimistic rollback inference.
- Forward query/mutation context, including QueryClient and AbortSignal, to custom callbacks.
- Convert synchronous callback failures to rejected promises.
- Support default/local alias exports, skip ambient declarations and duplicate overload signatures.
- Preserve optional multi-argument mutation fields and handle rest/destructured parameters using tuples.
- Include source filenames in cache prefixes and avoid unused/colliding helper imports.
- Honor empty artifact lists and provide per-function artifact selection.
- Load TypeScript/CommonJS configs and plugins with relative imports through Jiti; validate options and plugin contracts.
- Exclude output directories from source scans; support standard ignore globs; detect symlink and output collisions.
- Reconcile only owned stale files after a successful analysis, avoid unchanged writes, serialize watch passes and recover after errors.
- Wait for watcher readiness and reconcile startup edits before announcing that watch is active.
- Report generation failures with nonzero exit codes; add explicit config selection and read-only output checks.

### Maintenance

- Replace the Bun-only build with a Node/esbuild build; preserve a browser-safe runtime and NodeNext-compatible declarations.
- Use one npm lockfile; remove obsolete scripts, the fs placeholder dependency and Bun ambient types.
- Add runtime, CLI, emitted-code, type-inference and installed-package tests.
- Add Node 22/24 CI and pre-publish tests, consumer checks, tag/version validation and provenance.
- Rewrite Korean/English documentation with usage, limitations and migration steps.
