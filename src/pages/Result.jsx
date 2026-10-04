import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { errMsg } from "../lib";

export default function Result() {
  const { attemptId } = useParams();
  const [a, setA] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("user_attempts").select("raw_score,max_score,passed,elapsed_seconds,exam_sets(name,pass_score)").eq("id", attemptId).single();
      setA(data);
      const { data: r, error } = await supabase.rpc("get_attempt_review", { p_attempt_id: attemptId });
      if (error) setErr(errMsg(error)); else setRows(r || []);
    })();
  }, [attemptId]);
  if (!a) return <div className="page">{err || "กำลังโหลด..."}</div>;
  const ok = rows.filter((r) => r.is_correct).length;
  const skip = rows.filter((r) => r.selected_index == null).length;
  return (
    <div className="page">
      <div className="card row">
        <div style={{ flex: 1 }}><div className="muted">{a.exam_sets?.name}</div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 700 }}>{a.raw_score}<small>/{a.max_score}</small></div></div>
        <span className={"pill big " + (a.passed ? "ok" : "bad")}>{a.passed ? "ผ่าน" : "ไม่ผ่าน"}</span>
      </div>
      <div className="stats">
        <div><b className="ok-t">{ok}</b>ถูก</div><div><b className="bad-t">{rows.length - ok - skip}</b>ผิด</div>
        <div><b>{skip}</b>เว้น</div><div><b>{Math.round((a.elapsed_seconds || 0) / 60)}</b>นาที</div>
      </div>
      {err && <div className="error-box">{err}</div>}
      {rows.map((r, n) => (
        <div className="card" key={r.question_id}>
          <div className="muted">ข้อ {n + 1} · {r.is_correct ? "ถูก" : r.selected_index == null ? "เว้น" : "ผิด"}</div>
          {r.passage && <div className="passage">{r.passage}</div>}
          <p style={{ whiteSpace: "pre-wrap" }}>{r.text}</p>
          {(r.choices || []).map((c, k) => (
            <div key={k} className={"opt" + (k === r.correct_index ? " right" : k === r.selected_index ? " wrong" : "")}>
              <span className="letter">{["ก", "ข", "ค", "ง", "จ", "ฉ"][k]}</span>{typeof c === "string" ? c : c.text}</div>))}
          {r.explanation && <div className="notice-box" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{r.explanation}</div>}
        </div>
      ))}
      <Link to="/" className="btn btn-navy">กลับคลังข้อสอบ</Link>
    </div>
  );
}
