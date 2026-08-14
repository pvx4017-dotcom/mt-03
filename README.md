# Meta Business (React + TypeScript + Vite)

Shopping marketplace SPA — **ข้อมูลอยู่บน Supabase Postgres**  
- **รูปสินค้าที่มีอยู่แล้ว** → เก็บใน `public/images` ของโปรเจกต์ (path ใน DB เช่น `images/store_product_…`)  
- **รูปร้านค้า + สินค้าที่อัปโหลดใหม่** → Supabase Storage bucket `uploads` (path ใน DB เช่น `shops/…`, `products/…`)  
- **รูปอื่น** (แชท, KYC, หมวด, สไลด์) → bucket เดียวกัน

## สร้างฐานข้อมูลใหม่ (แนะนำเมื่อโปรเจกต์เก่าโควตาเต็ม)

คุณสร้างโปรเจกต์ Supabase ใหม่เองได้ แล้วใช้ไฟล์ใน repo นี้ seed ให้เหมือนเดิม:

1. ไปที่ [supabase.com](https://supabase.com) → **New project** (ชื่ออะไรก็ได้) รอจน Ready  
2. คัดลอก **Project URL** + **anon public key** จาก Settings → API  
3. ใส่ใน `.env` (ดู `.env.example`)  
4. เปิด **SQL Editor** → วางเนื้อหาทั้งไฟล์ [`database.sql`](database.sql) → **Run**  
   - มีตาราง + ข้อมูลสินค้า/ร้าน/หมวด/สไลด์ + บัญชีทดสอบครบ  
   - path รูปชี้ไปที่ไฟล์ใน `public/images` ที่มีอยู่ในโปรเจกต์แล้ว  
5. รัน [`scripts/setup-storage-uploads.sql`](scripts/setup-storage-uploads.sql) สำหรับ Storage (แชท/KYC/หมวด/สไลด์/ร้าน/สินค้าใหม่)  
6. ตรวจว่าพร้อมใช้:
   ```bash
   yarn db:verify
   yarn images:audit
   yarn dev
   ```
7. (ทางเลือก) ลบโปรเจกต์ Supabase เก่าทิ้งได้เมื่อของใหม่ใช้งานได้แล้ว

### บัญชีทดสอบหลังรัน `database.sql`

| บทบาท | บัญชี | รหัสผ่าน |
|--------|--------|----------|
| Admin | `admin@meta.local` | `admin123` |
| Super Admin | `superadmin@meta.local` | `superadmin123` |
| Customer | `+66812345678` | `123456` |
| รหัสเชิญสมัคร | `12345` | — |

### รูปภาพ

| ประเภท | ที่เก็บ | Production |
|--------|---------|------------|
| สินค้าเดิมในแคตตาล็อก | `public/images` ใน GitHub | ต้อง commit + push ถึงขึ้น |
| รูปร้านค้า / สินค้าที่อัปโหลดใหม่ | Supabase Storage | ขึ้นทันทีหลังอัปโหลด |
| แชท / KYC / หมวด / สไลด์ | Supabase Storage | ขึ้นทันทีหลังอัปโหลด |

```bash
yarn images:audit                 # ตรวจรูปแคตตาล็อกเดิมใน public/
yarn images:pull --skip-existing  # ดึงรูป catalog ลง public/ (ถ้ายังไม่ครบ)
```

อย่าใช้ `yarn images:mirror` (เลิกใช้แล้ว)

## Production บน Vercel ไม่ขึ้นสินค้า

แอปเป็น SPA ที่ **ฝังค่า env ตอน `yarn build`** ไฟล์ `.env` บนเครื่องถูก gitignore จึง **ไม่ไปกับ GitHub/Vercel**

ต้องตั้งใน Vercel → Project → **Settings → Environment Variables** (อย่างน้อย Production):

| ชื่อ | ค่า |
|------|------|
| `VITE_SUPABASE_URL` | Project URL จาก Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | anon public key จากหน้าเดียวกัน |

แล้ว **Redeploy** (Deployments → ⋯ → Redeploy) เพราะแก้ env อย่างเดียวไม่รีบิลด์ให้

ถ้าไม่ตั้งสองค่านี้ หน้าแรกจะว่าง (เดิมโค้ดคืน `[]` เงียบ ๆ) — ตอนนี้ build จะล้มพร้อมข้อความชัดเจน

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
