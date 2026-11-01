import { getTranslations } from "next-intl/server";
import { createDrama } from "@/app/actions/admin";
import { DramaForm } from "@/components/admin/drama-form";

export default async function NewDrama() {
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display mb-6 text-3xl font-extrabold tracking-tight">{t("newDrama")}</h1>
      <DramaForm action={createDrama} />
    </div>
  );
}
