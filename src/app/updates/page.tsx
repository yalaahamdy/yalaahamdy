import type { Metadata } from "next";
import { UpdatesView } from "@/components/apps/updates-view";

export const metadata: Metadata = {
  title: "أحدث التحديثات",
  description:
    "كل إصدار جديد من كل التطبيقات مرتَّب حسب التاريخ — ملاحظات نشر حقيقية وتواريخ وروابط تنزيل مباشرة من GitHub.",
  alternates: { canonical: "/updates/" },
};

export default function UpdatesPage() {
  return <UpdatesView />;
}
