import type { Metadata } from "next";
import { Suspense } from "react";
import { Band, PageHero } from "@/components/ui";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Request early access to Braventa, book a walkthrough, or ask a question about your business.",
};

export default function Contact(props: PageProps<"/contact">) {
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to us.">
        Request early access, book a walkthrough, or send a question. We reply by email.
      </PageHero>
      <Band>
        <div className="mx-auto max-w-3xl">
          <Suspense fallback={<div className="card h-96" aria-busy="true" />}>
            <Form {...props} />
          </Suspense>
        </div>
      </Band>
    </>
  );
}

async function Form({ searchParams }: PageProps<"/contact">) {
  const { intent } = await searchParams;
  const value = typeof intent === "string" && ["early_access", "demo", "question"].includes(intent) ? intent : "question";
  return <ContactForm intent={value} />;
}
