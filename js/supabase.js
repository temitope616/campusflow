// ============================================
// CAMPUSFLOW SUPABASE CONFIGURATION
// ============================================

// Replace with your Supabase Project URL
const SUPABASE_URL = "https://yfwxwqvksdsugxizaksj.supabase.co";

// Replace with your Publishable (Anon) Key
const SUPABASE_ANON_KEY = "sb_publishable_vvacDvbRi-H7XcBesuCmmw_rcTe6gwO";

// Create Supabase Client
const sb = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// Make the client available globally
window.sb = sb;

console.log("✅ Supabase Connected Successfully");





