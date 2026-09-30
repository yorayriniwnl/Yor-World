import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";

export default function NotFound() {
  return <><PageIntro eyebrow="404" title="Page not found"><p>This page is not available. Only verified projects will have published case studies.</p></PageIntro><p><Link href="/projects" prefetch={false}>Go to Projects</Link></p></>;
}
