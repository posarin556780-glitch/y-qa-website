/*
  ตั้งค่าไฟล์นี้หลังสร้างโปรเจกต์ Supabase
  ใช้ Project URL และ Publishable key (หรือ anon key แบบเก่า)
  ห้ามใส่ service_role key หรือ secret key ในเว็บไซต์
*/
window.APP_CONFIG = {
  SUPABASE_URL: "ใส่_PROJECT_URL_ที่นี่",
  SUPABASE_KEY: "ใส่_PUBLISHABLE_KEY_ที่นี่",
  // URL ของหน้าเว็บหลัก เช่น https://yourname.github.io/my-qa-site/
  // ถ้าปล่อยว่าง ระบบจะใช้ที่อยู่เว็บปัจจุบัน
  SITE_URL: ""
};
