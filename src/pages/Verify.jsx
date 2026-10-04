import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { Steps } from "./Register";
import { STATUS_TH, errMsg } from "../lib";

export default function Verify() {
  const nav = useNavigate();
  const { session, profile, refreshProfile } = useAuth();
  const [doc, setDoc] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const st = profile?.verification_status;

  async function up(file, name) {
    if (file.size > 5 * 1024 * 1024) throw new Error("ไฟล์ต้องไม่เกิน 5MB");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${session.user.id}/${name}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("id-docs").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return path;
  }
  async function submit(e) {
    e.preventDefault(); setErr("");
    if (!doc || !selfie) return setErr("กรุณาแนบรูปให้ครบทั้ง 2 รูป");
    setBusy(true);
    try {
      const [p1, p2] = [await up(doc, "card"), await up(selfie, "selfie")];
      const { error } = await supabase.rpc("submit_verification", { p_doc_path: p1, p_selfie_path: p2 });
      if (error) throw error;
      await refreshProfile();
    } catch (e2) { setErr(errMsg(e2)); }
    setBusy(false);
  }

  if (st === "verified") {
    return (<div className="page" style={{ maxWidth: 560 }}><Steps current={4} />
      <div className="card"><h2 style={{ marginTop: 0 }}>ยืนยันตัวตนสำเร็จ</h2>
        <p>คุณเข้าสอบได้ทุกโหมดแล้ว</p>
        <button className="btn btn-navy" onClick={() => nav("/")}>ไปที่คลังข้อสอบ</button></div></div>);
  }
  if (st === "pending") {
    return (<div className="page" style={{ maxWidth: 560 }}><Steps current={3} />
      <div className="card"><h2 style={{ marginTop: 0 }}>{STATUS_TH.pending}</h2>
        <p>ส่งเอกสารเรียบร้อยแล้ว เจ้าหน้าที่จะตรวจสอบและอนุมัติ ระหว่างนี้ฝึกทำข้อสอบโหมด "ฝึกทำ" ได้</p>
        <button className="btn btn-outline" onClick={refreshProfile}>รีเฟรชสถานะ</button></div></div>);
  }
  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <Steps current={2} />
      <div className="card">
        <h2 style={{ marginTop: 0 }}>ยืนยันตัวตน</h2>
        {st === "rejected" && <div className="error-box">ไม่ผ่านการยืนยัน: {profile.verification_note || "กรุณาส่งเอกสารใหม่"}</div>}
        <p className="muted">รูปจะถูกเก็บแบบส่วนตัว เฉพาะเจ้าหน้าที่ที่ได้รับสิทธิ์เท่านั้นที่เปิดดูได้ ใช้ตรวจสอบกับเลข {profile?.citizen_id_last4 ? "…" + profile.citizen_id_last4 : ""} ที่ลงทะเบียนไว้</p>
        {err && <div className="error-box">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>1) รูปบัตรประชาชน (เห็นชื่อและเลขชัดเจน)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setDoc(e.target.files[0])} /></div>
          <div className="field"><label>2) รูปถ่ายตนเองถือบัตรประชาชน</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={(e) => setSelfie(e.target.files[0])} /></div>
          <button className="btn btn-navy btn-block" disabled={busy}>{busy ? "กำลังอัปโหลด..." : "ส่งเพื่อตรวจสอบ"}</button>
        </form>
      </div>
    </div>
  );
}
