"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SignOutButton(): React.JSX.Element {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="dash-sign-out">
      Sign out
    </button>
  );
}
