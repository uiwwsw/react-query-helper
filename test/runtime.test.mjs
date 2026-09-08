import test from "node:test";
import assert from "node:assert/strict";
import {
  QueryClient,
  InfiniteQueryObserver,
  MutationObserver,
} from "@tanstack/react-query";
import { queryOption, mutationOption, infiniteOption } from "../dist/index.js";

test("array, optional, default, tuple and rest mutations preserve arguments", async () => {
  const context = { client: new QueryClient() };
  const array = mutationOption(["array"], (ids) => ids);
  assert.deepEqual(await array().mutationFn(["a", "b"], context), ["a", "b"]);
  assert.deepEqual(await array().mutationFn([], context), []);
  const optional = mutationOption(["default"], (value = ["default"]) => value);
  assert.deepEqual(await optional().mutationFn(undefined, context), [
    "default",
  ]);
  const tuple = mutationOption(
    ["tuple"],
    (first, second = "default") => [first, second],
    { variablesMode: "tuple" },
  );
  assert.deepEqual(await tuple().mutationFn(["first"], context), [
    "first",
    "default",
  ]);
  const rest = mutationOption(["rest"], (...values) => values, {
    variablesMode: "tuple",
  });
  assert.deepEqual(await rest().mutationFn(["a", "b"], context), ["a", "b"]);
  await assert.rejects(tuple().mutationFn("invalid", context), /array/);
  context.client.clear();
});

test("sync throws become rejected promises for all helper functions", async () => {
  const failure = () => {
    throw new Error("API failed");
  };
  await assert.rejects(queryOption(["q"], failure)().queryFn({}), /API failed/);
  await assert.rejects(
    infiniteOption(["i"], failure)().queryFn({}),
    /API failed/,
  );
  await assert.rejects(
    mutationOption(["m"], failure)().mutationFn(undefined, {}),
    /API failed/,
  );
});

test("query and infinite caches are isolated and QueryClient defaults are honored", async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: 2000, retry: false, staleTime: 1234 },
    },
  });
  const fn = () => ({ items: ["one"], next: 1 });
  const query = queryOption(["same"], fn)();
  const infinite = infiniteOption(["same"], fn)();
  assert.notDeepEqual(query.queryKey, infinite.queryKey);
  const optional = (value) => value;
  assert.notDeepEqual(
    queryOption(["key"], optional)("infinite").queryKey,
    infiniteOption(["key"], optional)().queryKey,
  );
  assert.equal(query.gcTime, undefined);
  assert.equal(query.refetchOnWindowFocus, undefined);
  await client.fetchQuery(query);
  await client.fetchInfiniteQuery(infinite);
  assert.deepEqual(client.getQueryData(query.queryKey), {
    items: ["one"],
    next: 1,
  });
  assert.deepEqual(client.getQueryData(infinite.queryKey).pages, [
    { items: ["one"], next: 1 },
  ]);
  assert.equal(
    client.getQueryCache().find({ queryKey: query.queryKey }).options.staleTime,
    1234,
  );
  client.clear();
});

test("infinite pagination handles zero cursor, terminates and respects maxPages without mutating args", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const payload = Object.freeze({ page: 9 });
  const factory = infiniteOption(["pages"], ({ page }) => ({
    page,
    next: page < 2 ? page + 1 : undefined,
  }));
  const options = factory.withOptions(
    {
      initialPageParam: 0,
      maxPages: 2,
      pageParamToArgs: (page, [args]) => [{ ...args, page }],
      getNextPageParam: (last) => last.next,
    },
    payload,
  );
  const observer = new InfiniteQueryObserver(client, options);
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data.pages[0].page, 0);
  await observer.fetchNextPage();
  await observer.fetchNextPage();
  assert.deepEqual(
    observer.getCurrentResult().data.pages.map((p) => p.page),
    [1, 2],
  );
  assert.equal(observer.getCurrentResult().hasNextPage, false);
  assert.equal(payload.page, 9);
  observer.destroy();
  client.clear();
});

test("query overrides forward QueryClient and cancellation to the API", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let signalSeen, started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const options = queryOption(["cancel"], () => "unused").withOptions({
    queryFn: ({ client: suppliedClient, signal }) => {
      assert.equal(suppliedClient, client);
      signalSeen = signal;
      started();
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted"))),
      );
    },
  });
  const result = client.fetchQuery(options);
  await ready;
  await client.cancelQueries({ queryKey: options.queryKey });
  await assert.rejects(result);
  assert.equal(signalSeen.aborted, true);
  client.clear();
});

test("mutation context and optimistic rollback survive wrappers", async () => {
  const client = new QueryClient();
  let rollback;
  const factory = mutationOption(["save"], (value) => value);
  const observer = new MutationObserver(
    client,
    factory.withOptions({
      retry: false,
      onMutate: (variables) => ({ before: variables }),
      mutationFn: ({ client: suppliedClient, variables, args }) => {
        assert.equal(client, suppliedClient);
        assert.equal(variables, args[0]);
        throw new Error("rollback");
      },
      onError: (_err, _variables, snapshot) => {
        rollback = snapshot;
      },
    }),
  );
  await assert.rejects(observer.mutate("previous"), /rollback/);
  assert.deepEqual(rollback, { before: "previous" });
  client.clear();
});
