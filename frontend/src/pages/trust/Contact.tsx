import { Github, Mail, MapPin } from "lucide-react";
import { site } from "@/lib/site";
import { TrustLayout } from "./TrustLayout";

export default function Contact() {
  const items = [
    { icon: Mail, title: "Email support", body: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> },
    { icon: Github, title: "Bugs & feature requests", body: <a href={`${site.githubUrl}/issues`} target="_blank" rel="noreferrer">Open an issue on GitHub</a> },
    { icon: MapPin, title: "Address", body: <span>{site.contactAddress}</span> },
  ];
  return (
    <TrustLayout title="Contact us" subtitle="Questions, feedback or need help with an integration? We’d love to hear from you.">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-line bg-surface p-5">
            <Icon className="h-5 w-5 text-muted" aria-hidden />
            <p className="mt-3 font-medium text-fg">{title}</p>
            <div className="mt-1 break-words text-sm">{body}</div>
          </div>
        ))}
      </div>
      <p className="text-sm">
        For payment issues, include the invoice ID and transaction signature shown on your receipt. For urgent matters, put “Urgent” in the subject line.
      </p>
    </TrustLayout>
  );
}
