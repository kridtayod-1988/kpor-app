import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Verify from "./pages/Verify.jsx";
import ExamList from "./pages/ExamList.jsx";
import ExamTaking from "./pages/ExamTaking.jsx";
import Result from "./pages/Result.jsx";
import Admin from "./pages/Admin.jsx";
import { STATUS_TH } from "./lib";

function TopBar() {
  const { session, profile, isAdmin } = useAuth();
  return (
    <div className="topbar">
      <Link to="/" className="brand"><span className="badge">กพ</span>ระบบคลังข้อสอบ ก.พ.</Link>
      {session ? (
        <div className="topright">
          {isAdmin && <Link to="/admin">แผงแอดมิน</Link>}
          {profile && <Link to="/verify" className={"pill " + (profile.verification_status === "verified" ? "ok" : "warn")}>{STATUS_TH[profile.verification_status]}</Link>}
          <span className="hide-sm">{profile?.full_name || session.user.email}</span>
          <button className="btn btn-outline" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
        </div>
      ) : <Link to="/login" className="btn btn-navy">เข้าสู่ระบบ</Link>}
    </div>
  );
}

function RequireAuth({ children, needRegistered = true }) {
  const { session, loading, profile, isRegistered } = useAuth();
  if (loading || (session && !profile)) return <div className="page">กำลังโหลด...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (needRegistered && !isRegistered) return <Navigate to="/register" replace />;
  return children;
}
function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <TopBar />
      <Routes>
        <Route path="/" element={<ExamList />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RequireAuth needRegistered={false}><Register /></RequireAuth>} />
        <Route path="/verify" element={<RequireAuth><Verify /></RequireAuth>} />
        <Route path="/exam/:attemptId" element={<RequireAuth><ExamTaking /></RequireAuth>} />
        <Route path="/result/:attemptId" element={<RequireAuth><Result /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><RequireAdmin><Admin /></RequireAdmin></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
