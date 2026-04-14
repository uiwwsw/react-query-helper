import type {
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";

type MaybePromise<T> = T | Promise<T>;
type AnyFn<TArgs extends unknown[] = unknown[], TResult = unknown> = (
  ...payload: TArgs
) => MaybePromise<TResult>;
type MutationVariables<TArgs extends unknown[]> = TArgs extends []
  ? void
  : TArgs extends [infer Only]
    ? Only
    : TArgs;

type QueryOptionType = <T extends unknown[], J>(
  key: readonly unknown[],
  fn: AnyFn<T, J>
) => (...payload: T) => UseQueryOptions<J>;

type MutationOptionType = <TArgs extends unknown[], TResult>(
  key: readonly unknown[],
  fn: AnyFn<TArgs, TResult>
) => () => UseMutationOptions<TResult, unknown, MutationVariables<TArgs>>;

type InfiniteOptionType = <T extends unknown[], K>(
  key: readonly unknown[],
  fn: AnyFn<T, K>
) => (...payload: T) => UseInfiniteQueryOptions<K, unknown, K>;

export const queryOption: QueryOptionType = <T extends unknown[], J>(
  key: readonly unknown[],
  fn: AnyFn<T, J>
) => {
  return (...payload: T): UseQueryOptions<J> => ({
    queryKey: [...key, ...payload],
    queryFn: () => Promise.resolve(fn(...payload)),
    // staleTime: Infinity, // 데이터가 항상 최신 상태로 간주되도록 설정
    gcTime: Infinity, // 캐시된 데이터가 무기한 유지되도록 설정
    // retry: 3, // 실패 시 재시도 횟수 설정
    refetchOnWindowFocus: false, // 창이 포커스를 얻을 때 자동으로 다시 가져오지 않도록 설정
  });
};

export const mutationOption: MutationOptionType = <TArgs extends unknown[], TResult>(
  key: readonly unknown[],
  fn: AnyFn<TArgs, TResult>
) => {
  return (): UseMutationOptions<TResult, unknown, MutationVariables<TArgs>> => ({
    mutationKey: key,
    mutationFn: (variables) => {
      if (Array.isArray(variables)) {
        return Promise.resolve(fn(...(variables as TArgs)));
      }

      if (typeof variables === "undefined") {
        return Promise.resolve(fn(...([] as unknown as TArgs)));
      }

      return Promise.resolve(fn(variables as TArgs[0]));
    },
    // retry: 3, // 실패 시 재시도 횟수 설정
  });
};
export const infiniteOption: InfiniteOptionType = <T extends unknown[], K>(
  key: readonly unknown[],
  fn: AnyFn<T, K>
) => {
  return (...payload: T): UseInfiniteQueryOptions<K, unknown, K> => ({
    queryKey: [...key, ...payload],
    // Infinite queries usually need API-specific pagination rules.
    // The default keeps the function side-effect free and lets callers override
    // queryFn/getNextPageParam with their own pageParam handling.
    queryFn: () => Promise.resolve(fn(...payload)),
    getNextPageParam: () => undefined,
    initialPageParam: undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};
