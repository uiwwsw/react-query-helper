import type {
  MutationFunction,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
// Define type aliases for the full function signatures
type QueryOptionType = <T extends unknown[], J>(
  key: string[],
  fn: (...payload: T) => Promise<J>
) => (...payload: T) => UseQueryOptions<J>;
type MutationOptionType = <T, K>(
  key: string[],
  fn: MutationFunction<T, K>
) => () => UseMutationOptions<T, unknown, K>;
type InfiniteOptionType = <T extends unknown[], K>(
  key: string[],
  fn: (...payload: T) => Promise<K>
) => (...payload: T) => UseInfiniteQueryOptions<K, unknown, K>;

export const queryOption: QueryOptionType = <T extends unknown[], J>(
  key: string[],
  fn: (...payload: T) => Promise<J>
) => {
  return (...payload: T): UseQueryOptions<J> => ({
    queryKey: [...key, ...payload],
    queryFn: () => fn(...payload),
    // staleTime: Infinity, // 데이터가 항상 최신 상태로 간주되도록 설정
    gcTime: Infinity, // 캐시된 데이터가 무기한 유지되도록 설정
    // retry: 3, // 실패 시 재시도 횟수 설정
    refetchOnWindowFocus: false, // 창이 포커스를 얻을 때 자동으로 다시 가져오지 않도록 설정
  });
};

export const mutationOption: MutationOptionType = <T, K>(
  key: string[],
  fn: MutationFunction<T, K>
) => {
  return (): UseMutationOptions<T, unknown, K> => ({
    mutationKey: key,
    mutationFn: fn,
    // retry: 3, // 실패 시 재시도 횟수 설정
  });
};
export const infiniteOption: InfiniteOptionType = <T extends unknown[], K>(
  key: string[],
  fn: (...payload: T) => Promise<K>
) => {
  return (...payload: T): UseInfiniteQueryOptions<K, unknown, K> => ({
    queryKey: [...key, ...payload],
    queryFn: ({ pageParam }) => {
      if (!pageParam) return fn(...payload);

      payload.map((param, index) => {
        if (typeof param === "object" && param !== null) {
          payload[index] = { ...param, ...pageParam } as T[number];

          return param;
        }
      });

      return fn(...payload);
    },
    getNextPageParam: (lastPage) => lastPage,
    initialPageParam: undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};
