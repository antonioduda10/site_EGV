import type { Metadata } from "next";

const siteName = "Portal EGV";
const schoolName = "Escola Municipal Getúlio Vargas";
const defaultDescription = "Portal institucional da Escola Municipal Getúlio Vargas.";

type PublicMetadataInput = {
  title: string;
  description?: string | null;
  path?: string;
  image?: string | null;
  type?: "website" | "article";
};

export function createPublicMetadata({
  title,
  description,
  path,
  image,
  type = "website"
}: PublicMetadataInput): Metadata {
  const safeDescription = description?.trim() || defaultDescription;
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const images = image ? [{ url: image, alt: title }] : undefined;

  return {
    title: fullTitle,
    description: safeDescription,
    alternates: path ? { canonical: path } : undefined,
    openGraph: {
      title: fullTitle,
      description: safeDescription,
      url: path,
      siteName: `${siteName} - ${schoolName}`,
      locale: "pt_BR",
      type,
      images
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description: safeDescription,
      images: image ? [image] : undefined
    }
  };
}

export function stripHtmlToText(value?: string | null, maxLength = 160) {
  return (value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
