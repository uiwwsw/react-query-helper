# React Query Helper

![React Query Helper Logo](https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/logo.png) <!-- 로고 이미지가 있다면 여기에 추가하세요. 없으면 이 줄을 삭제하거나 주석 처리하세요. -->

## 🚀 소개

`React Query Helper`는 `rqh.config.ts` 파일에 정의된 설정을 기반으로, 지정된 TypeScript API 파일들을 실시간으로 감지하거나 일괄 처리하여 React Query 훅과 옵션 객체를 자동으로 생성해주는 강력한 CLI 도구입니다. 이 도구는 반복적인 React Query 설정 작업을 획기적으로 줄여 개발 생산성을 극대화하고, 프로젝트 전반에 걸쳐 일관된 코드 스타일을 유지할 수 있도록 돕습니다.

API 파일의 변경을 감지하여 실시간으로 관련 React Query 코드를 업데이트하거나, 한 번의 명령으로 전체 프로젝트의 코드를 생성할 수 있습니다.

## ✨ 주요 기능

-   **설정 파일 기반 자동화 (`rqh.config.ts`)**: `rqh.config.ts` 파일을 통해 API 소스 디렉토리, 생성될 React Query 코드의 출력 디렉토리, 무시할 파일 목록 등을 유연하게 설정할 수 있습니다. 이 설정에 따라 모든 자동화 작업이 수행됩니다.
-   **실시간 변경 감지 (Watch Mode)**: `rqh.config.ts`에 설정된 `sourceDir` 내의 TypeScript API 파일 변경 사항을 실시간으로 감지합니다. 파일이 추가, 변경, 삭제될 때마다 해당 파일에 대한 React Query 훅과 옵션 코드를 자동으로 업데이트하여 개발 워크플로우를 간소화합니다.
-   **일괄 코드 생성 (Generate Mode)**: `rqh.config.ts`에 설정된 `sourceDir` 내의 모든 API 파일에 대해 React Query 코드를 한 번에 생성합니다. 주로 프로젝트 초기 설정 시 또는 전체 코드 재생성이 필요할 때 유용합니다.
-   **자동 코드 생성**: TypeScript API 파일에 정의된 함수를 기반으로 `useQuery`, `useMutation`, `useInfiniteQuery`와 같은 React Query 훅 및 관련 옵션 객체를 자동으로 생성합니다.
-   **Prettier 통합**: 생성된 코드는 자동으로 Prettier를 통해 포맷팅되어 일관된 코드 스타일을 유지합니다.

## 📦 설치

```bash
bun add @uiwwsw/react-query-helper
```

## 🛠️ 사용법

`React Query Helper`를 사용하기 위한 핵심 단계는 다음과 같습니다:

### 1. 설정 파일 (`rqh.config.ts`) 생성

프로젝트 루트에 `rqh.config.ts` 파일을 생성하고, **API 파일이 위치한 디렉토리(`sourceDir`)**와 **생성된 코드가 저장될 디렉토리(`outputDir`)**를 설정합니다. 이 경로는 프로젝트의 루트 디렉토리를 기준으로 합니다.

```typescript
// rqh.config.ts
/** @type {import('./src/config').AutoQueryConfig} */
const config = {
  sourceDir: "./libs", // API 함수가 정의된 TypeScript 파일들이 있는 디렉토리 (예: libs/users/api.ts)
  outputDir: "./src/options", // React Query 훅 및 옵션 파일이 생성될 디렉토리
  // ignoredFiles: ["some-ignored-file.ts"], // (선택 사항) 코드 생성에서 제외할 파일 이름들의 배열
  // templateDir: "./custom-templates", // (선택 사항) 사용자 정의 템플릿 디렉토리
};

export default config;
```

### 2. 코드 생성 실행

`rqh.config.ts` 설정이 완료되면, 다음 명령어를 통해 React Query 코드를 생성할 수 있습니다.

#### 실시간 변경 감지 모드 (`--watch`)

`rqh.config.ts`에 설정된 `sourceDir` 내의 API 파일 변경 사항을 실시간으로 감지하고, 해당 파일에 대한 React Query 코드를 자동으로 업데이트합니다. 개발 중 편리하게 사용할 수 있습니다.

> ⚠️ `react-query-helper --watch` 명령을 바로 실행하면, 프로젝트 로컬에 설치된 바이너리를 찾지 못해 동작하지 않을 수 있습니다. `package.json`에 스크립트를 정의해 두면 항상 동일한 명령으로 실행할 수 있어 안전합니다.

프로젝트의 `package.json`에 다음과 같이 스크립트를 추가한 뒤, `bun run watch` (또는 `bun watch`) 명령으로 실행하는 방법을 권장합니다.

```jsonc
// package.json
{
  "scripts": {
    "dev": "bun --hot src/index.tsx",
    "watch": "react-query-helper --watch",
    "start": "NODE_ENV=production bun src/index.tsx",
    "build": "bun run build.ts"
  }
}
```

이제 아래 명령만 입력하면 됩니다.

```bash
bun run watch
```

#### 일괄 생성 모드 (`--generate`)

`rqh.config.ts`에 설정된 `sourceDir` 내의 모든 API 파일에 대해 React Query 코드를 한 번에 생성합니다. 주로 초기 설정 시 또는 전체 코드 재생성이 필요할 때 사용합니다.

동일한 방식으로 `package.json`에 `"generate": "react-query-helper --generate"` 스크립트를 추가해 두면, 다음 명령으로 일괄 생성 모드를 실행할 수 있습니다.

