import { createClient } from "@supabase/supabase-js";

// Server-only. Single personal user, no auth, no row-level security: the service-role key
// never reaches the browser because every caller of this is a route handler.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
