<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/logo.svg" alt="React Query Helper Logo" width="160" />
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  <a href="README_EN.md">🇺🇸 English</a> · <strong>🇰🇷 한국어</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/v/@uiwwsw/react-query-helper.svg?color=2563eb" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/dm/@uiwwsw/react-query-helper.svg?color=9333ea" alt="npm downloads" /></a>
  <a href="https://bundlephobia.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/bundlephobia/minzip/@uiwwsw/react-query-helper.svg?color=10b981" alt="bundle size" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981.svg" alt="license" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/types/@uiwwsw/react-query-helper.svg?color=3178c6" alt="types" /></a>
</p>
<p align="center">
  <a href="https://github.com/uiwwsw/react-query-helper"><img src="https://img.shields.io/github/stars/uiwwsw/react-query-helper?style=social" alt="github stars" /></a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0-000000.svg?logo=node.js" alt="node version" />
  <img src="https://img.shields.io/badge/Bun-ready-f97316.svg?logo=bun" alt="bun ready" />
</p>

> React Query Helper는 TypeScript API 함수로부터 React Query 훅과 옵션 객체를 자동 생성해 주는 CLI 도구입니다. 설정만 해두면 반복적인 훅 작성 시간을 절약하고 프로젝트 전체에 걸쳐 일관된 데이터 패칭 규칙을 유지할 수 있습니다.

기본적으로 각 파일의 `export`된 함수만 생성 대상으로 분석합니다.

---

## 목차

