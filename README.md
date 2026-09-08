<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero-dark.svg" />
    <img src="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero.svg" alt="React Query Helper: Your API. Query-ready. TypeScript in, reusable options out." width="1120" />
  </picture>
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  API 함수는 그대로. 반복되는 쿼리 설정은 생성하세요.<br />
  TypeScript 함수에서 TanStack Query v5의 타입 안전한 옵션 팩토리를 만듭니다.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/v/%40uiwwsw%2Freact-query-helper?style=flat-square&amp;label=npm&amp;color=133c35" alt="Published npm version" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/actions/workflows/ci.yml"><img src="https://github.com/uiwwsw/react-query-helper/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status on main" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-f38466?style=flat-square" alt="MIT license" /></a>
</p>

<p align="center">
  <a href="#quick-start">빠른 시작</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md">설정과 예제</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#1x에서-이전">1.x에서 이전</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/README_EN.md">English</a>
</p>

> **버전 안내:** 이 문서는 저장소 `main`의 **2.x** 기준입니다. 현재 npm에는 **1.3.0**이 게시되어 있고, 2.0.0은 게시 권한 설정을 기다리고 있습니다. [1.3.0 문서](https://github.com/uiwwsw/react-query-helper/blob/v1.3.0/README.md)를 보거나 [소스에서 2.x를 설치](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#npm-게시-전-소스에서-설치하기)하세요.

## 무엇을 줄여주나요?

같은 API를 컴포넌트, prefetch, 캐시 조회에서 사용할 때 반복되는 키와 옵션 구성을 줄입니다.
**훅이나 HTTP 클라이언트를 새로 만들지 않습니다.** 기존 API 함수와 TanStack Query를 그대로 사용합니다.

| 직접 관리하던 것           | 생성 후                                                   |
| -------------------------- | --------------------------------------------------------- |
| 곳곳에 흩어진 쿼리 키      | 파일 경로·함수명·인자를 반영한 키                         |
| 같은 요청을 위한 반복 옵션 | `useQuery`, `useSuspenseQuery`, fetch/prefetch에서 재사용 |
| API와 별도로 유지하는 타입 | 인자·응답·`select`·캐시 데이터 타입 추론                  |
| API 변경 후 생성 파일 정리 | watch 재생성, 오래된 소유 파일 정리, CI의 `--check`       |

기본 캐싱 정책과 재시도는 TanStack Query/`QueryClient`를 따릅니다.
이름 기반 생성 규칙은 [설정으로 재정의](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#생성-규칙)할 수 있습니다.

<a id="quick-start"></a>

## 빠른 시작

### 1. 설치하고 초기화

**아래 npm 설치 명령은 2.x 게시 후 사용합니다.** 지금 확인하려면 위의 소스 설치 경로로
패키지를 설치한 뒤 `init`부터 진행하세요.

```sh
npm install @uiwwsw/react-query-helper@^2 @tanstack/react-query react
npx @uiwwsw/react-query-helper init
```

생성 코드가 이 패키지를 import하므로 `-D`가 아닌 일반 dependency로 설치합니다.
React와 TanStack Query가 이미 설치되어 있다면 필요한 의존성만 추가하세요.

### 2. API 경로 지정

`init`이 만든 `rqh.config.ts`의 경로를 앱 구조에 맞춥니다.
별도 플러그인이나 alias 설정 없이 시작할 수 있습니다.

```ts
// rqh.config.ts
import type { AutoQueryConfig } from "@uiwwsw/react-query-helper/config";

export default {
  sourceDir: "./libs",
  outputDir: "./src/options",
  ignoredFiles: ["domain.ts", "adaptor.ts", "**/*.test.ts", "**/*.spec.ts"],
  template: { artifactStrategy: "smart" },
} satisfies AutoQueryConfig;
```

실제 API 함수를 해당 디렉토리에 두세요. 아래는 흐름을 확인하기 위한 간단한 예시입니다.

```ts
// libs/users/api.ts
export const getUser = async (id: string) => ({ id, name: "Ada" });
```

### 3. 생성하고 사용

```sh
npx @uiwwsw/react-query-helper generate
```

`src/options/users/apiOptions.ts`에 `getUserKey`, `getUserQueryOption`,
`getUserInfiniteQueryOption`이 생성됩니다. **생성 파일 대신 원본 API를 수정하세요.**
무한 쿼리 팩토리도 생성되지만 실제 페이지네이션 설정은 API에 맞게 별도로 지정합니다.

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

앱 상위에 `QueryClientProvider`가 필요합니다. 위의 `user.data`는 `select`에 따라
`string`으로 추론됩니다. 옵션은 훅 바깥에서도 재사용할 수 있습니다.

```ts
// 기존 QueryClient 인스턴스 client에서
await client.prefetchQuery(getUserQueryOption("u1"));
const cached = client.getQueryData(getUserQueryOption("u1").queryKey);
// { id: string; name: string } | undefined
```

### 4. 개발 흐름에 연결

```json
{
  "scripts": {
    "query:generate": "react-query-helper generate",
    "query:watch": "react-query-helper watch",
    "query:check": "react-query-helper generate --check"
  }
}
```

개발할 때는 `npm run query:watch`, 앱 CI에서는 `npm run query:check`를 실행하세요.
check는 파일을 수정하지 않고 누락·변경·오래된 결과를 발견하면 종료 코드 1을 반환합니다.
생성물을 커밋하지 않는 프로젝트라면 CI에서 `query:generate` 후 앱 타입 검사를 실행하세요.

## 필요한 예제 찾기

| 하고 싶은 일                        | 가이드                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 설정 파일, 경로, ignore glob 변경   | [설정](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#설정)                           |
| 함수별 query/mutation 생성 제어     | [생성 규칙과 캐시 키](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#생성-규칙)       |
| mutation 인자, 취소, 옵션 확장      | [런타임 옵션](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#런타임-옵션)             |
| 커서 페이지네이션과 `maxPages`      | [무한 쿼리](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#무한-쿼리)                 |
| 기존 1.x 프로젝트 업그레이드        | [마이그레이션 체크리스트](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#1x에서-이전) |
| 지원하지 않는 문법, 커스텀 플러그인 | [지원 범위와 확장](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#범위와-확장)        |
| 테스트, 로컬 설치, npm 배포 설정    | [개발과 배포](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE.md#개발과-배포)             |
| 이번 개선의 근거와 남은 한계        | [저장소 검토 기록](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REVIEW.md)                       |

## 지원 환경과 주의점

| 구분           | 지원 기준                                          |
| -------------- | -------------------------------------------------- |
| Node.js        | CLI/빌드에 22 이상, CI는 22/24                     |
| React          | 18/19                                              |
| TanStack Query | `>=5.102.8 <6`                                     |
| TypeScript     | 5.8 이상, 생성 코드는 TS 번들러용                  |
| 브라우저       | 루트 import는 브라우저용, Node 도구는 별도 subpath |

- **2.x는 호환성을 깨는 변경입니다.** 기존 생성 파일을 옮긴 뒤 재생성하고, 수동 키와 persisted cache를 마이그레이션하세요.
- API 인자는 캐시 키에 포함됩니다. 직렬화 가능한 값만 전달하고 토큰·인증 헤더는 넣지 마세요.
- 페이지네이션과 요청 취소는 자동 추측하지 않습니다. 커서 매핑과 `AbortSignal` 전달은 API에 맞춰 설정하세요.
- 최상위 함수가 기본 대상입니다. re-export barrel, 메서드, 모든 generic/overload 관계를 처리하는 범용 TypeScript 변환기는 아닙니다.

[변경 이력](https://github.com/uiwwsw/react-query-helper/blob/main/CHANGELOG.md) · [로고와 브랜드 자산](https://github.com/uiwwsw/react-query-helper/blob/main/assets/README.md) · [MIT License](https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE)

독립적인 커뮤니티 도구이며 React 또는 TanStack의 공식 프로젝트가 아닙니다.
