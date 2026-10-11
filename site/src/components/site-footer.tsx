import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { FOOTER } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo height={26} />
          <p className="mt-3 max-w-xs text-sm text-muted">Run your growth as one system.</p>
        </div>
        {FOOTER.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="eyebrow">{group.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-7xl px-4 py-5 text-xs text-muted sm:px-6">
          © 2026 Braventa. Nothing is published for your business without your approval.
        </p>
      </div>
    </footer>
  );
}
