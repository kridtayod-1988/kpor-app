import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { MODE_TH, STATUS_TH, errMsg } from "../lib";

export default function ExamList() {
  const nav = useNavigate();
  const { session, profile, isVerified, isAdmin } = useAuth();
  const [sets, setSets] = useState([]);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.from("exam_sets").select("id,name,description,mode,question_count,max_score,pass_score,time_limit_minutes")
      .eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => setSets(data || []));
  }, []);
  useEffect(() => {
    if (!session) return;
    supabase.from("user_attempts").select("id,raw_score,max_score,passed,finished_at,exam_sets(name)")
      .not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(8)
      .then(({ data }) => setHistory(data || []));
  }, [session]);

  async function start(set) {
    setErr("");
    if (!session) return nav("/login");
    const { data, error } = await supabase.rpc("start_attempt", { p_exam_set_id: set.id });
    if (error) return setErr(errMsg(error));
    nav(`/exam/${data}`);
  }
  const locked = (s) => s.mode !== "practice" && !isVerified && !isAdmin;

  return (
    <div className="page">
      <h2 style={{ marginTop: 0 }}>คลังข้อสอบ</h2>
      {session && profile && !isVerified && (
        <div className="notice-box">
          สถานะ: {STATUS_TH[profile.verification_status]} — ข้อสอบโหมดสนามจริง/ย้อนหลังต้องยืนยันตัวตนก่อน{" "}
          <Link to={profile.registered_at ? "/verify" : "/register"} style={{ fontWeight: 700 }}>ดำเนินการต่อ</Link>
        </div>
      )}
      {err && <div className="error-box">{err}</div>}
      {sets.length === 0 && <div className="card">ยังไม่มีชุดข้อสอบที่เปิดให้ทำ</div>}
      {sets.map((s) => (
        <div className="card row" key={s.id}>
          <div style={{ flex: 1 }}>
            <b>{s.name}</b> <span className="tag">{MODE_TH[s.mode]}</span>
            <div className="muted">{s.question_count} ข้อ · {s.time_limit_minutes ? s.time_limit_minutes + " นาที" : "ไม่จำกัดเวลา"} · ผ่าน {s.pass_score}/{s.max_score}</div>
            {s.description && <div className="muted">{s.description}</div>}
          </div>
          <button className="btn btn-navy" disabled={locked(s)} onClick={() => start(s)}>{locked(s) ? "ต้องยืนยันตัวตน" : "เริ่มทำ"}</button>
        </div>
      ))}
      {history.length > 0 && (<>
        <h3>ผลสอบล่าสุด</h3>
        <table><thead><tr><th>ชุดข้อสอบ</th><th>คะแนน</th><th>ผล</th><th>วันที่</th><th></th></tr></thead><tbody>
          {history.map((h) => (<tr key={h.id}><td>{h.exam_sets?.name || "-"}</td><td className="mono">{h.raw_score}/{h.max_score}</td>
            <td><span className={"pill " + (h.passed ? "ok" : "bad")}>{h.passed ? "ผ่าน" : "ไม่ผ่าน"}</span></td>
            <td>{new Date(h.finished_at).toLocaleDateString("th-TH")}</td><td><Link to={`/result/${h.id}`}>ดูเฉลย</Link></td></tr>))}
        </tbody></table></>)}
    </div>
  );
}
