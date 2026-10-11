import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NAV, PRIMARY_CTA, SIGN_IN_URL } from "@/lib/site";

// Logo left, navigation, Sign in (text link) and the primary call to action right (WEBSITE_MESSAGING §2).
// Below the md breakpoint the navigation folds into a native <details> menu: no JavaScript needed.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Braventa home" className="text-foreground">
          <Logo height={28} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 text-sm lg:flex">
          <a href={SIGN_IN_URL} className="text-muted hover:text-foreground">
            Sign in
          </a>
          <Link href={PRIMARY_CTA.href} className="btn-primary">
            {PRIMARY_CTA.label}
          </Link>
        </div>
        <details className="group relative lg:hidden">
          <summary className="btn-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden">Menu</summary>
          <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-md">
            <nav aria-label="Main" className="flex flex-col">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md px-3 py-3 text-sm hover:bg-surface-muted">
                  {item.label}
                </Link>
              ))}
              <a href={SIGN_IN_URL} className="rounded-md px-3 py-3 text-sm hover:bg-surface-muted">
                Sign in
              </a>
            </nav>
            <Link href={PRIMARY_CTA.href} className="btn-primary mt-2 w-full">
              {PRIMARY_CTA.label}
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
