import {
  infiniteQueryOptions,
  mutationOptions,
  queryOptions,
  type DataTag,
  type DefaultError,
  type InfiniteData,
  type MutationFunctionContext,
  type MutationKey,
  type QueryFunctionContext,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

type MaybePromise<T> = T | PromiseLike<T>;
type Api<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => MaybePromise<TResult>;
export type MutationVariables<TArgs extends unknown[]> = TArgs extends []
  ? void
  : TArgs extends [unknown?]
    ? TArgs[0]
    : TArgs;
type ArgumentOptions<TArgs extends unknown[]> = {
  args?: TArgs;
  mapArgs?: (args: TArgs) => TArgs;
};
export type QueryResult<TResult, TData = TResult> = Omit<
  UseQueryOptions<TResult, DefaultError, TData>,
  "queryFn" | "queryKey"
> & {
  queryKey: DataTag<QueryKey, TResult, DefaultError>;
  queryFn: (context: QueryFunctionContext) => Promise<TResult>;
};
type InitialValue<T> = Exclude<T, undefined> | (() => Exclude<T, undefined>);
export type DefinedQueryResult<TResult, TData = TResult> = QueryResult<
  TResult,
  TData
> & {
  initialData: InitialValue<TResult>;
};
export type InfiniteResult<
  TResult,
  TPageParam,
  TData = InfiniteData<TResult, TPageParam>,
> = Omit<
  UseInfiniteQueryOptions<TResult, DefaultError, TData, QueryKey, TPageParam>,
  "queryFn" | "queryKey"
> & {
  queryKey: DataTag<QueryKey, InfiniteData<TResult>, DefaultError>;
  queryFn: (
    context: QueryFunctionContext<QueryKey, TPageParam>,
  ) => Promise<TResult>;
};
export type MutationResult<TResult, TVariables, TOnMutateResult> =
  UseMutationOptions<TResult, DefaultError, TVariables, TOnMutateResult> & {
    mutationKey: MutationKey;
    mutationFn: (
      variables: TVariables,
      context: MutationFunctionContext,
    ) => Promise<TResult>;
  };
export type QueryOptionOverrides<
  TArgs extends unknown[],
  TResult,
  TData = TResult,
> = Omit<
  UseQueryOptions<TResult, DefaultError, TData>,
  "queryKey" | "queryFn"
> &
  ArgumentOptions<TArgs> & {
    queryKey?: QueryKey;
    appendQueryKey?: readonly unknown[];
    queryFn?: (
      context: QueryFunctionContext & { args: TArgs },
    ) => MaybePromise<TResult>;
  };
export type InfiniteOptionOverrides<
  TArgs extends unknown[],
  TResult,
  TPageParam,
  TData = InfiniteData<TResult, TPageParam>,
> = Omit<
  UseInfiniteQueryOptions<TResult, DefaultError, TData, QueryKey, TPageParam>,
  "queryKey" | "queryFn"
> &
  ArgumentOptions<TArgs> & {
    queryKey?: QueryKey;
    appendQueryKey?: readonly unknown[];
    pageParamToArgs?: (pageParam: TPageParam, args: TArgs) => TArgs;
    queryFn?: (
      context: QueryFunctionContext<QueryKey, TPageParam> & { args: TArgs },
    ) => MaybePromise<TResult>;
  };
export type MutationOptionConfig<TArgs extends unknown[], TVariables> =
  | {
      mapVariablesToArgs: (variables: TVariables) => TArgs;
      variablesMode?: never;
    }
  | (TArgs extends [unknown?]
      ? never
      : TVariables extends TArgs
        ? { variablesMode: "tuple"; mapVariablesToArgs?: never }
        : never);
export type MutationOptionOverrides<
  TArgs extends unknown[],
  TResult,
  TVariables,
  TOnMutateResult = unknown,
> = Omit<
  UseMutationOptions<TResult, DefaultError, TVariables, TOnMutateResult>,
  "mutationKey" | "mutationFn"
> & {
  mutationKey?: MutationKey;
  appendMutationKey?: readonly unknown[];
  mapVariablesToArgs?: (variables: TVariables) => TArgs;
  mutationFn?: (
    context: MutationFunctionContext & { variables: TVariables; args: TArgs },
  ) => MaybePromise<TResult>;
};

function resolveArgs<TArgs extends unknown[]>(
  payload: TArgs,
  overrides: ArgumentOptions<TArgs>,
) {
  const args = [...(overrides.args ?? payload)] as TArgs;
  return overrides.mapArgs ? overrides.mapArgs(args) : args;
}
function resolveKey(
  base: QueryKey,
  args: unknown[],
  append?: readonly unknown[],
  override?: QueryKey,
): QueryKey {
  return override ?? ([...base, ...args, ...(append ?? [])] as QueryKey);
}

export function queryOption<TArgs extends unknown[], TResult>(
  key: QueryKey,
  fn: Api<TArgs, TResult>,
) {
  function build<TData = TResult>(
    payload: TArgs,
    overrides: QueryOptionOverrides<TArgs, TResult, TData> = {},
  ): QueryResult<TResult, TData> {
    const args = resolveArgs(payload, overrides);
    const {
      queryKey: customKey,
      appendQueryKey,
      args: _args,
      mapArgs: _mapArgs,
      queryFn: customFn,
      ...options
    } = overrides;
    const queryKey = resolveKey(
      key,
      ["query", args],
      appendQueryKey,
      customKey,
    );
    const queryFn = async (context: QueryFunctionContext) =>
      customFn ? customFn({ ...context, args }) : fn(...args);
    return {
      ...queryOptions<TResult, DefaultError, TData>({
        ...options,
        queryKey,
        queryFn,
      }),
      queryFn,
    };
  }
  const factory = (...payload: TArgs) => build(payload);
  function withOptions<TData = TResult>(
    overrides: QueryOptionOverrides<TArgs, TResult, TData> & {
      initialData: InitialValue<TResult>;
    },
    ...payload: TArgs
  ): DefinedQueryResult<TResult, TData>;
  function withOptions<TData = TResult>(
    overrides: QueryOptionOverrides<TArgs, TResult, TData>,
    ...payload: TArgs
  ): QueryResult<TResult, TData>;
  function withOptions<TData = TResult>(
    overrides: QueryOptionOverrides<TArgs, TResult, TData>,
    ...payload: TArgs
  ): QueryResult<TResult, TData> {
    return build(payload, overrides);
  }
  factory.withOptions = withOptions;
  return factory;
}

export function mutationOption<
  TArgs extends unknown[],
  TResult,
  TVariables = MutationVariables<TArgs>,
>(
  key: MutationKey,
  fn: Api<TArgs, TResult>,
  ...configuration: TArgs extends [unknown?]
    ? [config?: MutationOptionConfig<TArgs, TVariables>]
    : [config: MutationOptionConfig<TArgs, TVariables>]
) {
  const config = configuration[0] as
    | MutationOptionConfig<TArgs, TVariables>
    | undefined;
  function build<TOnMutateResult = unknown>(
    overrides: MutationOptionOverrides<
      TArgs,
      TResult,
      TVariables,
      TOnMutateResult
    > = {},
  ): MutationResult<TResult, TVariables, TOnMutateResult> {
    const {
      mutationKey,
      appendMutationKey,
      mapVariablesToArgs,
      mutationFn: customFn,
      ...options
    } = overrides;
    const mapper = mapVariablesToArgs ?? config?.mapVariablesToArgs;
    const mutationFn = async (
      variables: TVariables,
      context: MutationFunctionContext,
    ) => {
      // Array payloads are single arguments unless tuple mode is explicitly selected.
      const args: TArgs = mapper
        ? mapper(variables)
        : config?.variablesMode === "tuple"
          ? (variables as unknown as TArgs)
          : ((variables === undefined ? [] : [variables]) as TArgs);
      if (!Array.isArray(args))
        throw new TypeError("Mutation argument mapping must return an array.");
      return customFn ? customFn({ ...context, variables, args }) : fn(...args);
    };
    return {
      ...mutationOptions<TResult, DefaultError, TVariables, TOnMutateResult>({
        ...options,
        mutationKey:
          mutationKey ??
          ([...key, ...(appendMutationKey ?? [])] as MutationKey),
        mutationFn,
      }),
      mutationFn,
    };
  }
  const factory = () => build();
  factory.withOptions = build;
  return factory;
}

export function infiniteOption<TArgs extends unknown[], TResult>(
  key: QueryKey,
  fn: Api<TArgs, TResult>,
) {
  function build<TPageParam, TData = InfiniteData<TResult, TPageParam>>(
    payload: TArgs,
    overrides: InfiniteOptionOverrides<TArgs, TResult, TPageParam, TData>,
  ): InfiniteResult<TResult, TPageParam, TData> {
    const args = resolveArgs(payload, overrides);
    const {
      queryKey: customKey,
      appendQueryKey,
      args: _args,
      mapArgs: _mapArgs,
      pageParamToArgs,
      queryFn: customFn,
      ...options
    } = overrides;
    const queryKey = resolveKey(
      key,
      ["infinite", args],
      appendQueryKey,
      customKey,
    );
    const queryFn = async (
      context: QueryFunctionContext<QueryKey, TPageParam>,
    ) => {
      if (customFn) return customFn({ ...context, args });
      return fn(
        ...(pageParamToArgs
          ? pageParamToArgs(context.pageParam as TPageParam, [...args] as TArgs)
          : args),
      );
    };
    return {
      ...infiniteQueryOptions<
        TResult,
        DefaultError,
        TData,
        QueryKey,
        TPageParam
      >({ ...options, queryKey, queryFn }),
      queryFn,
    };
  }
  const factory = (...payload: TArgs) =>
    build(payload, {
      initialPageParam: undefined,
      getNextPageParam: () => undefined,
    });
  factory.withOptions = <TPageParam, TData = InfiniteData<TResult, TPageParam>>(
    overrides: InfiniteOptionOverrides<TArgs, TResult, TPageParam, TData>,
    ...payload: TArgs
  ) => build(payload, overrides);
  return factory;
}
