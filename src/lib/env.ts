// Swipo fonctionne en « mode démonstration » tant que Supabase n'est pas configuré :
// les écrans s'affichent avec des données d'exemple et rien n'est enregistré.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isDemo = !supabaseUrl || !supabaseAnonKey;
