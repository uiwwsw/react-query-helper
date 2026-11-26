<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero-dark.svg" />
    <img src="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero.svg" alt="React Query Helper logo" width="1120" />
  </picture>
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  TypeScript API 함수 파일에서 쿼리 키와 TanStack Query v5 옵션 팩토리(<code>queryOptions</code>, <code>infiniteQueryOptions</code>, <code>mutationOptions</code> 호출 코드)를 생성하는 CLI와 런타임 헬퍼입니다.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/v/@uiwwsw/react-query-helper?style=flat-square" alt="npm 버전" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@uiwwsw/react-query-helper?style=flat-square" alt="라이선스" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/uiwwsw/react-query-helper/ci.yml?branch=main&amp;style=flat-square&amp;label=CI" alt="main 브랜치 CI 상태" /></a>
  <a href="https://tanstack.com/query"><img src="https://img.shields.io/npm/dependency-version/@uiwwsw/react-query-helper/peer/@tanstack/react-query?style=flat-square&amp;label=TanStack%20Query" alt="TanStack Query peer 의존성 범위" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/node/v/@uiwwsw/react-query-helper?style=flat-square" alt="Node.js 요구 버전" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/types/@uiwwsw/react-query-helper?style=flat-square" alt="포함된 TypeScript 타입" /></a>
</p>

<p align="center">
  <a href="https://react-query-helper.vercel.app/">데모</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/docs/ARCHITECTURE.md">구성과 의존성</a> ·
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper">npm</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/CHANGELOG.md">변경 이력</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/README_EN.md">English</a>
</p>

