# React Query Helper

![React Query Helper Logo](https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/logo.png) <!-- 로고 이미지가 있다면 여기에 추가하세요. 없으면 이 줄을 삭제하거나 주석 처리하세요. -->

## 🚀 소개

`React Query Helper`는 기존 TypeScript API 파일에서 React Query 훅과 옵션 객체를 자동으로 생성해주는 강력한 CLI 도구입니다. 반복적인 React Query 설정 작업을 줄여 개발 생산성을 극대화하고, 일관된 코드 스타일을 유지할 수 있도록 돕습니다.

API 파일의 변경을 감지하여 실시간으로 관련 React Query 코드를 업데이트하거나, 한 번의 명령으로 전체 프로젝트의 코드를 생성할 수 있습니다.

## ✨ 주요 기능

-   **자동 코드 생성**: TypeScript API 파일에 정의된 함수를 기반으로 React Query 훅 (예: `useGetUserQuery`, `useCreateUserMutation`) 및 옵션 객체를 자동으로 생성합니다.
-   **파일 변경 감지 (Watch Mode)**: `--watch` 모드를 통해 소스 API 파일의 변경 사항을 실시간으로 감지하고, 관련 React Query 코드를 즉시 업데이트합니다.
-   **일괄 생성 (Generate Mode)**: `--generate` 모드를 사용하여 프로젝트 내 모든 API 파일에 대한 React Query 코드를 한 번에 생성합니다.
-   **설정 파일 기반**: `rqh.config.ts` 파일을 통해 소스 디렉토리, 출력 디렉토리, 무시할 파일 등을 유연하게 설정할 수 있습니다.
-   **Prettier 통합**: 생성된 코드는 자동으로 Prettier를 통해 포맷팅되어 일관된 코드 스타일을 유지합니다.

## 📦 설치

`React Query Helper`는 [Bun](https://bun.sh/) 런타임을 사용하여 개발되었습니다. Bun이 설치되어 있지 않다면 먼저 설치해주세요.

```bash
bun install
```

## 🛠️ 사용법

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

### 2. 코드 생성

#### 일괄 생성 모드 (`--generate`)

`rqh.config.ts`에 설정된 `sourceDir` 내의 모든 API 파일에 대해 React Query 코드를 한 번에 생성합니다. 주로 초기 설정 시 또는 전체 코드 재생성이 필요할 때 사용합니다.

```bash
bun run src/cli.ts --generate
# 또는 package.json에 정의된 스크립트 사용
bun generate
```

#### 변경 감지 모드 (`--watch`)

`rqh.config.ts`에 설정된 `sourceDir` 내의 API 파일 변경 사항을 실시간으로 감지하고, 해당 파일에 대한 React Query 코드를 자동으로 업데이트합니다. 개발 중 편리하게 사용할 수 있습니다.

```bash
bun run src/cli.ts --watch
# 또는 package.json에 정의된 스크립트 사용
bun dev
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