- [주요 특징](#주요-특징)
- [빠른 시작](#빠른-시작)
  - [설치](#설치)
  - [초기 설정 파일 생성](#초기-설정-파일-생성)
  - [코드 생성 실행](#코드-생성-실행)
- [CLI 명령어](#cli-명령어)
- [설정 옵션](#설정-옵션)
- [생성 결과 예시](#생성-결과-예시)
- [헬퍼 경로 커스터마이징](#헬퍼-경로-커스터마이징)
- [베스트 프랙티스](#베스트-프랙티스)
- [스타 히스토리](#스타-히스토리)
- [기여](#기여)
- [라이선스](#라이선스)

## 주요 특징

- **설정 기반 자동화**: `rqh.config.ts`만 구성하면 API 디렉토리 감지부터 출력 디렉토리 지정까지 모두 자동화됩니다.
- **초기화 지원**: `react-query-helper --init`으로 기본 설정 파일을 바로 생성할 수 있습니다.
- **Watch & Generate 모드**: 개발 중 실시간 감시(`--watch`), 초기 세팅이나 재생성 시 일괄 생성(`--generate`)을 모두 지원합니다.
- **일관된 옵션 관리**: `queryOption`, `mutationOption`, `infiniteOption` 유틸리티로 전역 캐싱 전략과 에러 핸들링을 통일할 수 있습니다.
- **Prettier 통합**: 생성된 파일은 자동으로 포맷팅되어 코드 리뷰 시 불필요한 변경을 줄입니다.
- **헬퍼 import 경로 커스터마이징**: `templateDir`로 생성 코드가 참조할 헬퍼 모듈 경로를 바꿀 수 있습니다.
- **보수적인 infinite 기본값**: `infiniteOption`은 안전한 기본 옵션만 제공하고, 실제 `pageParam` 처리 규칙은 호출부에서 override 하도록 설계되어 있습니다.

## 빠른 시작

### 설치

```bash
bun add @uiwwsw/react-query-helper
# 또는
npm install --save-dev @uiwwsw/react-query-helper
```

### 초기 설정 파일 생성

설치 후 아래 명령으로 루트에 `rqh.config.ts`를 자동 생성할 수 있습니다.

```bash
npx @uiwwsw/react-query-helper --init
# 또는
bunx @uiwwsw/react-query-helper --init
```

이미 프로젝트에 설치한 뒤라면 아래처럼 실행해도 됩니다.

```bash
npx react-query-helper --init
# 또는
npm exec react-query-helper -- --init
```

생성되는 파일 예시는 다음과 같습니다.

```ts
// rqh.config.ts
import type { AutoQueryConfig } from "@uiwwsw/react-query-helper";

const config: AutoQueryConfig = {
  sourceDir: "./libs",        // API 함수들이 위치한 경로
  outputDir: "./src/options", // 생성된 코드가 저장될 경로
  ignoredFiles: ["domain.ts", "adaptor.ts"],
  templateDir: "@uiwwsw/react-query-helper",
  sourceImportAlias: "@/libs",
  analyzer: {
    exportFilter: "exported-only",
    functionMatchMode: "all",
    includeNames: [],
    excludeNames: [],
  },
  template: {
    enabledArtifacts: ["query", "mutation", "infinite"],
    keyStyle: "path",
  },
};

export default config;
```

### 코드 생성 실행

`package.json`에 스크립트를 추가한 뒤 CLI를 실행하면 됩니다.

```jsonc
// package.json
{
  "scripts": {
    "init:rqh": "react-query-helper --init",
    "watch": "react-query-helper --watch",
    "generate": "react-query-helper --generate"
  }
}
```

```bash
bun run watch      # 실시간 변경 감지
bun run generate   # 전체 파일 일괄 생성
# 또는
npm exec react-query-helper -- --generate
```

## CLI 명령어

| 명령어 | 설명 |
| --- | --- |
| `react-query-helper --init` | 루트에 기본 `rqh.config.ts` 파일을 생성합니다. 이미 있으면 덮어쓰지 않습니다. |
| `react-query-helper --watch` | `sourceDir`를 감시하여 변경될 때마다 코드를 갱신합니다. |
| `react-query-helper --generate` | `sourceDir` 내 모든 API 파일을 분석하고 한 번에 코드를 생성합니다. |
| `react-query-helper --help` | 사용 가능한 모든 옵션을 확인합니다. |

## 설정 옵션

| 옵션 | 필수 | 설명 |
| --- | --- | --- |
| `sourceDir` | ✅ | API 함수가 포함된 TypeScript 디렉토리 (루트 기준 경로) |
| `outputDir` | ✅ | 생성된 훅과 옵션 파일이 저장될 디렉토리 |
| `ignoredFiles` | ❌ | 코드 생성에서 제외할 파일/경로 패턴 배열 (`domain.ts`, `**/*.spec.ts`, `admin/internal/**`) |
| `templateDir` | ❌ | 생성된 코드에서 `queryOption` 계열을 import 할 모듈 경로 또는 상대 디렉토리 |
| `sourceImportAlias` | ❌ | API 함수 import를 상대경로 대신 alias로 생성할 때 사용할 prefix (`@/apis` 등) |
| `analyzer` | ❌ | 어떤 함수를 읽을지 필터링하는 설정 (`exported-only`, `async-only`, include/exclude 등) |
| `template` | ❌ | 어떤 아티팩트를 생성할지와 이름 규칙을 제어하는 설정 |

## Infinite Query 기본값

`infiniteOption`은 API마다 페이지네이션 규칙이 다르기 때문에, 기본 구현에서는 `pageParam`을 자동 병합하지 않습니다.

필요한 경우 생성된 옵션을 펼친 뒤 `queryFn`, `getNextPageParam`, `initialPageParam`을 직접 override 해서 사용하세요.

```ts
const usersInfinite = {
  ...getUsersInfiniteQueryOption({ page: 1 }),
  initialPageParam: 1,
  queryFn: ({ pageParam }) => getUsers({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
};
```

## 배포 방식

GitHub Actions의 npm 배포는 이제 `main` 푸시가 아니라 `v*` 태그 푸시 또는 수동 실행에서만 동작합니다.

예시:

```bash
git tag v1.0.3
git push origin v1.0.3
```

## 생성 결과 예시

```ts
// libs/users/api.ts
export const getUser = async (id: string) => {
  return { id, name: `User ${id}` };
};

export const createUser = async (name: string) => {
  return { id: Date.now().toString(), name };
};
```

```ts
// src/options/users/apiOptions.ts (자동 생성)
import { createUser, getUser } from "../../../libs/users/api";
import {
  infiniteOption,
  mutationOption,
  queryOption,
} from "@uiwwsw/react-query-helper";

export const getUserKey = ["users", "getUser"] as const;
export const getUserQueryOption = queryOption(getUserKey, getUser);
export const getUserMutationOption = mutationOption(getUserKey, getUser);
export const getUserInfiniteQueryOption = infiniteOption(getUserKey, getUser);

export const createUserKey = ["users", "createUser"] as const;
export const createUserQueryOption = queryOption(createUserKey, createUser);
export const createUserMutationOption = mutationOption(createUserKey, createUser);
export const createUserInfiniteQueryOption = infiniteOption(
  createUserKey,
  createUser
);
```

## 헬퍼 경로 커스터마이징

조직 공용 헬퍼를 따로 두고 있다면 `templateDir`로 생성 코드의 import 경로를 바꿀 수 있습니다.

또한 `template` / `analyzer` 설정으로 현재 팀 구조에 맞게 생성 규칙을 바꿀 수 있습니다.

```ts
const config: AutoQueryConfig = {
  sourceDir: "./libs",
  outputDir: "./src/options",
  analyzer: {
    functionMatchMode: "async-only",
    excludeNames: ["debugHelper"],
  },
  template: {
    enabledArtifacts: ["query"],
    keyStyle: "function-only",
    outputNames: {
      query: "CustomQueryOption",
    },
  },
};
```

더 강하게 커스터마이징하려면 외부 모듈도 연결할 수 있습니다.

```ts
const config: AutoQueryConfig = {
  sourceDir: "./libs",
  outputDir: "./src/options",
  customAnalyzerPath: "./rqh.analyzer.mjs",
  customTemplatePath: "./rqh.template.mjs",
};
```

- `customAnalyzerPath`: 파일을 읽고 원하는 함수 메타 목록을 직접 반환
- `customTemplatePath`: 최종 생성 코드 문자열을 직접 반환

예시 `rqh.analyzer.mjs`:

```js
export function analyzeFile(filePath, config) {
  // 여기서 AST를 직접 파싱하거나,
  // 파일명 규칙 / 함수명 규칙을 자유롭게 적용할 수 있습니다.
  return [
    {
      name: "getUser",
      parameters: ["params"],
      isAsync: true,
      isExported: true,
    },
  ];
}
```

예시 `rqh.template.mjs`:

```js
export function generateOptionsCode({ functionInfos, importPath }) {
  const names = functionInfos.map((info) => info.name).join(", ");
  return `import { ${names} } from "${importPath}";\nexport const customGenerated = true;\n`;
}
```

언제 custom analyzer를 쓰면 되냐면:
- built-in analyzer 설정만으로 충분한 경우
  - `exported-only`, `async-only`, 이름 include/exclude, 아티팩트 on/off 정도
- custom analyzer가 필요한 경우
  - 함수 선언이 래핑되어 있거나
  - factory/higher-order 구조를 쓰거나
  - 팀 전용 규칙으로 함수 후보를 뽑아야 하거나
  - 기본 AST 규칙보다 더 복잡한 generic 패턴을 강제하고 싶을 때

즉 이제는 기본 규칙을 조금 바꾸는 수준이 아니라, 팀 전용 생성기처럼 확장할 수 있습니다.

```ts
const config: AutoQueryConfig = {
  sourceDir: "./libs",
  outputDir: "./src/options",
  templateDir: "./src/query-helpers",
};
```

예를 들어 생성 파일은 기본 패키지 대신 아래처럼 지정한 경로를 import 하게 됩니다.

```ts
import {
  queryOption,
  mutationOption,
  infiniteOption,
} from "./src/query-helpers";
```

## 베스트 프랙티스

- **하나의 API = 하나의 훅** 구조를 유지하면 캐시 키 관리가 쉬워집니다.
- 생성된 파일은 버전 관리 시스템(Git)에 커밋하여 배포 시 자동 생성 과정을 피하세요.
- `queryOption` 유틸 함수에서 글로벌 옵션(`staleTime`, `retry`, `refetchOnWindowFocus`)을 정의하면 팀 전체 규칙을 손쉽게 통일할 수 있습니다.
- Watch 모드 사용 시 IDE 저장 포맷터와 충돌이 없도록 저장 시점 포맷팅을 맞춰 주세요.

## 스타 히스토리

[![Star History Chart](https://api.star-history.com/svg?repos=uiwwsw/react-query-helper&type=Date)](https://star-history.com/#uiwwsw/react-query-helper&Date)

## 기여

버그 제보, 기능 제안, 문서 개선 등 모든 기여를 환영합니다. 이슈를 등록하거나 Pull Request를 보내 주세요.

## 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)를 따릅니다.