> **버전 안내:** 이 문서는 **2.x** 기준입니다. 실제 게시 버전은 위 npm 배지에서 확인하세요. 1.x를 사용 중이라면 [1.3.0 문서](https://github.com/uiwwsw/react-query-helper/blob/v1.3.0/README.md)와 [마이그레이션 가이드](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#1x에서-이전)를 참고하세요. 아직 게시되지 않은 변경은 [소스에서 설치](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#npm-게시-전-소스에서-설치하기)할 수 있습니다.

이미 쓰고 있는 TypeScript API 함수를 그대로 두고, CLI가 그 함수에서 쿼리 키와 TanStack Query v5 옵션 팩토리(`queryOptions`, `infiniteQueryOptions`, `mutationOptions`)를 자동으로 생성합니다. API 코드는 한 줄도 바꾸지 않고, OpenAPI 명세도 필요 없습니다.

## 다른 도구와 다른 점

- **API 코드를 건드리지 않습니다.** 생성 파일은 `outputDir`에 따로 만들어지고 원본 API 함수를 import만 합니다. 인증 헤더, 인터셉터, 에러 처리를 넣어 둔 기존 `fetch`·axios 래퍼를 그대로 씁니다. [Orval](https://orval.dev), [Kubb](https://kubb.dev), [Hey API](https://heyapi.dev)는 OpenAPI 명세에서 API 함수 자체를 생성하므로, 손으로 쓴 API 함수가 생성된 함수로 대체됩니다(fetch 인스턴스는 직접 지정할 수 있습니다).
- **명세 없이 TypeScript 함수만으로 동작합니다.** 백엔드가 OpenAPI 명세를 제공하지 않는 프로젝트에서도 씁니다.
- **키를 손으로 선언하지 않습니다.** [`@lukemorales/query-key-factory`](https://github.com/lukemorales/query-key-factory)는 키 구조를 직접 작성해야 하지만, 이 도구는 파일 경로와 함수명으로 키를 만들고 옵션 팩토리까지 생성합니다.
- **타입이 원본 함수에서 그대로 추론됩니다.** 인자, 반환값, `select` 결과 타입을 따로 선언하지 않습니다.
- **API가 바뀌면 따라갑니다.** `watch`가 다시 생성하고, `generate --check`는 CI에서 오래된 생성 파일을 잡아냅니다.

## 지금 되는 것

- `generate`: `sourceDir`의 최상위 함수마다 키 상수와 query, infinite query, mutation 옵션 팩토리를 `*Options.ts`로 생성합니다.
- 키는 소스 경로의 디렉토리, 파일명, 함수명으로 만듭니다.
- 함수 이름 접두사(`get`, `list`, `create` 등)로 생성 종류를 고릅니다. 설정으로 바꿀 수 있습니다.
- 인자가 둘 이상인 함수의 mutation에 변수 객체 타입과 `mapVariablesToArgs`를 생성합니다.
- `withOptions`로 `staleTime`, `select` 등을 덮어쓰고, 인자·반환·`select` 결과 타입이 추론됩니다.
- `generate --check`: 파일을 쓰지 않고 누락·변경·오래된 결과가 있으면 종료 코드 1을 반환합니다.
- `watch`: 소스, 설정 파일, 지정한 로컬 플러그인이 바뀌면 다시 생성합니다.
- 생성 파일 첫 줄의 소유 표시로 구분해, 표시 없는 기존 파일은 덮어쓰지 않고 오류로 처리합니다.
- `customAnalyzerPath`, `customTemplatePath`로 분석기와 템플릿을 교체할 수 있습니다.

## 아직 안 되는 것 / 진행 예정

- OpenAPI, Swagger 등 명세 파일 읽기.
- 훅 생성. `useQuery` 등은 TanStack Query의 것을 직접 호출합니다.
- HTTP 클라이언트 생성. 기존 API 함수를 그대로 호출합니다.
- React 외 클라이언트(Vue, Svelte, Solid 등). TanStack Query v5 React만 대상입니다.
- 목(mock) 생성.
- 페이지네이션 커서와 `AbortSignal` 전달의 자동 추측. API마다 직접 설정합니다.
- re-export barrel, 클래스·객체 메서드, 고차 함수가 반환한 함수 분석.
- 모든 generic/overload 관계를 옵션 팩토리 타입으로 보존하는 변환.
- 함수 이름만으로 HTTP 의미를 판단하는 것. 접두사 규칙에 맞지 않으면 `artifactsByName`으로 지정합니다.
- `watch`가 설정이 import하는 외부 파일의 변경을 감지하는 것. 재시작이 필요합니다.
- 디렉토리 전체 단위의 트랜잭션. 파일 단위로만 원자적으로 씁니다.
- 생성 파일을 Node ESM에서 직접 실행하는 것. TS 번들러용입니다.
- 표시 없는 1.x 생성 파일의 자동 이전. 수동으로 옮겨야 합니다.

<a id="quick-start"></a>

## 설치와 사용

```sh
npm install @uiwwsw/react-query-helper@^2 @tanstack/react-query react
npx @uiwwsw/react-query-helper init
```

생성 코드가 이 패키지를 import하므로 일반 dependency로 설치합니다(`-D` 사용 금지).

```ts
// rqh.config.ts
import type { AutoQueryConfig } from "@uiwwsw/react-query-helper/config";

export default {
  sourceDir: "./libs",
  outputDir: "./src/options",
  template: { artifactStrategy: "smart" },
} satisfies AutoQueryConfig;
```

```ts
// libs/users/api.ts
export const getUser = async (id: string) => ({ id, name: "Ada" });
```

`npx @uiwwsw/react-query-helper generate`를 실행하면 `src/options/users/apiOptions.ts`가 생성됩니다.

```ts
// Generated by @uiwwsw/react-query-helper. DO NOT EDIT.
// Source root: "../../libs"
import { getUser } from "../../../libs/users/api";
import {
  queryOption as __rqh_query,
  infiniteOption as __rqh_infinite,
} from "@uiwwsw/react-query-helper";

export const getUserKey = ["users", "api", "getUser"] as const;
export const getUserQueryOption = __rqh_query(getUserKey, getUser);
export const getUserInfiniteQueryOption = __rqh_infinite(getUserKey, getUser);
```

생성 파일은 수정하지 않습니다. 고칠 때는 원본 API를 수정합니다. 사용:

```tsx
// src/UserName.tsx
import { useQuery } from "@tanstack/react-query";
import { getUserQueryOption } from "./options/users/apiOptions";

export function UserName({ id }: { id: string }) {
  const user = useQuery(
    getUserQueryOption.withOptions(
      { staleTime: 60_000, select: (data) => data.name },
      id,
    ),
  );

  if (user.isPending) return <p>Loading...</p>;
  if (user.isError) return <p>{user.error.message}</p>;
  return <p>{user.data}</p>;
}
```

```ts
// 기존 QueryClient 인스턴스 client에서
await client.prefetchQuery(getUserQueryOption("u1"));
const cached = client.getQueryData(getUserQueryOption("u1").queryKey);
// { id: string; name: string } | undefined
```

API 인자는 캐시 키에 포함됩니다. 토큰이나 인증 헤더를 인자로 넘기지 마세요.

## 문서

- [설정과 사용 가이드](docs/REFERENCE.md): CLI, 설정, 생성 규칙, 런타임 옵션, 무한 쿼리, 1.x 이전
- [README에서 옮긴 상세](docs/GUIDE.md): 전체 기능 목록, 설치 단계별 설명, 예제 찾기 표, 지원 환경, 의존성, 데모
- [구성과 의존성](docs/ARCHITECTURE.md): 모듈 구조, 비슷한 도구와의 비교
- [저장소 검토 기록](docs/REVIEW.md) · [변경 이력](CHANGELOG.md) · [데모](https://react-query-helper.vercel.app/)

## 라이선스

[MIT License](LICENSE)
