import { QueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { queryOption, mutationOption, infiniteOption } from "../dist/index.js";
class ApiError extends Error {
  code = "API";
}
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
    queryKey: ["domain", ...ReadonlyArray<unknown>];
    mutationKey: ["domain", ...ReadonlyArray<unknown>];
  }
}
const query = queryOption(["domain", "user"], () => ({ name: "Ada" }))();
const error: ApiError | null = useQuery(query).error;
const data = new QueryClient().getQueryData(query.queryKey);
const shape: { name: string } | undefined = data;
useMutation(mutationOption(["domain", "save"], (id: string) => id)());
infiniteOption(["domain"], () => 1)();
// @ts-expect-error keys must respect the application Register
queryOption(["outside"], () => 1);
