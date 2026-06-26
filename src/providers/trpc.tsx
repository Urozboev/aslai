/**
 * tRPC mos shim — sahifalar avvalgidek `trpc.business.list.useQuery(...)`
 * ko'rinishida chaqiradi, lekin ostida @tanstack/react-query + Supabase
 * resolverlari ishlaydi. Backend (Node/tRPC server) endi kerak emas.
 */
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { resolvers } from "@/lib/resolvers";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyOpts = any;

function useQueryHook(path: string, input: unknown, opts?: AnyOpts) {
  return useQuery({
    queryKey: [path, input ?? null],
    queryFn: () => {
      const resolver = resolvers[path];
      if (!resolver) throw new Error(`Resolver topilmadi: ${path}`);
      return resolver(input as Record<string, unknown> | undefined);
    },
    ...(opts ?? {}),
  });
}

function useMutationHook(path: string, opts?: AnyOpts) {
  return useMutation({
    mutationFn: (input: unknown) => {
      const resolver = resolvers[path];
      if (!resolver) throw new Error(`Resolver topilmadi: ${path}`);
      return resolver(input as Record<string, unknown> | undefined);
    },
    ...(opts ?? {}),
  });
}

// path bo'yicha so'rovlarni bekor qilish uchun utils proxy
function createUtilsProxy(qc: QueryClient, path: string[]): AnyOpts {
  return new Proxy(
    {},
    {
      get(_t, key: string) {
        if (key === "invalidate") {
          return () =>
            path.length
              ? qc.invalidateQueries({ queryKey: [path.join(".")] })
              : qc.invalidateQueries();
        }
        return createUtilsProxy(qc, [...path, key]);
      },
    },
  );
}

function useUtils(): AnyOpts {
  const qc = useQueryClient();
  return createUtilsProxy(qc, []);
}

// trpc.<router>.<procedure>.useQuery / .useMutation proxysi
function createProcProxy(path: string[]): AnyOpts {
  return new Proxy(
    {},
    {
      get(_t, key: string) {
        if (key === "useQuery") {
          return (input?: unknown, opts?: AnyOpts) =>
            useQueryHook(path.join("."), input, opts);
        }
        if (key === "useMutation") {
          return (opts?: AnyOpts) => useMutationHook(path.join("."), opts);
        }
        return createProcProxy([...path, key]);
      },
    },
  );
}

export const trpc: AnyOpts = new Proxy(
  {},
  {
    get(_t, key: string) {
      if (key === "useUtils") return useUtils;
      return createProcProxy([key]);
    },
  },
);

export function TRPCProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
