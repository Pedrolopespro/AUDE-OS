import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client com service role — bypassa RLS. Uso exclusivo em código de servidor
// que precisa ler/escrever credencial_cifrada ou criar registros de sistema.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
