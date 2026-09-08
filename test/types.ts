import {
  QueryClient,
  useQuery,
  useSuspenseQuery,
  useInfiniteQuery,
  useMutation,
  skipToken,
  type InfiniteData,
} from "@tanstack/react-query";
import { queryOption, mutationOption, infiniteOption } from "../dist/index.js";

const client = new QueryClient();
const user = queryOption(["user"], async (id: string) => ({
  id,
  name: "Name",
}));
const options = user("1");
const cached = client.getQueryData(options.queryKey);
const cacheShape: { id: string; name: string } | undefined = cached;
const fetched: Promise<{ id: string; name: string }> =
  client.fetchQuery(options);
const selected = user.withOptions({ select: (data) => data.name }, "1");
const selectedData: string | undefined = useQuery(selected).data;
const initialized: string = useQuery(
  user.withOptions(
    {
      initialData: { id: "1", name: "Initial" },
      select: (data) => data.name,
    },
    "1",
  ),
).data;
const suspenseData: string = useSuspenseQuery(selected).data;
const err: Error | null = useQuery(options).error;
useQuery({ ...options, queryFn: Math.random() ? options.queryFn : skipToken });
user.withOptions(
  {
    queryFn: ({ client, signal, args }) => {
      client.getQueryData(["another"]);
      signal.throwIfAborted();
      return { id: args[0], name: "Name" };
    },
  },
  "1",
);
// @ts-expect-error query argument types must be preserved
user(1);
// @ts-expect-error cached data is associated with the function result
const wrongCache: string | undefined = cached;

const pages = infiniteOption(["items"], (params: { page: number }) => ({
  next: params.page + 1,
  items: ["a"],
}));
const paged = pages.withOptions(
  {
    initialPageParam: 0,
    pageParamToArgs: (page, [params]) => [{ ...params, page }],
    getNextPageParam: (last) => (last.next < 3 ? last.next : undefined),
    maxPages: 2,
  },
  { page: 0 },
);
const infiniteData:
  | InfiniteData<{ next: number; items: string[] }, number>
  | undefined = useInfiniteQuery(paged).data;
const names = pages.withOptions(
  {
    initialPageParam: 0,
    getNextPageParam: (last) => last.next,
    select: (data) => data.pages.flatMap((p) => p.items),
  },
  { page: 0 },
);
const selectedPages: string[] | undefined = useInfiniteQuery(names).data;
client.fetchInfiniteQuery(paged);

const arrayMutation = mutationOption(["save"], (ids: string[]) => ids.length);
mutationOption(["array"], (ids: string[]) => ids.length, {
  // @ts-expect-error single arrays use single-variable mode, not tuple mode
  variablesMode: "tuple",
});
useMutation(arrayMutation()).mutate(["a"]);
const optional = mutationOption(["optional"], (id?: string) => id ?? "none");
useMutation(optional()).mutate();
const noargs = mutationOption(["noargs"], () => 1);
useMutation(noargs()).mutate();
const tuple = mutationOption(
  ["multi"],
  (id: string, active: boolean) => ({ id, active }),
  { variablesMode: "tuple" },
);
useMutation(tuple()).mutate(["1", true]);
// @ts-expect-error multiple parameters require explicit argument mapping
mutationOption(["bad"], (id: string, active: boolean) => id);
// @ts-expect-error array payload must be an array
useMutation(arrayMutation()).mutate("a");
const optimistic = arrayMutation.withOptions({
  onMutate: (ids) => ({ previous: ids.length }),
  onError: (_error, _variables, rollback, context) => {
    const previous: number | undefined = rollback?.previous;
    context.client.getQueryData(["saved"]);
  },
  mutationFn: ({ args, client }) => {
    client.getQueryData(["saved"]);
    return args[0].length;
  },
});
useMutation(optimistic);
