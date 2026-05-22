import test from "node:test";
import assert from "node:assert/strict";

import {
  infiniteOption,
  mutationOption,
  queryOption,
} from "../dist/index.js";
import { generateOptionsCode } from "../dist/core/generator.js";

test("queryOption.withOptions can rewrite args and append query key metadata", async () => {
  const getUsers = async (params) => ({
    page: params.page,
    headers: params.headers,
  });

  const optionFactory = queryOption(["users"], getUsers);
  const option = optionFactory.withOptions(
    {
      mapArgs: ([params]) => [
        {
          ...params,
          headers: {
            ...params.headers,
            Authorization: "Bearer token",
          },
        },
      ],
      appendQueryKey: ["authorized"],
    },
    { page: 1, headers: { "x-base": "1" } }
  );

  assert.deepEqual(option.queryKey, [
    "users",
    {
      page: 1,
      headers: {
        "x-base": "1",
        Authorization: "Bearer token",
      },
    },
    "authorized",
  ]);
  assert.deepEqual(await option.queryFn({ queryKey: option.queryKey, signal: new AbortController().signal, meta: undefined, client: {} }), {
    page: 1,
    headers: {
      "x-base": "1",
      Authorization: "Bearer token",
    },
  });
});

test("infiniteOption.withOptions can map pageParam into request args", async () => {
  const getUsers = async (params) => params.page;
  const optionFactory = infiniteOption(["users"], getUsers);
  const option = optionFactory.withOptions(
    {
      initialPageParam: 1,
      pageParamToArgs: (pageParam, [params]) => [{ ...params, page: pageParam }],
      getNextPageParam: (lastPage) => lastPage + 1,
    },
    { page: 0 }
  );

  assert.equal(option.initialPageParam, 1);
  assert.equal(
    await option.queryFn({
      queryKey: option.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
      pageParam: 3,
      direction: "forward",
      client: {},
    }),
    3
  );
});

test("mutationOption.withOptions can normalize mutateAsync variables", async () => {
  const updateUser = async (id, payload, headers) => ({ id, payload, headers });
  const optionFactory = mutationOption(["users", "update"], updateUser);
  const option = optionFactory.withOptions({
    mapVariablesToArgs: ({ id, payload }) => [id, payload, { Authorization: "Bearer token" }],
  });

  const result = await option.mutationFn({ id: "u1", payload: { nickname: "neo" } });
  assert.deepEqual(result, {
    id: "u1",
    payload: { nickname: "neo" },
    headers: { Authorization: "Bearer token" },
  });
});

test("generateOptionsCode uses smart artifact inference by default", () => {
  const code = generateOptionsCode(
    [
      { name: "getUsers", parameters: [], isAsync: true, isExported: true },
      { name: "createUser", parameters: [], isAsync: true, isExported: true },
    ],
    "@/apis/users",
    {
      keySegments: ["users"],
      fileName: "users",
      templateImportPath: "@uiwwsw/react-query-helper",
      template: {
        enabledArtifacts: ["query", "mutation", "infinite"],
      },
    }
  );

  assert.match(code, /getUsersQueryOption/);
  assert.match(code, /getUsersInfiniteQueryOption/);
  assert.doesNotMatch(code, /getUsersMutationOption/);
  assert.match(code, /createUserMutationOption/);
  assert.doesNotMatch(code, /createUserQueryOption/);
  assert.doesNotMatch(code, /createUserInfiniteQueryOption/);
});
