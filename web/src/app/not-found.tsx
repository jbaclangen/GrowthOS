import Link from "next/link";

// Any URL the app doesn't have, and any page that calls notFound() (a report, session or invite that doesn't exist
// or belongs to another business).
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
      <div className="card">
        <h1 className="text-xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm">
          The link may be old, or the page may belong to a business you aren&apos;t a member of. If you have more than one
          business, switch to the right one in the header and try again.
        </p>
        <div className="mt-4">
          <Link href="/dashboard" className="btn-primary">
            Go to your dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
