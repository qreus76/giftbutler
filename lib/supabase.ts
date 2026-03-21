import { createClient } from "@supabase/supabase-js";

// Public client — respects RLS (for reads)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin client — bypasses RLS (for server-side writes only)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Profile = {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  birthday: string | null;
  created_at: string;
};

export type Occasion = {
  id: string;
  user_id: string;
  name: string;
  date: string | null;
  created_at: string;
};

export type Hint = {
  id: string;
  user_id: string;
  content: string;
  category: string;
  created_at: string;
  url?: string | null;
  product_title?: string | null;
  product_image?: string | null;
  product_price?: string | null;
};
