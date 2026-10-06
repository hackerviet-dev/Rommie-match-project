const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const scales = ["", "nghìn", "triệu", "tỷ"];

function readGroup(value: number, fullHundreds: boolean): string {
  const hundreds = Math.floor(value / 100), tens = Math.floor(value / 10) % 10, ones = value % 10;
  const words: string[] = [];
  if (hundreds || fullHundreds) words.push(digits[hundreds], "trăm");
  if (tens > 1) words.push(digits[tens], "mươi");
  else if (tens === 1) words.push("mười");
  else if (ones && (hundreds || fullHundreds)) words.push("lẻ");
  if (ones) words.push(ones === 1 && tens > 1 ? "mốt" : ones === 5 && tens > 0 ? "lăm" : digits[ones]);
  return words.join(" ");
}

/** Same integer VND range as the room schema; never read an invalid draft as money. */
export function vietnameseMoney(value: unknown): string | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  let amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1e9) return null;
  if (!amount) return "Không đồng";
  const groups: number[] = [];
  while (amount) { groups.push(amount % 1000); amount = Math.floor(amount / 1000); }
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i]) words.push(readGroup(groups[i], words.length > 0), scales[i]);
  }
  const result = words.filter(Boolean).join(" ") + " đồng";
  return result[0].toLocaleUpperCase("vi") + result.slice(1);
}
