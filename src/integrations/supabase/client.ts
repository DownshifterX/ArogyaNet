// Supabase was removed from this project and replaced with a backend API.
// To avoid runtime errors from leftover imports, export a lightweight shim
// that provides the subset of the Supabase client API used by the frontend.
// This shim returns safe default values and logs a warning.

const warn = (msg: string) => console.warn(`[supabase-shim] ${msg}`);

const noopAsync = async () => ({ data: null, error: null });

const supabase = {
  auth: {
    signInWithPassword: async (..._args: any[]) => {
      warn('signInWithPassword called on shim; no-op');
      return { data: { user: null }, error: null };
    },
    signUp: async (..._args: any[]) => {
      warn('signUp called on shim; no-op');
      return { data: { user: null }, error: null };
    },
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_handler: any) => {
      warn('onAuthStateChange called on shim; returning dummy subscription');
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signOut: async () => ({ error: null }),
  },

  from: (_tableName: string) => ({
    select: (_sel?: any) => ({
      eq: (_col: string, _val: any) => ({
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
      }),
      maybeSingle: async () => ({ data: null, error: null }),
    }),
    insert: async (_payload: any) => ({ data: null, error: null }),
    update: async (_payload: any) => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
  }),

  storage: {
    from: (_bucket: string) => ({
      upload: async (_path: string, _file: any) => ({ error: null }),
      download: async (_path: string) => ({ data: null, error: null }),
    }),
  },

  functions: {
    invoke: async (_fn: string, _opts?: any) => ({ data: null, error: null }),
  },
};

export { supabase };