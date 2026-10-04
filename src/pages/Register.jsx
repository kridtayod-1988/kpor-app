import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { validCitizenId, errMsg } from "../lib";

export default function Register() {
  const nav = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [terms, setTerms] = useState(null);
  const [f, setF] = useState({ full_name: "", phone: "", citizen_id: "", exam_number: "" });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from("terms_versions").select("id, version, content").eq("is_active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setTerms(data));
  }, []);
  useEffect(() => { if (profile?.full_name && !f.full_name) setF((x) => ({ ...x, full_name: profile.full_name })); }, [profile]);

  async function submit(e) {
    e.preventDefault(); setErr("");
    if (!validCitizenId(f.citizen_id)) return setErr("เลขบัตรประชาชนไม่ถูกต้อง (ตรวจสอบ 13 หลักอีกครั้ง)");
    if (!terms) return setErr("ยังไม่มีเงื่อนไขการใช้งานที่เปิดใช้ กรุณาติดต่อผู้ดูแลระบบ");
    if (!agree) return setErr("กรุณายอมรับเงื่อนไขและนโยบายข้อมูลส่วนบุคคล");
    setBusy(true);
    const { error } = await supabase.rpc("complete_registration", {
      p_full_name: f.full_name, p_phone: f.phone, p_citizen_id: f.citizen_id,
      p_exam_number: f.exam_number, p_terms_version_id: terms.id,
    });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    await refreshProfile();
    nav("/verify");
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <Steps current={1} />
      <div className="card">
        <h2 style={{ marginTop: 0 }}>ข้อมูลผู้เข้าสอบ</h2>
        <p className="muted">เลขบัตรประชาชนใช้ตรวจสอบตัวตนและป้องกันการสมัครซ้ำ ระบบเก็บเป็นค่าเข้ารหัสและเลข 4 ตัวท้ายเท่านั้น</p>
        {err && <div className="error-box">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>ชื่อ-นามสกุล</label><input required value={f.full_name} onChange={set("full_name")} /></div>
          <div className="field"><label>เบอร์โทรศัพท์</label><input required inputMode="numeric" placeholder="0812345678" value={f.phone} onChange={set("phone")} /></div>
          <div className="field"><label>เลขบัตรประชาชน 13 หลัก</label><input required inputMode="numeric" maxLength={13} value={f.citizen_id} onChange={set("citizen_id")} /></div>
          <div className="field"><label>เลขประจำตัวสอบ (ถ้ามี)</label><input value={f.exam_number} onChange={set("exam_number")} /></div>
          {terms && (
            <details className="terms"><summary>อ่านเงื่อนไขการใช้งาน (เวอร์ชัน {terms.version})</summary>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{terms.content}</div></details>
          )}
          <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            ข้าพเจ้ายอมรับเงื่อนไขการใช้งานและให้ความยินยอมเก็บ ใช้ ข้อมูลส่วนบุคคลเพื่อการยืนยันตัวตน</label>
          <button className="btn btn-navy btn-block" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึกและไปขั้นตอนยืนยันตัวตน"}</button>
        </form>
      </div>
    </div>
  );
}

export function Steps({ current }) {
  const s = ["สมัครสมาชิก", "ข้อมูลผู้เข้าสอบ", "ยืนยันตัวตน", "อนุมัติ"];
  return (
    <div className="steps">{s.map((t, i) => (
      <div key={t} className={"step" + (i < current ? " done" : i === current ? " now" : "")}><span>{i + 1}</span>{t}</div>))}
    </div>
  );
}
