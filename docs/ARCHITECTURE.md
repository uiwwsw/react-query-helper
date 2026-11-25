# 구성과 의존성

[README로 돌아가기](../README.md) · [English](ARCHITECTURE_EN.md) · [설정과 사용 가이드](REFERENCE.md)

이 문서는 2.x 소스를 읽고 정리한 내용입니다. 각 모듈이 하는 일, 의존하는 패키지, TanStack Query와 비슷한 도구와의 관계를 적었습니다.

[동작 흐름](#동작-흐름) · [소스 모듈](#소스-모듈) · [저장소의 나머지 파일](#저장소의-나머지-파일) · [의존성](#의존성) · [TanStack Query와의 관계](#tanstack-query와의-관계) · [비슷한 도구](#비슷한-도구) · [다른 도구가 나은 경우](#다른-도구가-나은-경우)

## 동작 흐름

```text
API 소스 파일(.ts/.tsx)
  → core/analyzer   TypeScript 파서로 최상위 함수 목록(FunctionInfo[]) 추출
  → core/generator  함수 목록을 *Options.ts 소스 문자열로 변환
  → cli             prettier로 포맷, 소유 표시 헤더 추가, 파일 쓰기와 오래된 파일 정리
  → 앱이 *Options.ts를 import
  → utils/query     queryOption 등이 TanStack Query의 queryOptions 등을 호출
```

이 패키지는 두 부분으로 나뉩니다. 개발 중에 Node에서 실행되는 생성기(CLI, 분석기, 생성기, 설정 로더)와, 생성된 코드가 앱에서 import하는 런타임 헬퍼(`src/utils/query.ts`)입니다.
앱 번들에 들어가는 것은 런타임 헬퍼뿐이며, 이 헬퍼가 import하는 외부 패키지는 `@tanstack/react-query` 하나입니다.

## 소스 모듈

`src/`와 `libs/`의 모든 파일입니다.

| 파일                    | 하는 일                                                                                                                                                                             | 외부 노출                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/index.ts`          | 패키지 루트 진입점. `utils/query.ts`의 내보내기와 `AutoQueryConfig` 타입을 다시 내보냅니다                                                                                          | `.` (루트 import)                                       |
| `src/utils/query.ts`    | 런타임 헬퍼 `queryOption`, `mutationOption`, `infiniteOption`과 관련 타입. 아래에 자세히 적었습니다                                                                                 | `.`                                                     |
| `src/config.ts`         | `AutoQueryConfig` 인터페이스. 타입만 있어서 빌드 결과(`dist/config.js`)는 비어 있습니다                                                                                             | `./config`                                              |
| `src/config-loader.ts`  | `rqh.config.*` 파일을 현재 디렉터리에서 위로 올라가며 찾고, jiti로 읽고, 옵션 이름과 값을 검증하고, 기본값을 채우고, 경로를 절대 경로로 바꿉니다. 사용자 플러그인 로드에도 쓰입니다 | 없음 (빌드는 되지만 `exports`에 없고, CLI가 사용합니다) |
| `src/core/analyzer.ts`  | TypeScript 컴파일러 API로 파일 하나를 파싱해 함수 정보를 추출합니다                                                                                                                 | `./core/analyzer`                                       |
| `src/core/generator.ts` | 함수 정보를 받아 `*Options.ts` 소스 문자열을 만듭니다                                                                                                                               | `./core/generator`                                      |
| `src/cli.ts`            | `react-query-helper` 명령. `init`, `generate`, `generate --check`, `watch`를 처리합니다                                                                                             | `bin`                                                   |
| `libs/users/api.ts`     | 이 저장소에서 `npm run generate`를 시험하기 위한 예시 API 파일. `rqh.config.ts`가 `./libs`를 가리킵니다. 배포 패키지에는 들어가지 않습니다                                          | 없음                                                    |

### `core/analyzer.ts`

파일 하나를 `ts.createSourceFile`로 파싱합니다. 타입 검사나 `ts.Program` 생성은 하지 않으므로 인자와 반환 타입은 읽지 않습니다. 읽는 것은 구문입니다.

- 최상위 `function` 선언, `const f = () => ...`와 `const f = function () {}`
- `export`가 붙은 선언, `export { a as b }`, `export default`
- 괄호, `as`, `satisfies`, `!`로 감싼 함수 표현식
- 매개변수 이름, 선택 여부(`?` 또는 기본값), 나머지 매개변수 위치, `async` 키워드

`declare` 선언, 본문 없는 오버로드 시그니처, `export =`(CommonJS)는 지원하지 않거나 건너뜁니다. 파싱 오류가 있으면 생성이 실패합니다.
`analyzer` 설정(`exportFilter`, `functionMatchMode`, `includeNames`, `excludeNames`)은 여기서 적용됩니다.

### `core/generator.ts`

문자열 템플릿으로 코드를 만드는 순수 함수 `generateOptionsCode`와, TypeScript 스캐너로 식별자가 유효한지 확인하는 `validIdentifier`가 있습니다.

- 어떤 결과물을 만들지(query, mutation, infinite)는 `artifactStrategy: "smart"`일 때 함수 이름의 접두사로 정합니다. `create`, `update`, `delete` 등은 mutation, `get`, `list`, `fetch` 등은 query와 infinite, 그 밖의 이름은 query와 mutation입니다. HTTP 의미나 반환 타입은 보지 않는 이름 규칙입니다.
- 키 상수 `<함수명>Key`를 `[...디렉터리, 파일명, 함수명] as const` 형태로 내보냅니다. `keyStyle`로 접두사를 줄일 수 있습니다.
- 인자가 둘 이상인 함수의 mutation은 변수 객체 타입과 `mapVariablesToArgs`를 함께 생성합니다. 나머지 매개변수가 있으면 `variablesMode: "tuple"`을 사용합니다.
- 비공개 함수 import, 잘못된 식별자, 중복 이름은 오류로 처리합니다.

### `utils/query.ts`

앱에서 실제로 실행되는 유일한 코드입니다. 세 함수가 모두 같은 모양입니다. 키와 API 함수를 받아 팩토리를 돌려주고, 팩토리는 TanStack Query의 헬퍼를 호출해 옵션 객체를 만듭니다.

| 함수             | 호출하는 TanStack 헬퍼 | 키 구성                                    |
| ---------------- | ---------------------- | ------------------------------------------ |
| `queryOption`    | `queryOptions`         | `[...접두사, "query", 인자배열]`           |
| `infiniteOption` | `infiniteQueryOptions` | `[...접두사, "infinite", 인자배열]`        |
| `mutationOption` | `mutationOptions`      | `[...접두사]` (`appendMutationKey`로 확장) |

이 파일이 추가하는 것은 세 가지입니다. 호출 인자를 키에 넣는 규칙, `withOptions`로 TanStack 옵션을 덮어쓰는 방법(`args`, `mapArgs`, `appendQueryKey`, `pageParamToArgs`, `mapVariablesToArgs` 등), 그리고 이를 위한 타입입니다.
`QueryClient`, 캐시, 재시도, 훅은 포함하지 않습니다.

### `cli.ts`

`generate`는 다음 순서로 동작합니다.

1. `sourceDir`가 존재하는 디렉터리인지, `outputDir`가 `sourceDir`를 포함하지 않는지 확인합니다.
2. `customAnalyzerPath`, `customTemplatePath`가 있으면 jiti로 로드해 `analyzeFile`, `generateOptionsCode` 함수가 있는지 확인합니다.
3. `sourceDir`를 재귀 탐색합니다. 심볼릭 링크, `node_modules`, `.git`, 출력 디렉터리, `ignoredFiles` glob(picomatch)에 걸리는 경로는 건너뜁니다.
4. 파일마다 분석기와 생성기를 호출하고, 결과를 prettier로 포맷합니다(프로젝트의 prettier 설정을 사용합니다).
5. 결과 앞에 `// Generated by @uiwwsw/react-query-helper. DO NOT EDIT.`로 시작하는 소유 표시 헤더를 붙입니다.
6. 기존 파일과 비교합니다. 헤더가 없는 기존 파일은 덮어쓰지 않고 오류를 냅니다. 헤더가 있는데 더 이상 생성 대상이 아닌 파일은 오래된 파일로 보고 삭제합니다.
7. `--check`이면 쓰지 않고 차이가 있을 때 오류로 종료합니다. 아니면 임시 파일에 쓴 뒤 `rename`으로 교체합니다.

`watch`는 chokidar로 `sourceDir`, 설정 파일, 직접 지정한 플러그인 파일을 감시합니다. 변경이 생기면 100ms 지연 후 설정을 다시 읽고 `generate`를 한 번에 하나씩 실행합니다.
`init`은 `rqh.config.ts` 시작 템플릿을 만들고 기존 파일은 덮어쓰지 않습니다.

## 저장소의 나머지 파일

| 위치                         | 역할                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `scripts/build.mjs`          | `tsc`로 타입 선언만 내보내고, esbuild로 `dist/`를 번들합니다. 외부 패키지는 번들에 넣지 않습니다                |
| `scripts/smoke.mjs`          | `npm pack` 결과를 임시 프로젝트에 설치해 `init`/`generate`/`--check`, NodeNext 타입, 브라우저 번들을 확인합니다 |
| `scripts/verify-release.mjs` | 게시 워크플로에서 태그와 `package.json` 버전이 같은지 확인합니다                                                |
| `scripts/build-site.mjs`     | 실제 분석기와 생성기로 예제 출력을 만들어 한국어·영어 데모 페이지를 생성합니다                                  |
| `scripts/check-site.mjs`     | 생성된 데모 페이지의 canonical, hreflang, sitemap, 폰트 등을 검사합니다                                         |
| `test/`                      | Node 테스트 러너와 `tsc` 타입 테스트. README 예제를 실제로 생성하고 타입 검사합니다                             |
| `site/`                      | 데모 페이지의 예제 입력(`examples.ts`), 스타일, 스크립트, 정적 자산                                             |
| `assets/`                    | 로고와 README 배너 SVG                                                                                          |
| `docs/`                      | 이 문서, 설정 가이드(`REFERENCE*.md`), 검토 기록(`REVIEW.md`), 데모 배포 메모(`SEO.md`)                         |
| `.github/`                   | CI, 게시, 문서 위생 검사 워크플로와 검사 스크립트                                                               |
| `vercel.json`, `.workspace/` | 데모 사이트 배포 설정                                                                                           |

npm 패키지에 들어가는 것은 `dist/`, `README_EN.md`, `CHANGELOG.md`이고, npm이 `README.md`, `LICENSE`, `package.json`을 자동으로 포함합니다(`package.json`의 `files` 기준).

## 의존성

### peer dependency

| 패키지                  | 범위       | 쓰는 곳                                                                                                                                          |
| ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@tanstack/react-query` | `^5.102.8` | `utils/query.ts`가 `queryOptions`, `infiniteQueryOptions`, `mutationOptions`와 여러 타입을 import합니다. 앱과 같은 복사본을 쓰도록 peer로 둡니다 |

React는 이 패키지가 직접 import하지 않습니다. React 18/19 지원 범위는 `@tanstack/react-query`의 peer 조건을 따릅니다.

### dependencies (CLI와 생성기가 사용)

모두 Node에서 실행되는 생성기 쪽에서만 import됩니다. 빌드된 루트 진입점(`dist/index.js`)은 이 중 어느 것도 import하지 않습니다.

| 패키지       | 하는 일                              | 쓰는 파일                               | 이 패키지에서의 이유                                                    |
| ------------ | ------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------- |
| `typescript` | TypeScript 컴파일러 API              | `core/analyzer.ts`, `core/generator.ts` | 소스 파싱과 식별자 검증. 직접 파서를 만들지 않고 공식 파서를 사용합니다 |
| `jiti`       | TS/ESM/CJS 파일을 런타임에 직접 로드 | `config-loader.ts`                      | `rqh.config.ts`와 사용자 플러그인을 별도 빌드 없이 읽기 위해            |
| `picomatch`  | glob 패턴 매처                       | `cli.ts`                                | `ignoredFiles` 해석                                                     |
| `prettier`   | 코드 포맷터                          | `cli.ts`                                | 생성 파일을 앱의 prettier 설정에 맞춰 포맷                              |
| `chokidar`   | 파일 시스템 감시                     | `cli.ts`                                | `watch` 명령                                                            |

### devDependencies (저장소 개발용)

`esbuild`(번들), `typescript`(선언 생성과 테스트), `@tanstack/react-query`·`react`·`@types/react`(테스트에서 실제 `QueryClient`와 훅 타입 사용), `@types/node`, `@types/picomatch`. 게시되는 패키지에는 포함되지 않습니다.

Node 22 이상이 필요합니다(`engines`).

## TanStack Query와의 관계

이 패키지는 [TanStack Query](https://tanstack.com/query)가 제공하는 옵션 헬퍼를 호출하는 코드 생성 도구입니다. 역할은 다음과 같이 나뉩니다.

| TanStack Query의 것                                                                                                                                                                                                                                                                                                                                                                                              | 이 패키지가 직접 만든 것                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 캐시, 재시도, 리페치, `QueryClient`, 훅. 옵션 팩토리 개념인 [`queryOptions`](https://tanstack.com/query/latest/docs/framework/react/reference/queryOptions), [`infiniteQueryOptions`](https://tanstack.com/query/latest/docs/framework/react/reference/infiniteQueryOptions), [`mutationOptions`](https://tanstack.com/query/latest/docs/framework/react/reference/mutationOptions)와 그 타입 추론, `DataTag` 등 | TS 소스에서 함수를 읽어 옵션 팩토리 파일을 생성하는 CLI(`generate`, `watch`, `--check`)           |
| 옵션 객체를 한곳에 모으는 방식 자체. 공식 가이드에서 [Query Options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)로 설명합니다                                                                                                                                                                                                                                                   | 파일 경로, 함수명, 인자로 쿼리 키를 만드는 규칙과 함수 이름 접두사로 query/mutation을 고르는 규칙 |
|                                                                                                                                                                                                                                                                                                                                                                                                                  | 생성 파일의 소유 헤더, 오래된 파일 정리, 덮어쓰기 거부                                            |
|                                                                                                                                                                                                                                                                                                                                                                                                                  | `withOptions`의 인자 덮어쓰기 옵션과 다중 인자 mutation 변수 매핑                                 |

`queryOptions`로 직접 옵션을 쓰는 것과 결과는 같은 종류입니다. 이 패키지는 그 코드를 함수마다 손으로 쓰는 수고를 줄일 뿐이고, 성능이나 캐시 동작은 바꾸지 않습니다.

## 비슷한 도구

아래 설명은 각 프로젝트의 npm 설명과 README를 2026년 11월에 확인한 내용이며, 기능은 버전에 따라 달라질 수 있습니다. 이 패키지와 직접 비교한 성능이나 정확도 측정은 없습니다.

| 도구                                                                                                              | 입력과 출력                                                                                                                    | 이 패키지와 다른 점                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory)                                | 쿼리 키를 타입 안전하게 정의하는 런타임 라이브러리. 키 구조를 손으로 선언합니다                                                | 코드를 생성하지 않습니다. 이 패키지는 키를 파일 경로와 함수명에서 자동으로 만듭니다                        |
| [Orval](https://orval.dev) ([GitHub](https://github.com/orval-labs/orval))                                        | OpenAPI v3/Swagger v2 명세에서 TypeScript 클라이언트를 생성합니다. React Query 등을 대상으로 한 예제가 있습니다                | 입력이 OpenAPI 명세입니다. 이 패키지는 이미 있는 TS 함수를 입력으로 받고 HTTP 클라이언트를 만들지 않습니다 |
| [openapi-typescript](https://openapi-ts.dev) / [openapi-react-query](https://openapi-ts.dev/openapi-react-query/) | OpenAPI 스키마에서 TS 타입을 만들고, `openapi-fetch`와 함께 쓰는 TanStack Query 래퍼를 제공합니다                              | 스키마 기반입니다. 이 패키지는 스키마 없이 TS 소스만 읽습니다                                              |
| [Kubb](https://kubb.dev) (`@kubb/plugin-react-query`)                                                             | OpenAPI 명세에서 operation마다 `useQuery`, `useMutation`, `useInfiniteQuery` 훅을 생성하는 플러그인(공식 README 기준)          | 명세 기반이고 훅을 생성합니다. 이 패키지는 훅이 아니라 옵션 팩토리를 생성합니다                            |
| [Hey API](https://heyapi.dev) (`@hey-api/openapi-ts`)                                                             | OpenAPI에서 SDK 등을 생성하는 도구. [TanStack Query 플러그인](https://heyapi.dev/openapi-ts/plugins/tanstack-query)이 있습니다 | 명세 기반입니다. 이 패키지는 명세 없이 동작하며 지원 범위가 훨씬 좁습니다                                  |

## 다른 도구가 나은 경우

- **OpenAPI 명세가 있고 서버 API가 명세로 관리된다면** Orval, Kubb, Hey API, openapi-react-query 같은 명세 기반 도구가 맞습니다. 명세에서 타입과 클라이언트까지 얻을 수 있습니다. 이 패키지는 OpenAPI를 읽지 않습니다.
- **쿼리가 몇 개뿐이라면** `queryOptions`를 직접 쓰는 편이 더 단순합니다. 생성 도구와 설정 파일, CI 검사를 추가할 만큼 반복이 많지 않습니다.
- **키 구조를 직접 설계하고 싶다면** `@lukemorales/query-key-factory` 같은 키 라이브러리가 적합합니다. 이 패키지의 키는 규칙이 고정되어 있고(`keyStyle` 세 가지) 설정으로 바꿀 수 있는 범위가 좁습니다.
- **훅까지 생성하고 싶다면** 위의 훅 생성 도구를 보세요. 이 패키지는 `useQuery`에 넘길 옵션만 생성합니다.
- **클래스 메서드, re-export barrel, 복잡한 제네릭/오버로드 API라면** 분석기가 지원하지 않습니다. 자세한 범위는 [범위와 확장](REFERENCE.md#범위와-확장)을 보세요.
- **함수 이름이 `get`/`create` 같은 접두사 규칙을 따르지 않는다면** 자동 분류가 맞지 않으므로 `artifactsByName`으로 함수마다 지정해야 합니다.

[MIT License](../LICENSE)
