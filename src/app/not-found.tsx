import type { Metadata } from "next";
import { NotFoundView } from "@/components/site/not-found-view";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundView />;
}
