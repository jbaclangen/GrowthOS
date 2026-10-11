import { Band } from "@/components/ui";

// Legal pages (Q-032): factual drafts until a lawyer has drafted or reviewed the final text.
export default function LegalLayout({ children }: LayoutProps<"/legal">) {
  return (
    <Band>
      <div className="prose-legal">{children}</div>
    </Band>
  );
}
