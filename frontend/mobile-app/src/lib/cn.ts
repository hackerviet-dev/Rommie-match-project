export function cn(...classes: Array<false | null | undefined | string>) {
  return classes.filter(Boolean).join(" ");
}