```bash
bun run generate
```

### 3. 생성된 코드 사용 예시

`rqh.config.ts`에 설정된 `outputDir` (예: `./src/options`)에 다음과 같은 파일이 생성됩니다. **생성되는 파일의 경로는 `sourceDir`와 `outputDir` 설정에 따라 달라집니다.**

예를 들어, `sourceDir`이 `./libs`이고 `outputDir`이 `./src/options`일 때, `libs/users/api.ts` 파일에 `getUser` 함수가 있다면:

```typescript
// libs/users/api.ts
export const getUser = async (id: string) => {
  return { id, name: `User ${id}` };
};

export const createUser = (name: string) => {
  return { id: Date.now().toString(), name };
};

export function deleteUser(id: string) {
  return { success: true, id };
}
```

`src/options/users/apiOptions.ts`와 같은 파일이 `outputDir` 내에 생성될 수 있습니다. (정확한 파일명은 `analyzer.ts`와 `generator.ts`의 로직에 따라 달라질 수 있습니다.)

```typescript
// src/options/users/apiOptions.ts (예시 - 경로는 rqh.config.ts 설정에 따라 달라짐)
import { getUser, createUser, deleteUser } from "../../../libs/users/api"; // API 파일 경로도 상대적으로 참조됩니다.
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryOption, mutationOption } from "@uiwwsw/react-query-helper/utils/query"; // @src/utils/query.ts에서 가져온 유틸리티 함수

// getUser에 대한 React Query 훅
export const useGetUserQuery = (id: string, options?: any) => {
  return useQuery(queryOption(["users", id], () => getUser(id))(id));
};

// createUser에 대한 React Query 뮤테이션 훅
export const useCreateUserMutation = (options?: any) => {
  return useMutation(mutationOption(["users"], createUser)());
};

// deleteUser에 대한 React Query 뮤테이션 훅
export const useDeleteUserMutation = (options?: any) => {
  return useMutation(mutationOption(["users"], deleteUser)());
};
```

**`@uiwwsw/react-query-helper/utils/query.ts`의 강력함:**

위 예시에서 볼 수 있듯이, `queryOption`, `mutationOption`, `infiniteOption`과 같은 유틸리티 함수들을 활용하여 React Query 훅의 기본 설정을 중앙에서 관리하고 재사용할 수 있습니다. 예를 들어, 모든 쿼리에 `staleTime: Infinity`나 `refetchOnWindowFocus: false`와 같은 공통 옵션을 적용하고 싶다면, `src/utils/query.ts` 파일 내의 해당 유틸리티 함수를 수정하는 것만으로 모든 생성된 훅에 반영됩니다. 이는 일관된 캐싱 전략, 에러 처리, 재시도 로직 등을 쉽게 적용할 수 있게 하여 개발 효율성을 크게 높여줍니다.

이제 애플리케이션에서 이 훅들을 가져와 사용할 수 있습니다. **가져오는 경로 또한 `rqh.config.ts`의 `outputDir` 설정에 따라 달라집니다.**

```typescript
// YourComponent.tsx
import { useGetUserQuery, useCreateUserMutation } from "../options/users/apiOptions"; // 경로는 rqh.config.ts 설정에 따라 달라짐

function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useGetUserQuery(userId);
  const createUserMutation = useCreateUserMutation({
    onSuccess: () => {
      console.log("User created!");
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>User not found.</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => createUserMutation.mutate("New User")}>
        Create New User
      </button>
    </div>
  );
}
```

## ⚙️ 설정 (`rqh.config.ts`)

`rqh.config.ts` 파일에서 다음 `AutoQueryConfig` 인터페이스에 정의된 옵션들을 설정할 수 있습니다.

-   `sourceDir`: (필수) API 함수가 정의된 TypeScript 파일들이 있는 디렉토리의 경로입니다. 이 디렉토리 내의 `.ts` 파일들을 분석하여 React Query 코드를 생성합니다. 프로젝트 루트를 기준으로 한 상대 경로를 사용합니다.
-   `outputDir`: (필수) 생성된 React Query 훅 및 옵션 파일이 저장될 디렉토리의 경로입니다. 프로젝트 루트를 기준으로 한 상대 경로를 사용합니다.
-   `ignoredFiles`: (선택 사항) 코드 생성 과정에서 무시할 파일 이름들의 배열입니다. (예: `["utils.ts", "types.ts"]`) 이 목록에 있는 파일은 `sourceDir` 내에 있더라도 코드가 생성되지 않습니다.
-   `templateDir`: (선택 사항) `React Query Helper`가 훅을 생성할 때 사용할 사용자 정의 템플릿 파일들이 있는 디렉토리의 경로입니다. 이 옵션을 설정하면 기본 템플릿 대신 지정된 템플릿을 사용하여 훅을 생성할 수 있습니다. 이를 통해 `queryOption`, `mutationOption` 등과 같은 사용자 정의 유틸리티 함수를 활용하여 생성되는 훅의 동작을 세밀하게 제어할 수 있습니다. 프로젝트 루트를 기준으로 한 상대 경로를 사용합니다. (예: `templateDir: "./custom-templates"`)

## 🤝 기여

버그 리포트, 기능 제안, 코드 기여 등 모든 형태의 기여를 환영합니다. 자세한 내용은 `CONTRIBUTING.md` 파일을 참조해주세요.

## 📄 라이선스

이 프로젝트는 [LICENSE](LICENSE) 파일에 명시된 라이선스에 따라 배포됩니다.
