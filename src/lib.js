// ตรวจเลขบัตรประชาชนไทย 13 หลัก (checksum เดียวกับฝั่งฐานข้อมูล)
export function validCitizenId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let s = 0;
  for (let i = 0; i < 12; i++) s += Number(id[i]) * (13 - i);
  return (11 - (s % 11)) % 10 === Number(id[12]);
}
export const STATUS_TH = {
  unverified: "ยังไม่ยืนยันตัวตน",
  pending: "รอเจ้าหน้าที่ตรวจสอบ",
  verified: "ยืนยันตัวตนแล้ว",
  rejected: "ไม่ผ่านการยืนยัน",
};
export const MODE_TH = { simulation: "สนามจริง", practice: "ฝึกทำ", archive: "ข้อสอบย้อนหลัง", workshop: "Workshop", category: "รายหมวด" };
export const errMsg = (e) => e?.message?.replace(/^.*?:\s*/, "") || "เกิดข้อผิดพลาด";
