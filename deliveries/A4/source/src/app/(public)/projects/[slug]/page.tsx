import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPublication, findPublishedProject } from "@/content/publication-reader";
import { CaseStudy } from "@/features/portfolio/case-study";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const publication = await readPublication();
  return publication.projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const publication = await readPublication();
  const project = findPublishedProject(publication, slug);

  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project case study could not be found or is unpublished.",
    };
  }

  return {
    title: `${project.title} — Case Study`,
    description: project.summary,
    alternates: {
      canonical: `/projects/${project.slug}`,
    },
    openGraph: {
      title: `${project.title} — Case Study`,
      description: project.summary,
      url: `https://www.yorayriniwnl.in/projects/${project.slug}`,
      type: "article",
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const publication = await readPublication();
  const project = findPublishedProject(publication, slug);

  if (!project) {
    // If the slug is unknown or represents an unpublished project (like candidatex),
    // trigger standard 404 behavior per Engineering Spec §7.
    notFound();
  }

  return <CaseStudy project={project} />;
}
