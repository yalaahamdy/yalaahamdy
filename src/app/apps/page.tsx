import type { Metadata } from "next";
import { AppsView } from "@/components/apps/apps-view";

export const metadata: Metadata = {
  title: "كل التطبيقات",
  description:
    "استعرض كل التطبيقات المنشورة على GitHub — ابحث بالاسم أو الوصف، صفِّ حسب التصنيف والمنصة، ورتِّب حسب أحدث إصدار أو عدد التنزيلات.",
  alternates: { canonical: "/apps/" },
};

export default function AppsPage() {
  return <AppsView />;
}
