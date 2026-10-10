import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

// Entry point. Also catches confirmation links that Supabase sends to the Site URL root.
export default function Home(props: PageProps<"/">) {
  return (
    <Suspense fallback={null}>
      <Route {...props} />
    </Suspense>
  );
}

async function Route({ searchParams }: PageProps<"/">): Promise<React.ReactNode> {
  const { code } = await searchParams;
  if (typeof code === "string") redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/onboarding`);
  redirect((await getUser()) ? "/dashboard" : "/login");
}
