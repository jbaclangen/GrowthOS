import Link from "next/link";
import { Band } from "@/components/ui";

export default function NotFound() {
  return (
    <Band>
      <p className="section-head">Page not found</p>
      <h1 className="mt-3 text-4xl">That page doesn&apos;t exist.</h1>
      <p className="mt-3 text-muted">It may have moved. Try the home page, or tell us what you were looking for.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">
          Go to the home page
        </Link>
        <Link href="/contact" className="btn-secondary">
          Contact us
        </Link>
      </div>
    </Band>
  );
}
