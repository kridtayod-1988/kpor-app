import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { errMsg } from "../lib";

export default function ExamTaking() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [flag, setFlag] = useState({});
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(null);
  const [err, setErr] = useState("");
  const done = useRef(false);

  useEffect(() => {
    (async () => {
      const { data: a, error: e1 } = await supabase.from("user_attempts")
        .select("id,started_at,finished_at,exam_sets(name,time_limit_minutes)").eq("id", attemptId).single();
      if (e1 || !a) return setErr("ไม่พบการทำข้อสอบนี้");
      if (a.finished_at) return nav(`/result/${attemptId}`, { replace: true });
      setMeta(a);
      const { data, error } = await supabase.rpc("get_attempt_questions", { p_attempt_id: attemptId });
      if (error) return setErr(errMsg(error));
      setQs(data || []);
      const { data: old } = await supabase.from("user_answers").select("question_id,selected_index,is_flagged").eq("attempt_id", attemptId);
      const a2 = {}, f2 = {};
      (old || []).forEach((o) => { a2[o.question_id] = o.selected_index; f2[o.question_id] = o.is_flagged; });
      setAns(a2); setFlag(f2);
    })();
  }, [attemptId]);

  const submit = useCallback(async () => {
    if (done.current) return; done.current = true;
    const { error } = await supabase.rpc("submit_attempt", { p_attempt_id: attemptId });
    if (error) { done.current = false; return setErr(errMsg(error)); }
    nav(`/result/${attemptId}`, { replace: true });
  }, [attemptId, nav]);

  useEffect(() => {
    const mins = meta?.exam_sets?.time_limit_minutes;
    if (!meta || !mins) return;
    const end = new Date(meta.started_at).getTime() + mins * 60000;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(t); submit(); }
    }, 1000);
    return () => clearInterval(t);
  }, [meta, submit]);

  async function save(q, idx, fl) {
    setAns((a) => ({ ...a, [q.question_id]: idx })); setFlag((f) => ({ ...f, [q.question_id]: fl }));
    const { error } = await supabase.rpc("upsert_answer", { p_attempt_id: attemptId, p_question_id: q.question_id, p_selected_index: idx, p_is_flagged: fl });
    if (error) setErr(errMsg(error));
  }

  if (err && !qs.length) return <div className="page"><div className="error-box">{err}</div></div>;
  if (!qs.length) return <div className="page">{meta ? "ชุดข้อสอบนี้ยังไม่มีคำถาม" : "กำลังโหลด..."}</div>;
  const q = qs[i];
  const mm = left != null ? `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` : "--:--";
  const answered = Object.values(ans).filter((v) => v != null).length;

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12 }}>
        <b style={{ flex: 1 }}>{meta?.exam_sets?.name}</b>
        <span className={"mono timer" + (left != null && left < 300 ? " low" : "")}>{mm}</span>
      </div>
      {err && <div className="error-box">{err}</div>}
      <div className="card">
        <div className="muted">ข้อ {i + 1} / {qs.length}</div>
        {q.passage && <div className="passage">{q.passage}</div>}
        <p style={{ fontSize: 17, whiteSpace: "pre-wrap" }}>{q.text}</p>
        {(q.choices || []).map((c, k) => (
          <div key={k} className={"opt" + (ans[q.question_id] === k ? " sel" : "")} onClick={() => save(q, k, !!flag[q.question_id])}>
            <span className="letter">{["ก", "ข", "ค", "ง", "จ", "ฉ"][k]}</span><span>{typeof c === "string" ? c : c.text}</span>
          </div>
        ))}
        <label className="check"><input type="checkbox" checked={!!flag[q.question_id]}
          onChange={(e) => save(q, ans[q.question_id] ?? null, e.target.checked)} /> ทำเครื่องหมายไว้กลับมาดู</label>
      </div>
      <div className="row">
        <button className="btn btn-outline" disabled={i === 0} onClick={() => setI(i - 1)}>ก่อนหน้า</button>
        <span className="muted" style={{ flex: 1, textAlign: "center" }}>ตอบแล้ว {answered}/{qs.length}</span>
        {i < qs.length - 1
          ? <button className="btn btn-navy" onClick={() => setI(i + 1)}>ถัดไป</button>
          : <button className="btn btn-navy" onClick={() => window.confirm(`ตอบแล้ว ${answered}/${qs.length} ข้อ ยืนยันส่งข้อสอบ?`) && submit()}>ส่งข้อสอบ</button>}
      </div>
      <div className="grid">{qs.map((x, k) => (
        <button key={x.question_id} onClick={() => setI(k)}
          className={"dot" + (k === i ? " cur" : "") + (ans[x.question_id] != null ? " ans" : "") + (flag[x.question_id] ? " flg" : "")}>{k + 1}</button>))}
      </div>
    </div>
  );
}
