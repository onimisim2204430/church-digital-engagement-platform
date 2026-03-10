/**
 * DEBUG PAGE — visit /debug-auth while logged in as a moderator
 * Add this route temporarily: <Route path="/debug-auth" element={<DebugAuth />} />
 * Remove after fixing the issue.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

function decodeJwt(token: string | null) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return { error: 'Failed to decode' };
  }
}

const Row = ({ label, value, ok }: { label: string; value: any; ok?: boolean }) => (
  <tr style={{ borderBottom: '1px solid #333' }}>
    <td style={{ padding: '8px 12px', color: '#aaa', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{label}</td>
    <td style={{
      padding: '8px 12px',
      fontFamily: 'monospace',
      color: ok === undefined ? '#eee' : ok ? '#4ade80' : '#f87171',
      wordBreak: 'break-all'
    }}>
      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? 'null')}
    </td>
  </tr>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ background: '#1e3a5f', color: '#60a5fa', padding: '6px 12px', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>
      {title}
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111827' }}>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export default function DebugAuth() {
  const auth = useAuth();
  const [dbResult, setDbResult] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [meResult, setMeResult] = useState<any>(null);
  const [refreshResult, setRefreshResult] = useState<any>(null);

  // Read localStorage
  const rawTokens = localStorage.getItem('auth_tokens');
  const rawAccess = localStorage.getItem('access_token');
  const rawUser = localStorage.getItem('user');
  const parsedTokens = rawTokens ? (() => { try { return JSON.parse(rawTokens); } catch { return { error: 'parse failed' }; } })() : null;
  const accessToken = parsedTokens?.access ?? rawAccess ?? null;
  const decodedJwt = decodeJwt(accessToken);

  const fetchDbPerms = async () => {
    setDbStatus('loading');
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/my-permissions/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await resp.json();
      setDbResult({ status: resp.status, data });
    } catch (e: any) {
      setDbResult({ error: e.message });
    }
    setDbStatus('done');
  };

  const fetchMe = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/me/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await resp.json();
      setMeResult({ status: resp.status, data });
    } catch (e: any) {
      setMeResult({ error: e.message });
    }
  };

  const testRefresh = async () => {
    const refreshToken = parsedTokens?.refresh;
    if (!refreshToken) { setRefreshResult({ error: 'No refresh token in auth_tokens' }); return; }
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
      });
      const data = await resp.json();
      setRefreshResult({ status: resp.status, data });
    } catch (e: any) {
      setRefreshResult({ error: e.message });
    }
  };

  useEffect(() => { fetchDbPerms(); fetchMe(); }, []);

  const btnStyle = {
    background: '#1d4ed8', color: 'white', border: 'none', padding: '8px 16px',
    borderRadius: 6, cursor: 'pointer', marginRight: 8, marginBottom: 8, fontSize: 13
  };

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: 24, color: '#eee', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ color: '#f59e0b', marginBottom: 4 }}>🔍 Auth Debug Page</h1>
        <p style={{ color: '#666', marginBottom: 24, fontSize: 13 }}>
          Real-time snapshot of auth state, localStorage, JWT claims, and DB responses.
        </p>

        <div style={{ marginBottom: 16 }}>
          <button style={btnStyle} onClick={fetchDbPerms}>↺ Re-fetch DB perms</button>
          <button style={btnStyle} onClick={fetchMe}>↺ Re-fetch /me</button>
          <button style={btnStyle} onClick={testRefresh}>↺ Test token refresh</button>
        </div>

        <Section title="1 — REACT AUTH STATE (from useAuth())">
          <Row label="isLoading" value={String(auth.isLoading)} ok={!auth.isLoading} />
          <Row label="isAuthenticated" value={String(auth.isAuthenticated)} ok={auth.isAuthenticated} />
          <Row label="user.email" value={auth.user?.email} />
          <Row label="user.role" value={auth.user?.role} ok={auth.user?.role === 'MODERATOR' || auth.user?.role === 'ADMIN'} />
          <Row label="permissions (state)" value={auth.permissions} ok={auth.permissions.length > 0} />
          <Row label="permissions.length" value={auth.permissions.length} ok={auth.permissions.length > 0} />
          <Row label="tokens.access present" value={String(!!auth.tokens?.access)} ok={!!auth.tokens?.access} />
        </Section>

        <Section title="2 — LOCALSTORAGE">
          <Row label="auth_tokens present" value={String(!!rawTokens)} ok={!!rawTokens} />
          <Row label="access_token (legacy)" value={rawAccess ? rawAccess.substring(0, 30) + '…' : 'null'} />
          <Row label="auth_tokens.access" value={parsedTokens?.access ? parsedTokens.access.substring(0, 30) + '…' : 'null'} ok={!!parsedTokens?.access} />
          <Row label="auth_tokens.refresh" value={parsedTokens?.refresh ? parsedTokens.refresh.substring(0, 30) + '…' : 'null'} ok={!!parsedTokens?.refresh} />
          <Row label="user (stored)" value={rawUser ? JSON.parse(rawUser) : null} />
        </Section>

        <Section title="3 — JWT DECODED CLAIMS">
          <Row label="user_id" value={decodedJwt?.user_id} />
          <Row label="role claim" value={decodedJwt?.role ?? '⚠️ NOT IN TOKEN'} ok={!!decodedJwt?.role} />
          <Row label="permissions claim" value={decodedJwt?.permissions ?? '⚠️ NOT IN TOKEN — this is expected for member login'} ok={Array.isArray(decodedJwt?.permissions)} />
          <Row label="exp" value={decodedJwt?.exp ? new Date(decodedJwt.exp * 1000).toLocaleString() : 'null'} ok={decodedJwt?.exp ? Date.now() < decodedJwt.exp * 1000 : false} />
          <Row label="token expired?" value={decodedJwt?.exp ? String(Date.now() > decodedJwt.exp * 1000) : 'unknown'} ok={decodedJwt?.exp ? Date.now() < decodedJwt.exp * 1000 : false} />
          <Row label="full payload" value={decodedJwt} />
        </Section>

        <Section title="4 — DB: GET /auth/my-permissions/">
          <Row label="status" value={dbStatus} />
          <Row label="http status" value={dbResult?.status} ok={dbResult?.status === 200} />
          <Row label="role (from DB)" value={dbResult?.data?.role} ok={!!dbResult?.data?.role} />
          <Row label="permissions (from DB)" value={dbResult?.data?.permissions} ok={Array.isArray(dbResult?.data?.permissions) && dbResult?.data?.permissions.length > 0} />
          <Row label="permissions.length" value={dbResult?.data?.permissions?.length ?? 'N/A'} ok={(dbResult?.data?.permissions?.length ?? 0) > 0} />
          <Row label="full response" value={dbResult} />
        </Section>

        <Section title="5 — DB: GET /auth/me/">
          <Row label="http status" value={meResult?.status} ok={meResult?.status === 200} />
          <Row label="role" value={meResult?.data?.role} ok={meResult?.data?.role === 'MODERATOR' || meResult?.data?.role === 'ADMIN'} />
          <Row label="full response" value={meResult} />
        </Section>

        <Section title="6 — TOKEN REFRESH TEST">
          <Row label="result" value={refreshResult ?? 'click button above'} ok={refreshResult?.status === 200} />
        </Section>

        <Section title="7 — DIAGNOSIS">
          <Row
            label="Can reach DB endpoint?"
            value={dbResult?.status === 200 ? '✅ YES' : '❌ NO — check backend / CORS / token'}
            ok={dbResult?.status === 200}
          />
          <Row
            label="DB has permissions?"
            value={(dbResult?.data?.permissions?.length ?? 0) > 0 ? '✅ YES — DB is correct' : '❌ NO — permissions not assigned in DB'}
            ok={(dbResult?.data?.permissions?.length ?? 0) > 0}
          />
          <Row
            label="React state has permissions?"
            value={auth.permissions.length > 0 ? '✅ YES' : '❌ NO — state is empty (this is the 403 cause)'}
            ok={auth.permissions.length > 0}
          />
          <Row
            label="State vs DB mismatch?"
            value={
              dbResult?.data?.permissions && auth.permissions.length !== dbResult.data.permissions.length
                ? `❌ YES — DB has ${dbResult.data.permissions.length} but state has ${auth.permissions.length}`
                : '✅ They match'
            }
            ok={dbResult?.data?.permissions ? auth.permissions.length === dbResult.data.permissions.length : undefined}
          />
          <Row
            label="Token expired?"
            value={decodedJwt?.exp ? (Date.now() > decodedJwt.exp * 1000 ? '❌ YES — get a new token' : '✅ Valid') : '?'}
            ok={decodedJwt?.exp ? Date.now() < decodedJwt.exp * 1000 : undefined}
          />
        </Section>
      </div>
    </div>
  );
}
