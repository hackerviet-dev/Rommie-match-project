import { extendTailwindMerge } from "tailwind-merge";

// Gộp class như web (twMerge): class truyền vào sau thắng class mặc định của component,
// ví dụ <Card className="bg-navy" /> thay được "bg-white".
const twMerge = extendTailwindMerge({
  extend: { theme: { colors: ["navy", "teal", "mint", "ink", "paper"] } },
});

export function cn(...classes: Array<false | null | undefined | string>) {
  return twMerge(classes.filter(Boolean).join(" "));
}
