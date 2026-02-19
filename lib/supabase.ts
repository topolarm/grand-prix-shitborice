import { createClient } from "@supabase/supabase-js";

// Anon key je veřejný (public) - Supabase ho standardně používá i v prohlížeči.
// Bezpečnost řeší RLS policies v Supabase, ne utajení klíče.
const SUPABASE_URL = "https://nwlzbbrogykhsvenhbuf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bHpiYnJvZ3lraHN2ZW5oYnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjksImV4cCI6MjA4NzEwMTMyOX0.4KqoaJ8bXeQUQk2v3XUwqvaydtDV1SKiQ9RbxnNpWoM";

export function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
