# ระบบคลังข้อสอบ ก.พ. (kpor) — React + Vite + Supabase

ลงทะเบียน → ยืนยันอีเมล → กรอกข้อมูล + ยอมรับ PDPA → อัปโหลดบัตร/selfie → แอดมินอนุมัติ → สอบสนามจริงได้

## รันบนเครื่อง
```
npm install
cp .env.example .env   # ใส่ URL + anon key จาก Supabase > Project Settings > API
npm run dev
```

## ฐานข้อมูล
Schema อยู่ในโปรเจกต์ Supabase `kpor` แล้ว (migrations: `registration_identity_verification`, `fix_protect_profile_bypass`
ดูได้ที่ Dashboard > Database > Migrations) — เลขบัตรเก็บเป็น HMAC + 4 ตัวท้าย, รูปบัตรอยู่ใน bucket private `id-docs`,
คำถามอ่านได้ผ่าน RPC เท่านั้น (ไม่ส่งเฉลยไปหน้าสอบ)

## ตั้งแอดมินคนแรก (รันใน SQL Editor)
```sql
update profiles set role='admin', verification_status='verified'
where id = (select id from auth.users where email='อีเมลของคุณ');
```

## Deploy (Vercel)
1. `git init && git add . && git commit -m "init" && git remote add origin <repo-url> && git push -u origin main`
2. Vercel > Import repo > ใส่ env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` > Deploy
3. Supabase > Authentication > URL Configuration: ใส่โดเมน Vercel ใน Site URL / Redirect URLs
