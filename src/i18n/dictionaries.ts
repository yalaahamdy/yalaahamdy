import { ar } from "./ar";
import { en, type Dictionary } from "./en";
import type { Locale } from "./config";

export const dictionaries: Record<Locale, Dictionary> = { ar, en };
