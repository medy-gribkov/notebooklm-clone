import { vi } from "vitest";

/**
 * Creates a mock Supabase client with chainable query builder.
 * Each method returns `this` for chaining, except terminal methods that return data.
 */
export function createMockSupabaseClient(overrides?: {
  user?: { id: string; email: string } | null;
  queryResult?: { data: unknown; error: unknown };
}) {
  const user = overrides?.user ?? { id: "user-123", email: "test@test.com" };
  const queryResult = overrides?.queryResult ?? { data: [], error: null };

  const chainable = () => {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "eq", "in", "order", "limit", "single", "delete", "insert", "update", "neq"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    // Terminal: resolve with queryResult
    chain.then = (resolve: (val: unknown) => void) => resolve(queryResult);
    // Make it thenable
    Object.defineProperty(chain, "then", {
      value: (resolve: (val: unknown) => void) => {
        Promise.resolve(queryResult).then(resolve);
      },
      writable: true,
    });
    // Allow await directly
    return Object.assign(Promise.resolve(queryResult), chain);
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockImplementation(() => chainable()),
    rpc: vi.fn().mockResolvedValue(queryResult),
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({}),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url" } }),
      }),
    },
  };
}
