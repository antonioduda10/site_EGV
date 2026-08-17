import { redirect } from "next/navigation";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "Mídias da galeria",
  description: "Redirecionamento para vídeos e mídias da galeria da Escola Municipal Getúlio Vargas.",
  path: "/galeria/midias"
});

export default async function GaleriaMidiasPublicaPage() {
  redirect("/galeria/videos");
}
