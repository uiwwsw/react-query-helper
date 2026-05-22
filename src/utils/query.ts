import type {
  QueryKey,
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

type BaseQueryKey = readonly unknown[];

type QueryOptionOverrides<TArgs extends unknown[], TResult> = Omit<
  UseQueryOptions<TResult, unknown, TResult, BaseQueryKey>,
  "queryKey" | "queryFn"
> & {
  queryKey?: QueryKey;
  appendQueryKey?: readonly unknown[];
  args?: TArgs;
  mapArgs?: (args: TArgs) => TArgs;
  queryFn?: (
    context: {
      queryKey: BaseQueryKey;
      signal: AbortSignal;
      meta: Record<string, unknown> | undefined;
      args: TArgs;
    }
  ) => MaybePromise<TResult>;
};

type MutationOptionOverrides<TArgs extends unknown[], TResult> = Omit<
  UseMutationOptions<TResult, unknown, MutationVariables<TArgs>, unknown>,
  "mutationKey" | "mutationFn"
> & {
  mutationKey?: QueryKey;
  appendMutationKey?: readonly unknown[];
  mapVariablesToArgs?: (variables: MutationVariables<TArgs>) => TArgs;
  mutationFn?: (context: {
    variables: MutationVariables<TArgs>;
    args: TArgs;
  }) => MaybePromise<TResult>;
};

type InfiniteOptionOverrides<
  TArgs extends unknown[],
  TResult,
  TPageParam = unknown,
> = Omit<
  UseInfiniteQueryOptions<TResult, unknown, TResult, BaseQueryKey, TPageParam>,
  "queryKey" | "queryFn"
> & {
  queryKey?: QueryKey;
  appendQueryKey?: readonly unknown[];
  args?: TArgs;
  mapArgs?: (args: TArgs) => TArgs;
  pageParamToArgs?: (pageParam: TPageParam, args: TArgs) => TArgs;
  queryFn?: (
    context: {
      queryKey: BaseQueryKey;
      signal: AbortSignal;
      meta: Record<string, unknown> | undefined;
      pageParam: TPageParam;
      direction: unknown;
      args: TArgs;
    }
  ) => MaybePromise<TResult>;
};

interface QueryOptionFactory<TArgs extends unknown[], TResult> {
  (...payload: TArgs): UseQueryOptions<TResult, unknown, TResult, BaseQueryKey>;
  withOptions: (
    overrides: QueryOptionOverrides<TArgs, TResult>,
    ...payload: TArgs
  ) => UseQueryOptions<TResult, unknown, TResult, BaseQueryKey>;
}

interface MutationOptionFactory<TArgs extends unknown[], TResult> {
  (): UseMutationOptions<TResult, unknown, MutationVariables<TArgs>, unknown>;
  withOptions: (
    overrides?: MutationOptionOverrides<TArgs, TResult>
  ) => UseMutationOptions<TResult, unknown, MutationVariables<TArgs>, unknown>;
}

interface InfiniteOptionFactory<
  TArgs extends unknown[],
  TResult,
  TPageParam = unknown,
> {
  (...payload: TArgs): UseInfiniteQueryOptions<TResult, unknown, TResult, BaseQueryKey, TPageParam>;
  withOptions: (
    overrides: InfiniteOptionOverrides<TArgs, TResult, TPageParam>,
    ...payload: TArgs
  ) => UseInfiniteQueryOptions<TResult, unknown, TResult, BaseQueryKey, TPageParam>;
}

type QueryOptionType = <T extends unknown[], J>(
  key: readonly unknown[],
  fn: AnyFn<T, J>
) => QueryOptionFactory<T, J>;

type MutationOptionType = <TArgs extends unknown[], TResult>(
  key: readonly unknown[],
  fn: AnyFn<TArgs, TResult>
) => MutationOptionFactory<TArgs, TResult>;

type InfiniteOptionType = <T extends unknown[], K>(
  key: readonly unknown[],
  fn: AnyFn<T, K>
) => InfiniteOptionFactory<T, K>;

function resolveArgs<TArgs extends unknown[]>(
  payload: TArgs,
  overrides?: {
    args?: TArgs;
    mapArgs?: (args: TArgs) => TArgs;
  }
) {
  const baseArgs = overrides?.args ?? payload;
  return overrides?.mapArgs ? overrides.mapArgs(baseArgs) : baseArgs;
}

function resolveKey(
  baseKey: readonly unknown[],
  appendKey?: readonly unknown[],
  overrideKey?: QueryKey
): BaseQueryKey {
  if (overrideKey) {
    return [...overrideKey];
  }

  return [...baseKey, ...(appendKey ?? [])];
}

function toArgs<TArgs extends unknown[]>(
  variables: MutationVariables<TArgs>
): TArgs {
  if (Array.isArray(variables)) {
    return variables as TArgs;
  }

  if (typeof variables === "undefined") {
    return [] as unknown as TArgs;
  }

  return [variables] as unknown as TArgs;
}

export const queryOption: QueryOptionType = <T extends unknown[], J>(
  key: readonly unknown[],
  fn: AnyFn<T, J>
) => {
  const buildOptions = (
    payload: T,
    overrides?: QueryOptionOverrides<T, J>
  ): UseQueryOptions<J, unknown, J, BaseQueryKey> => {
    const args = resolveArgs(payload, overrides);
    const queryKey = resolveKey([...key, ...args], overrides?.appendQueryKey, overrides?.queryKey);
    const { appendQueryKey: _appendQueryKey, args: _args, mapArgs: _mapArgs, queryFn: overrideQueryFn, queryKey: _queryKey, ...restOverrides } =
      overrides ?? {};

    return {
      queryKey,
      queryFn: (context) => {
        if (overrideQueryFn) {
          return Promise.resolve(
            overrideQueryFn({
              queryKey: context.queryKey,
              signal: context.signal,
              meta: context.meta,
              args,
            })
          );
        }

        return Promise.resolve(fn(...args));
      },
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      ...restOverrides,
    };
  };

  const factory = ((...payload: T) => buildOptions(payload)) as QueryOptionFactory<T, J>;
  factory.withOptions = (overrides, ...payload) => buildOptions(payload, overrides);

  return factory;
};

export const mutationOption: MutationOptionType = <TArgs extends unknown[], TResult>(
  key: readonly unknown[],
  fn: AnyFn<TArgs, TResult>
) => {
  const buildOptions = (
    overrides?: MutationOptionOverrides<TArgs, TResult>
  ): UseMutationOptions<TResult, unknown, MutationVariables<TArgs>, unknown> => {
    const {
      appendMutationKey: _appendMutationKey,
      mutationKey: overrideMutationKey,
      mapVariablesToArgs,
      mutationFn: overrideMutationFn,
      ...restOverrides
    } = overrides ?? {};

    return {
      mutationKey: resolveKey(key, _appendMutationKey, overrideMutationKey),
      mutationFn: (variables) => {
      const args = mapVariablesToArgs
        ? mapVariablesToArgs(variables)
        : toArgs<TArgs>(variables);

      if (overrideMutationFn) {
        return Promise.resolve(overrideMutationFn({ variables, args }));
      }

      return Promise.resolve(fn(...args));
    },
      ...restOverrides,
    };
  };

  const factory = (() => buildOptions()) as MutationOptionFactory<TArgs, TResult>;
  factory.withOptions = (overrides) => buildOptions(overrides);

  return factory;
};

export const infiniteOption: InfiniteOptionType = <T extends unknown[], K>(
  key: readonly unknown[],
  fn: AnyFn<T, K>
) => {
  const buildOptions = <TPageParam = unknown>(
    payload: T,
    overrides?: InfiniteOptionOverrides<T, K, TPageParam>
  ): UseInfiniteQueryOptions<K, unknown, K, BaseQueryKey, TPageParam> => {
    const args = resolveArgs(payload, overrides);
    const queryKey = resolveKey([...key, ...args], overrides?.appendQueryKey, overrides?.queryKey);
    const { appendQueryKey: _appendQueryKey, args: _args, mapArgs: _mapArgs, pageParamToArgs, queryFn: overrideQueryFn, queryKey: _queryKey, ...restOverrides } =
      overrides ?? {};

    return {
      queryKey,
      queryFn: (context) => {
        if (overrideQueryFn) {
          return Promise.resolve(
            overrideQueryFn({
              queryKey: context.queryKey,
              signal: context.signal,
              meta: context.meta,
              pageParam: context.pageParam as TPageParam,
              direction: context.direction,
              args,
            })
          );
        }

        const resolvedArgs = pageParamToArgs
          ? pageParamToArgs(context.pageParam as TPageParam, args)
          : args;

        return Promise.resolve(fn(...resolvedArgs));
      },
      getNextPageParam: () => undefined,
      initialPageParam: undefined as TPageParam,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      ...restOverrides,
    };
  };

  const factory = ((...payload: T) => buildOptions(payload)) as InfiniteOptionFactory<T, K>;
  factory.withOptions = (overrides, ...payload) => buildOptions(payload, overrides);

  return factory;
};
