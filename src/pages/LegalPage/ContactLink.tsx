import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

export function ContactLink() {
  return <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;
}
