import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { errMsg, MODE_TH } from "../lib";

export default function Admin() {
  const [tab, setTab] = useState("verify");
  return (
    <div className="page">
      <div className="tabs">
        <button className={tab === "verify" ? "on" : ""} onClick={() => setTab("verify")}>ตรวจยืนยันตัวตน</button>
        <button className={tab === "exam" ? "on" : ""} onClick={() => setTab("exam")}>ชุดข้อสอบ & คำถาม</button>
      </div>
      {tab === "verify" ? <VerifyQueue /> : <ExamManager />}
    </div>
  );
}

function VerifyQueue() {
  const [rows, setRows] = useState([]);
  const [urls, setUrls] = useState({});
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.from("verification_requests")
      .select("id,doc_path,selfie_path,created_at,profiles!verification_requests_user_id_fkey(full_name,phone,citizen_id_last4,exam_number)")
      .eq("status", "pending").order("created_at");
    setRows(data || []);
    const u = {};
    for (const r of data || []) {
      const [a, b] = await Promise.all([
        supabase.storage.from("id-docs").createSignedUrl(r.doc_path, 600),
        supabase.storage.from("id-docs").createSignedUrl(r.selfie_path, 600)]);
      u[r.id] = { doc: a.data?.signedUrl, selfie: b.data?.signedUrl };
    }
    setUrls(u);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function review(id, approve) {
    let reason = null;
    if (!approve) { reason = window.prompt("เหตุผลที่ไม่อนุมัติ (ผู้ใช้จะเห็นข้อความนี้)"); if (!reason) return; }
    const { error } = await supabase.rpc("admin_review_verification", { p_request_id: id, p_approve: approve, p_reason: reason });
    setMsg(error ? errMsg(error) : approve ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว");
    load();
  }
  return (<>
    {msg && <div className="notice-box">{msg}</div>}
    {rows.length === 0 && <div className="card">ไม่มีคำขอที่รอตรวจ</div>}
    {rows.map((r) => (
      <div className="card" key={r.id}>
        <b>{r.profiles?.full_name}</b>
        <div className="muted">โทร {r.profiles?.phone} · เลขบัตรลงท้าย {r.profiles?.citizen_id_last4} · เลขสอบ {r.profiles?.exam_number || "-"}</div>
        <div className="imgs">
          {urls[r.id]?.doc && <a href={urls[r.id].doc} target="_blank" rel="noreferrer"><img src={urls[r.id].doc} alt="บัตร" /></a>}
          {urls[r.id]?.selfie && <a href={urls[r.id].selfie} target="_blank" rel="noreferrer"><img src={urls[r.id].selfie} alt="selfie" /></a>}
        </div>
        <div className="row"><button className="btn btn-navy" onClick={() => review(r.id, true)}>อนุมัติ</button>
          <button className="btn btn-outline" onClick={() => review(r.id, false)}>ไม่อนุมัติ</button></div>
      </div>))}
  </>);
}

function ExamManager() {
  const [sets, setSets] = useState([]);
  const [subs, setSubs] = useState([]);
  const [msg, setMsg] = useState("");
  const [s, setS] = useState({ name: "", mode: "practice", time: 0, pass: 0 });
  const blank = { set: "", sub: "", text: "", passage: "", c: ["", "", "", ""], correct: 0, expl: "" };
  const [q, setQ] = useState(blank);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from("exam_sets").select("id,name,mode,question_count").order("created_at", { ascending: false }),
      supabase.from("subcategories").select("id,name").order("sort_order")]);
    setSets(a.data || []); setSubs(b.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createSet(e) {
    e.preventDefault();
    const { error } = await supabase.from("exam_sets").insert({ name: s.name, mode: s.mode, time_limit_minutes: +s.time, pass_score: +s.pass, is_published: true });
    setMsg(error ? errMsg(error) : "สร้างชุดข้อสอบแล้ว"); if (!error) { setS({ ...s, name: "" }); load(); }
  }
  async function addQuestion(e) {
    e.preventDefault();
    if (q.c.some((x) => !x.trim())) return setMsg("กรอกตัวเลือกให้ครบ 4 ข้อ");
    const { data: nq, error } = await supabase.from("questions").insert({
      subcategory_id: q.sub, text: q.text, passage: q.passage || null, choices: q.c, correct_index: +q.correct, explanation: q.expl || "", source_round: "manual",
    }).select("id").single();
    if (error) return setMsg(errMsg(error));
    const { count } = await supabase.from("exam_set_questions").select("id", { count: "exact", head: true }).eq("exam_set_id", q.set);
    const { error: e2 } = await supabase.from("exam_set_questions").insert({ exam_set_id: q.set, question_id: nq.id, position: (count || 0) + 1, points: 2 });
    if (e2) return setMsg(errMsg(e2));
    await supabase.from("exam_sets").update({ question_count: (count || 0) + 1, max_score: ((count || 0) + 1) * 2 }).eq("id", q.set);
    setMsg("เพิ่มคำถามแล้ว"); setQ({ ...blank, set: q.set, sub: q.sub }); load();
  }
  return (<>
    {msg && <div className="notice-box">{msg}</div>}
    <div className="card"><h3 style={{ marginTop: 0 }}>สร้างชุดข้อสอบ</h3>
      <form onSubmit={createSet}>
        <div className="field"><label>ชื่อชุด</label><input required value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></div>
        <div className="field"><label>โหมด</label><select value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value })}>
          {Object.entries(MODE_TH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label>เวลา (นาที, 0 = ไม่จำกัด)</label><input type="number" min="0" value={s.time} onChange={(e) => setS({ ...s, time: e.target.value })} /></div>
        <div className="field"><label>คะแนนผ่าน</label><input type="number" min="0" value={s.pass} onChange={(e) => setS({ ...s, pass: e.target.value })} /></div>
        <button className="btn btn-navy">สร้าง</button></form></div>
    <div className="card"><h3 style={{ marginTop: 0 }}>เพิ่มคำถาม</h3>
      <form onSubmit={addQuestion}>
        <div className="field"><label>เข้าชุดข้อสอบ</label><select required value={q.set} onChange={(e) => setQ({ ...q, set: e.target.value })}>
          <option value="">เลือก...</option>{sets.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.question_count} ข้อ)</option>)}</select></div>
        <div className="field"><label>หมวด</label><select required value={q.sub} onChange={(e) => setQ({ ...q, sub: e.target.value })}>
          <option value="">เลือก...</option>{subs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div className="field"><label>บทความ/เนื้อหาประกอบ (ถ้ามี)</label><textarea rows="3" value={q.passage} onChange={(e) => setQ({ ...q, passage: e.target.value })} /></div>
        <div className="field"><label>โจทย์</label><textarea required rows="3" value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} /></div>
        {q.c.map((c, k) => (<div className="field" key={k}><label>ตัวเลือก {["ก", "ข", "ค", "ง"][k]}</label>
          <input required value={c} onChange={(e) => { const n = [...q.c]; n[k] = e.target.value; setQ({ ...q, c: n }); }} /></div>))}
        <div className="field"><label>ข้อที่ถูก</label><select value={q.correct} onChange={(e) => setQ({ ...q, correct: e.target.value })}>
          {["ก", "ข", "ค", "ง"].map((l, k) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label>เฉลยอธิบาย</label><textarea rows="2" value={q.expl} onChange={(e) => setQ({ ...q, expl: e.target.value })} /></div>
        <button className="btn btn-navy">เพิ่มคำถาม</button></form></div>
  </>);
}
