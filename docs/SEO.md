# React Query Helper web deployment and SEO

Public origin: https://react-query-helper.vercel.app/. Korean `/`, English `/en/`. The library repository remains https://github.com/uiwwsw/react-query-helper and the npm package is @uiwwsw/react-query-helper.

`npm run build:site` builds the actual library, then generates static translated HTML and sample output using analyzeFile and generateOptionsCode. The browser selector switches among query, mutation and infinite-query examples generated from site/examples.ts; no fake backend or arbitrary code execution is involved. Package tests remain independent of the demo.

Both pages provide descriptive titles, content, canonical URLs, reciprocal ko/en/x-default links, SoftwareApplication structured data, robots.txt and sitemap.xml. Keyword themes match TanStack Query v5 code generation, typed query keys, TypeScript APIs, query/mutation/infinite-query factories, watch and CI checks. API clients, caching and retries remain the application’s responsibility.

## CI/CD

GitHub CI tests the supported Node/React matrix and validates the bilingual site. Vercel Git integration builds production from main and previews for other branches/PRs. The Vercel build runs npm test before npm run build:site, so failing package tests prevent publishing that build. A failed deployment keeps the preceding production deployment. No repository-stored bearer token is necessary for native Git integration. npm publishing is a separate release process.

Local checks: npm test, npm run build:site, node scripts/check-site.mjs. Use the workspace devctl exec wrapper. Check public health and both languages after deployment. Site ownership and sitemap submission do not guarantee search indexing/ranking.

## 2026-10-20 production verification

Published Korean and English pages, sitemap and Google verification file return HTTP 200. Google Search Console ownership verification and sitemap submission completed. Naver ownership verification and sitemap submission completed on 2026-10-20 after the user completed the anti-bot CAPTCHA. Site-specific submission status must not be described as indexing completion.

Runtime source baseline: a62c761. GitHub description, homepage and relevant repository topics were updated.
Vercel native Git production deployment of a62c761 reached READY. GitHub CI run 39371254752 succeeded. Public selector switched to the actual generated createUser mutation factory. Desktop and mobile HTML verified; no new personal token was created.
