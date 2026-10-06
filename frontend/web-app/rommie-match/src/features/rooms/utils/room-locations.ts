import data from "../data/room-locations.json";

export const roomProvinces = data.provinces;
const normalize = (value: string) => value.trim().toLocaleLowerCase("vi").replace(/^(thành phố|tỉnh|tp\.?)[\s.]*/i, "").replace(/\s+/g, " ");
export function findRoomProvince(value: string) {
  const name = ["tp.hcm", "tphcm", "tp. hcm", "hcm"].includes(value.trim().toLowerCase()) ? "hồ chí minh" : normalize(value);
  return roomProvinces.find(p => normalize(p.name) === name);
}
export function isRoomArea(city: string, area: string) {
  return Boolean(findRoomProvince(city)?.areas.includes(area.trim()));
}
