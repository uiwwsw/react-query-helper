# 설정과 사용 가이드

[README로 돌아가기](../README.md) · [English](REFERENCE_EN.md) · [변경 이력](../CHANGELOG.md)

2.x 기준 상세 문서입니다. 처음 사용한다면 [빠른 시작](../README.md#quick-start)을 먼저 읽으세요.

[CLI](#cli) · [설정](#설정) · [생성 규칙](#생성-규칙) · [런타임 옵션](#런타임-옵션) · [무한 쿼리](#무한-쿼리) · [1.x 이전](#1x에서-이전)

## CLI

| 명령                             | 동작                                                                 |
| -------------------------------- | -------------------------------------------------------------------- |
| `init`                           | 현재 디렉토리에 기본 설정 생성. 기존 설정은 덮어쓰지 않음            |
| `generate`                       | 전체 분석, 변경 파일 갱신, 더 이상 필요하지 않은 소유 생성 파일 정리 |
| `generate --check`               | 파일을 변경하지 않고 최신 상태 검사. 차이가 있으면 종료 코드 1       |
| `watch`                          | 최초 생성 후 소스와 설정, 지정한 로컬 플러그인 파일 변경 감시        |
| `--config ./tools/rqh.config.ts` | 설정 파일 명시 지정. 경로 기준은 해당 설정의 디렉토리                |
| `help`                           | 사용법 출력                                                          |

`--init`, `--generate`, `--watch`, `--help` 별칭도 지원합니다.
잘못된 옵션, 설정, 플러그인, 입력 소스 또는 생성 실패는 종료 코드 1입니다.
watch 중 오류가 발생하면 이전 결과를 유지하고 다음 저장 시 다시 시도합니다.

```json
{
  "scripts": {
    "query:generate": "react-query-helper generate",
    "query:watch": "react-query-helper watch",
    "query:check": "react-query-helper generate --check"
  }
}
```

## 설정

`rqh.config.ts/mts/cts/js/mjs/cjs`를 지원합니다. 현재 디렉토리부터 상위로 탐색하고
첫 설정 디렉토리에 여러 후보가 있으면 오류를 냅니다. 명시한 설정을 읽을 수 없거나
값이 잘못되면 기본 경로로 우회하지 않습니다. 설정이 아예 없으면 `./libs → ./src/options`가 기본입니다.

TypeScript 설정과 플러그인의 로컬 import는 Jiti로 로드합니다. ESM은 default export,
CommonJS는 `module.exports`를 사용하세요. 설정/플러그인은 개발 시 실행되는 코드이므로
신뢰할 수 있는 파일만 지정하세요.

| 옵션                 | 기본값 / 설명                                                                      |
| -------------------- | ---------------------------------------------------------------------------------- |
| `sourceDir`          | `./libs`. 실제 존재하는 API 디렉토리                                               |
| `outputDir`          | `./src/options`. sourceDir와 동일하거나 상위 디렉토리일 수 없음                    |
| `ignoredFiles`       | `["domain.ts", "adaptor.ts"]`. 파일명 또는 glob. init은 테스트 파일 패턴도 추가    |
| `sourceImportAlias`  | 기본은 상대경로. `@/api` 등을 지정하면 앱의 tsconfig/번들러에도 같은 alias가 필요  |
| `templateDir`        | `@uiwwsw/react-query-helper`. 헬퍼 import 모듈/상대경로이며 EJS 템플릿 폴더가 아님 |
| `analyzer`           | export/async 키워드/함수 이름 필터                                                 |
| `template`           | 아티팩트 종류, 함수별 생성 규칙, 이름, 키 스타일                                   |
| `customAnalyzerPath` | `analyzeFile(filePath, config)`를 export하는 로컬 파일 또는 패키지                 |
| `customTemplatePath` | `generateOptionsCode(params)`를 export하는 로컬 파일 또는 패키지                   |

`node_modules`, `.git`, 출력 디렉토리, 선언 파일은 입력에서 제외됩니다.
소스 내부에 outputDir를 두어도 출력물을 다시 분석하지 않습니다.
심볼릭 링크를 따라 입력을 탐색하지 않습니다. 생성 목적지 내부의 심볼릭 링크도 거부합니다.

## 생성 규칙

기본 분석 대상은 `.ts/.tsx`의 최상위 함수 선언, 화살표 함수, 함수 표현식입니다.
default export, 로컬 `export { fn as alias }`, 함수 오버로드의 구현부,
`as`/`satisfies`로 감싼 함수도 처리합니다. 내부 함수와 `declare` 선언은 기본 제외됩니다.

`artifactStrategy: "smart"`는 **이름 기반 휴리스틱**입니다. HTTP 메서드나 API 의미를 분석하지 않습니다.

| 이름                                                    | 생성             |
| ------------------------------------------------------- | ---------------- |
| `getUser`, `listUsers`, `fetchItems` 등 조회 접두어     | query + infinite |
| `createUser`, `updateUser`, `deleteUser` 등 변경 접두어 | mutation         |
| 그 외                                                   | query + mutation |

```ts
import type { AutoQueryConfig } from "@uiwwsw/react-query-helper/config";

export default {
  sourceDir: "./libs",
  outputDir: "./src/options",
  template: {
    enabledArtifacts: ["query", "mutation", "infinite"],
    artifactsByName: { getUser: ["query"], listUsers: ["infinite"] },
    artifactStrategy: "smart", // "all"이면 활성화된 종류를 모두 생성
    keyStyle: "path",
  },
  analyzer: {
    exportFilter: "exported-only",
    functionMatchMode: "all", // async-only / sync-only는 async 키워드 기준
    excludeNames: ["debugHelper"],
  },
} satisfies AutoQueryConfig;
```

`enabledArtifacts: []`는 생성을 끕니다. 이름 필터는 export된 이름 기준입니다.
`importNames`, `outputNames`로 헬퍼 이름/결과 접미사를 바꿀 수 있습니다.
중복 이름이나 유효하지 않은 식별자는 오류로 처리합니다.

### 캐시 키

기본 키는 전체 소스 상대경로의 디렉토리, 파일명, 함수명을 포함합니다.
예를 들어 `users/api.ts#getUser`의 prefix는 `["users", "api", "getUser"]`입니다.
쿼리는 `[...prefix, "query", args]`, 무한 쿼리는 `[...prefix, "infinite", args]`를 사용합니다.
mutation은 prefix를 사용합니다. `file-only`/`function-only`는 경로 구분을 줄이므로
서로 다른 파일에서 같은 이름을 쓰는 프로젝트에서는 충돌을 주의하세요.

## 런타임 옵션

`.withOptions(options, ...args)`는 query/infinite 설정을, mutation의
`.withOptions(options)`는 mutation 설정을 조합합니다. `select`, `enabled`,
`staleTime: "static"`, `meta`, `scope`, `networkMode`, `onMutate` 등의
TanStack Query 옵션을 전달할 수 있습니다. optimistic rollback의 반환 타입도 유지됩니다.

이 패키지는 `gcTime: Infinity`, 무조건적인 `staleTime: Infinity`,
`refetchOnWindowFocus: false`를 강제하지 않습니다. `QueryClient`의 기본 설정을 따릅니다.

### 요청 취소

일반 API 인자에 AbortSignal을 임의 삽입하지 않습니다. 취소를 지원하려면
아래처럼 queryFn override에서 signal을 실제 요청까지 전달하세요.
client, meta 등 TanStack의 context도 함께 제공됩니다.

```ts
import { queryOption } from "@uiwwsw/react-query-helper";

const getUser = (id: string, signal?: AbortSignal) =>
  fetch("/api/users/" + id, { signal }).then((r) => {
    if (!r.ok) throw new Error("Request failed");
    return r.json() as Promise<{ id: string; name: string }>;
  });

const userOptions = queryOption(["user"], getUser);
const options = userOptions.withOptions(
  {
    queryFn: ({ args: [id], signal }) => getUser(id, signal),
  },
  "u1",
);
```

`args`/`mapArgs`로 바꾼 인자는 캐시 키에도 반영됩니다.
인자에는 직렬화 가능한 데이터만 쓰고, 인증 토큰/헤더는 캐시 키에 넣지 마세요.
요청 안에서 주입하거나 명시적인 `queryKey`로 안전한 사용자/tenant 식별자를 사용하세요.
`queryKey` override는 자동 namespace까지 전부 교체하므로 query/infinite 구분도 호출부 책임입니다.

### 생성된 mutation 사용

다중 인자 API 함수는 호출부에서 이름 있는 객체로 전달할 수 있습니다.
다음 함수를 `libs/users/api.ts`에 추가하고 다시 생성하세요.

```ts
export const updateUser = async (id: string, body?: { name: string }) => ({
  id,
  name: body?.name ?? "Ada",
});
```

```tsx
// src/RenameUser.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserKey,
  updateUserMutationOption,
} from "./options/users/apiOptions";

export function RenameUser({ id }: { id: string }) {
  const client = useQueryClient();
  const update = useMutation(
    updateUserMutationOption.withOptions({
      onSuccess: () => client.invalidateQueries({ queryKey: getUserKey }),
    }),
  );

  return (
    <button
      disabled={update.isPending}
      onClick={() => update.mutate({ id, body: { name: "Grace" } })}
    >
      Rename
    </button>
  );
}
```

`getUserKey`는 해당 함수의 모든 인자에 매칭되는 prefix입니다.
특정 사용자의 일반 쿼리만 갱신하려면 `getUserQueryOption(id).queryKey`를 사용하세요.
invalidate는 자동으로 추가되지 않으며 앱의 데이터 관계에 맞춰 지정해야 합니다.

### 헬퍼를 직접 사용하는 mutation

단일 배열 mutation 인자는 그대로 배열 하나로 전달됩니다.
다중 인자의 생성 팩토리는 이름 있는 객체를 받고, optional 인자는 optional 속성이 됩니다.
구조 분해/나머지 인자는 tuple로 전달합니다. 헬퍼를 직접 호출할 때는 명시적으로 지정합니다.

```ts
import { mutationOption } from "@uiwwsw/react-query-helper";

const saveMany = mutationOption(["saveMany"], (ids: string[]) => ids.length);
const update = mutationOption(
  ["update"],
  (id: string, name: string) => ({ id, name }),
  { variablesMode: "tuple" },
);
// useMutation(saveMany()).mutate(["u1", "u2"])
// useMutation(update()).mutate(["u1", "Ada"])
```

## 무한 쿼리

`initialPageParam`, `getNextPageParam`, 요청 인자 매핑을 API에 맞춰 지정하세요.
무한 쿼리 데이터 타입은 `InfiniteData<Page, PageParam>`이며 `select`도 추론됩니다.
기본 호출은 첫 페이지만 요청하고 종료하며 페이지네이션을 추측하지 않습니다.

```ts
import { infiniteOption } from "@uiwwsw/react-query-helper";

const listUsers = async (params: { page: number }) => ({
  items: [{ id: String(params.page) }],
  nextPage: params.page < 3 ? params.page + 1 : undefined,
});
const listOptions = infiniteOption(["users"], listUsers);

const options = listOptions.withOptions(
  {
    initialPageParam: 0,
    pageParamToArgs: (page, [params]) => [{ ...params, page }],
    getNextPageParam: (lastPage) => lastPage.nextPage,
    maxPages: 3,
  },
  { page: 0 },
);
// useInfiniteQuery(options).data?.pages
```

종료 시 `undefined` 또는 `null`을 반환하세요. `0`도 유효한 커서입니다.
양방향 페이지 이동과 `maxPages`를 함께 쓰면 `getPreviousPageParam`도 설계하세요.

## 범위와 확장

- re-export barrel, 클래스 메서드, 객체 메서드, 고차 함수가 반환한 함수는 기본 분석 대상이 아닙니다.
- generic/오버로드를 메타데이터로 읽을 수 있지만 호출별 generic 관계/모든 overload를 옵션 팩토리 타입으로 보존하지는 않습니다. 구체적 API wrapper 또는 custom template을 사용하세요.
- `exportFilter: "all"`은 custom analyzer/template용입니다. 기본 생성기는 private 함수를 import할 수 없어 오류를 냅니다.
- watch는 소스, 설정 파일, 직접 지정한 로컬 플러그인을 감시합니다. 설정이 import하는 외부 파일이나 패키지 변경, 최초 설정 파일 추가 후에는 watch를 다시 시작하세요.
- 생성 코드는 TS 번들러용 extensionless import를 사용하며 `index` 경로는 폴더 import로 축약됩니다. 생성 파일을 Node ESM에서 직접 실행하는 용도는 아닙니다.
- 파일 갱신은 파일별 atomic write입니다. 전체 디렉토리가 하나의 트랜잭션은 아닙니다. 쓰기 전 분석/충돌 검증이 실패하면 기존 결과를 보존합니다.

custom template은 `functionInfos`, `importPath`, `keySegments`(디렉토리만),
`fileName`, `templateImportPath`, `config`를 받으며 문자열을 반환해야 합니다.
custom analyzer는 `name`, `parameters`, `isAsync`, `isExported`가 있는 배열을 반환합니다.
`importName`, `optionalParameters`, `restParameterIndex`도 제공할 수 있습니다.

## 1.x에서 이전

1. Node 22 이상과 TanStack Query 5.102.8 이상을 준비하고 패키지 2.x를 설치합니다.
2. 이전 생성 파일을 별도 보관한 뒤 다시 생성합니다. 2.x는 소유 표식 없는 파일을 덮어쓰지 않습니다.
3. 캐시 키가 변경되므로 기존 persisted cache를 비우거나 persistence buster를 올립니다. 수동 queryKey 참조도 바꿉니다.
4. 무한 캐싱/포커스 재조회 금지가 필요하다면 QueryClient 기본값에 명시합니다.
5. 직접 만든 다중 인자 mutation은 mapper 또는 `variablesMode: "tuple"`을 지정합니다. 단일 배열은 더 이상 펼쳐지지 않습니다.
6. 생성된 코드와 앱의 타입 검사를 실행합니다.

## 개발과 배포

```sh
npm ci
npm test
npm run smoke
```

테스트는 런타임, 생성 결과 타입, 설정 형식, 실패 종료, watch, 실제 npm tarball 설치,
브라우저 번들 및 NodeNext 타입을 검사합니다. 기존 레거시 Bun 잠금 파일은 제거했고
`package-lock.json`을 기준으로 재현합니다.

`main`/PR에서는 CI 검증만 실행합니다. 배포는 package.json과 일치하는 `vX.Y.Z` 태그를
push하거나 해당 태그에서 수동 실행합니다. 검증/테스트/패키지 설치 검사 후 공개 npm에 provenance와 함께 게시합니다.

```sh
npm version major  # 릴리즈 종류에 맞게 major/minor/patch 선택
git push origin main --follow-tags
```

저장소의 `NPM_TOKEN`에는 게시 권한이 있는 유효한 npm 토큰이 필요합니다.
npm에서 이 워크플로의 trusted publisher를 설정한 경우 OIDC 게시도 사용할 수 있습니다.
이미 게시한 버전은 재게시할 수 없으므로 변경 시 새 버전을 사용하세요.

### npm 게시 전 소스에서 설치하기

현재 `main`의 2.x 기능을 먼저 확인하려면 별도 디렉토리에서 패키지를 빌드하세요.
태그나 GitHub Actions 실행만으로 npm 게시가 완료된 것은 아닙니다.

```sh
git clone https://github.com/uiwwsw/react-query-helper.git
cd react-query-helper
npm ci
npm test
npm pack
```

생성된 `uiwwsw-react-query-helper-2.0.1.tgz`의 실제 경로를 사용해 **앱 디렉토리에서**
`npm install /absolute/path/to/uiwwsw-react-query-helper-2.0.1.tgz`를 실행합니다.
React와 TanStack Query도 앱에 설치한 뒤 README의 `init` 단계부터 진행하세요.
`npm pack`은 prepack 빌드를 실행하므로 배포에 필요한 dist도 포함됩니다.

### 배포 권한과 재시도

권장 방식은 npm 패키지 Settings의 **Trusted Publisher**에 아래 항목을 등록하는 것입니다.
현재 워크플로는 Node 24와 `id-token: write`를 사용하므로 OIDC 게시를 지원합니다.

| 항목                 | 값                                 |
| -------------------- | ---------------------------------- |
| Provider             | GitHub Actions                     |
| Organization or user | `uiwwsw`                           |
| Repository           | `react-query-helper`               |
| Workflow filename    | `publish.yml`                      |
| Environment          | 비워두기                           |
| Allowed actions      | 직접 게시하려면 `npm publish` 허용 |

이 설정은 npm 패키지 소유자의 인증이 필요합니다. 토큰이나 2FA 코드를 이슈/로그에 넣지 마세요.
기존 토큰 방식을 쓴다면 GitHub Actions secret `NPM_TOKEN`에 패키지 게시 권한이 있는
유효한 토큰을 설정해야 합니다. `npm publish`의 E404는 인증/접근 권한 문제일 수도 있으므로
패키지 이름만 바꾸거나 반복 push하는 방식으로 해결하지 마세요.

권한을 수정하고 **해당 버전이 npm에 아직 없을 때만** 같은 태그의 실패한 게시 작업을
재실행할 수 있습니다. 이미 게시된 버전의 코드를 바꾸려면 새 버전과 새 태그가 필요합니다.
태그를 이동하거나 force-push하지 마세요.

## 공식 참고 자료

- [Query Options와 타입 추론](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)
- [Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [Query Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
- [Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

[MIT License](../LICENSE)
