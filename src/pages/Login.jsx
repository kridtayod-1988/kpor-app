import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { errMsg } from "../lib";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ email: "", password: "", full_name: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
        nav("/");
      } else {
        if (f.password.length < 8) throw new Error("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
        const { data, error } = await supabase.auth.signUp({
          email: f.email, password: f.password,
          options: { data: { full_name: f.full_name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) nav("/register");
        else setInfo("ส่งอีเมลยืนยันแล้ว กรุณากดลิงก์ในอีเมล แล้วกลับมาเข้าสู่ระบบ");
      }
    } catch (e2) { setErr(errMsg(e2)); }
    setBusy(false);
  }

  return (
    <div className="page" style={{ maxWidth: 440 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</h2>
        {err && <div className="error-box">{err}</div>}
        {info && <div className="notice-box">{info}</div>}
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="field"><label>ชื่อ-นามสกุล (ตามบัตรประชาชน)</label>
              <input required value={f.full_name} onChange={set("full_name")} /></div>
          )}
          <div className="field"><label>อีเมล</label>
            <input type="email" required value={f.email} onChange={set("email")} /></div>
          <div className="field"><label>รหัสผ่าน</label>
            <input type="password" required value={f.password} onChange={set("password")} /></div>
          <button className="btn btn-navy btn-block" disabled={busy}>{busy ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</button>
        </form>
        <p style={{ fontSize: 13.5, textAlign: "center" }}>
          {mode === "login" ? "ยังไม่มีบัญชี?" : "มีบัญชีแล้ว?"}{" "}
          <a href="#" style={{ color: "var(--navy-800)", fontWeight: 600 }}
             onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); setErr(""); }}>
            {mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </a>
        </p>
      </div>
    </div>
  );
}
