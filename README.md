<p align="center">
  <img src="./assets/logo.svg" alt="React Query Helper Logo" width="160" />
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  <a href="README_EN.md">🇺🇸 English</a> · <strong>🇰🇷 한국어</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/v/@uiwwsw/react-query-helper.svg?color=2563eb" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/dm/@uiwwsw/react-query-helper.svg?color=9333ea" alt="npm downloads" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981.svg" alt="license" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0-000000.svg?logo=node.js" alt="node version" />
  <img src="https://img.shields.io/badge/Bun-ready-f97316.svg?logo=bun" alt="bun ready" />
</p>

> React Query Helper는 TypeScript API 함수로부터 React Query 훅과 옵션 객체를 자동 생성해 주는 CLI 도구입니다. 설정만 해두면 반복적인 훅 작성 시간을 절약하고 프로젝트 전체에 걸쳐 일관된 데이터 패칭 규칙을 유지할 수 있습니다.

---

## 목차

- [주요 특징](#주요-특징)
- [빠른 시작](#빠른-시작)
  - [설치](#설치)
  - [설정 파일 만들기](#설정-파일-만들기)
  - [코드 생성 실행](#코드-생성-실행)
- [CLI 명령어](#cli-명령어)
- [설정 옵션](#설정-옵션)
- [생성 결과 예시](#생성-결과-예시)
- [템플릿 커스터마이징](#템플릿-커스터마이징)
- [베스트 프랙티스](#베스트-프랙티스)
- [스타 히스토리](#스타-히스토리)
- [기여](#기여)
- [라이선스](#라이선스)

## 주요 특징

- **설정 기반 자동화**: `rqh.config.ts`만 구성하면 API 디렉토리 감지부터 출력 디렉토리 지정까지 모두 자동화됩니다.
- **Watch & Generate 모드**: 개발 중 실시간 감시(`--watch`), 초기 세팅이나 재생성 시 일괄 생성(`--generate`)을 모두 지원합니다.
- **일관된 옵션 관리**: `queryOption`, `mutationOption`, `infiniteOption` 유틸리티로 전역 캐싱 전략과 에러 핸들링을 통일할 수 있습니다.
- **Prettier 통합**: 생성된 파일은 자동으로 포맷팅되어 코드 리뷰 시 불필요한 변경을 줄입니다.
- **템플릿 확장성**: 기본 템플릿 대신 사용자 정의 템플릿을 지정해 조직의 코딩 규칙을 쉽게 반영할 수 있습니다.

## 빠른 시작

### 설치

```bash
bun add @uiwwsw/react-query-helper
# 또는
npm install --save-dev @uiwwsw/react-query-helper
```

### 설정 파일 만들기

루트에 `rqh.config.ts` 파일을 생성하고 다음과 같이 채워주세요.

```ts
// rqh.config.ts
import type { AutoQueryConfig } from "./src/config";

const config: AutoQueryConfig = {
  sourceDir: "./libs",        // API 함수들이 위치한 경로
  outputDir: "./src/options", // 생성된 코드가 저장될 경로
  // ignoredFiles: ["types.ts"],
  // templateDir: "./custom-templates",
};

export default config;
```

### 코드 생성 실행

`package.json`에 스크립트를 추가한 뒤 CLI를 실행하면 됩니다.

```jsonc
// package.json
{
  "scripts": {
    "watch": "react-query-helper --watch",
    "generate": "react-query-helper --generate"
  }
}
```

```bash
bun run watch      # 실시간 변경 감지
bun run generate   # 전체 파일 일괄 생성
```

## CLI 명령어

| 명령어 | 설명 |
| --- | --- |
| `react-query-helper --watch` | `sourceDir`를 감시하여 변경될 때마다 코드를 갱신합니다. |
| `react-query-helper --generate` | `sourceDir` 내 모든 API 파일을 분석하고 한 번에 코드를 생성합니다. |
| `react-query-helper --help` | 사용 가능한 모든 옵션을 확인합니다. |

## 설정 옵션

| 옵션 | 필수 | 설명 |
| --- | --- | --- |
| `sourceDir` | ✅ | API 함수가 포함된 TypeScript 디렉토리 (루트 기준 경로) |
| `outputDir` | ✅ | 생성된 훅과 옵션 파일이 저장될 디렉토리 |
| `ignoredFiles` | ❌ | 코드 생성에서 제외할 파일 이름 배열 |
| `templateDir` | ❌ | 사용자 정의 템플릿이 위치한 디렉토리 |

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
import { getUser, createUser } from "../../../libs/users/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryOption, mutationOption } from "@uiwwsw/react-query-helper/utils/query";

export const useGetUserQuery = (id: string) => {
  return useQuery(queryOption(["users", id], () => getUser(id))(id));
};

export const useCreateUserMutation = () => {
  return useMutation(mutationOption(["users"], createUser)());
};
```

## 템플릿 커스터마이징

조직 맞춤 코딩 스타일이 필요하다면 템플릿 디렉토리를 지정하세요.

```ts
const config: AutoQueryConfig = {
  sourceDir: "./libs",
  outputDir: "./src/options",
  templateDir: "./custom-templates", // EJS 템플릿 디렉토리
};
```

템플릿 파일에서 React Query 옵션, 에러 핸들링, import 경로 등을 마음껏 수정할 수 있습니다. 변경 사항은 다음 실행 시 바로 반영됩니다.

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
