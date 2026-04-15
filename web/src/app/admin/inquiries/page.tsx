'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

type Inquiry = {
  id: string; name: string; email: string; phone: string | null; content: string;
  source: string; status: string; reply: string | null; repliedAt: string | null;
  repliedBy: string | null; metadata: Record<string, unknown> | null;
  createdAt: string; updatedAt: string;
  user: { email: string; name: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = { pending: '미답변', replied: '답변완료', closed: '종료' };
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
  replied: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
  closed: { bg: 'var(--adm-surface-2)', text: 'var(--adm-text-muted)' },
};

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const load = (status?: string) => {
    const params = new URLSearchParams({ page: '1', limit: '50' });
    if (status) params.set('status', status);
    authFetch(`/inquiry?${params}`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setInquiries(d.inquiries); setTotal(d.total); }
    });
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (s: string) => {
    setFilterStatus(s);
    load(s);
  };

  const openDetail = (inq: Inquiry) => {
    setSelected(inq);
    setReplyText(inq.reply || '');
    setChatOpen(false);
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await authFetch(`/inquiry/${selected.id}/reply`, {
        method: 'PATCH',
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelected(updated);
        setInquiries(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
      }
    } finally {
      setReplying(false);
    }
  };

  const handleClose = async () => {
    if (!selected) return;
    const res = await authFetch(`/inquiry/${selected.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      setInquiries(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
    }
  };

  const pendingCount = inquiries.filter(i => i.status === 'pending').length;
  const chatHistory = selected?.metadata && typeof selected.metadata === 'object' && 'chatHistory' in selected.metadata
    ? (selected.metadata as { chatHistory?: { role: string; text: string }[] }).chatHistory
    : null;

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 'calc(100vh - 48px)' }}>
      {/* 왼쪽: 목록 */}
      <div style={{ width: selected ? 380 : '100%', flexShrink: 0, transition: 'width 0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>문의 관리</h1>
          {pendingCount > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 12 }}>
              미답변 {pendingCount}건
            </span>
          )}
        </div>

        {/* 필터 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[{ key: '', label: '전체' }, { key: 'pending', label: '미답변' }, { key: 'replied', label: '답변완료' }, { key: 'closed', label: '종료' }].map(f => (
            <button key={f.key} onClick={() => handleFilter(f.key)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 13, cursor: 'pointer', background: filterStatus === f.key ? '#3182f6' : 'var(--adm-surface-2)', color: filterStatus === f.key ? '#fff' : 'var(--adm-text-sec)' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* 문의 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {inquiries.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--adm-text-muted)' }}>문의가 없습니다.</div>
          )}
          {inquiries.map(inq => {
            const sc = STATUS_COLORS[inq.status] || STATUS_COLORS.pending;
            return (
              <div key={inq.id} onClick={() => openDetail(inq)}
                style={{
                  background: selected?.id === inq.id ? 'var(--adm-hover)' : 'var(--adm-surface)',
                  borderRadius: 12, border: `1px solid ${selected?.id === inq.id ? '#6366f1' : 'var(--adm-border)'}`,
                  padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{inq.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>{inq.email}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: sc.bg, color: sc.text }}>
                    {STATUS_LABELS[inq.status] || inq.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--adm-text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inq.content}
                </div>
                <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginTop: 6, display: 'flex', gap: 12 }}>
                  <span>{new Date(inq.createdAt).toLocaleString('ko-KR')}</span>
                  <span>{inq.source}</span>
                  {inq.phone && <span>{inq.phone}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--adm-text-muted)' }}>총 {total}건</div>
      </div>

      {/* 오른쪽: 상세 */}
      {selected && (
        <div style={{ flex: 1, background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: 24, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>문의 상세</h2>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--adm-text-muted)' }}>&times;</button>
          </div>

          {/* 문의자 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginBottom: 2 }}>이름</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginBottom: 2 }}>이메일</div>
              <div style={{ fontSize: 14 }}>{selected.email}</div>
            </div>
            {selected.phone && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginBottom: 2 }}>전화번호</div>
                <div style={{ fontSize: 14 }}>{selected.phone}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginBottom: 2 }}>접수일</div>
              <div style={{ fontSize: 14 }}>{new Date(selected.createdAt).toLocaleString('ko-KR')}</div>
            </div>
          </div>

          {/* 문의 내용 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--adm-text-sec)', marginBottom: 8 }}>문의 내용</div>
            <div style={{ background: 'var(--adm-surface-2)', borderRadius: 10, padding: 16, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {selected.content}
            </div>
          </div>

          {/* 채팅 내역 */}
          {chatHistory && chatHistory.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => setChatOpen(!chatOpen)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
              }}>
                {chatOpen ? '▼' : '▶'} 챗봇 대화 내역 ({chatHistory.length}건)
              </button>
              {chatOpen && (
                <div style={{ background: 'var(--adm-surface-2)', borderRadius: 10, padding: 12, maxHeight: 200, overflowY: 'auto' }}>
                  {chatHistory.map((msg, i) => (
                    <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: msg.role === 'user' ? '#3182f6' : '#22c55e' }}>
                        {msg.role === 'user' ? '고객' : 'AI'}:
                      </span>{' '}
                      <span style={{ color: 'var(--adm-text-sec)' }}>{msg.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 기존 답변 */}
          {selected.reply && selected.status !== 'pending' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 8 }}>
                답변 ({selected.repliedBy}, {selected.repliedAt ? new Date(selected.repliedAt).toLocaleString('ko-KR') : ''})
              </div>
              <div style={{ background: 'rgba(34,197,94,0.05)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)', padding: 16, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {selected.reply}
              </div>
            </div>
          )}

          {/* 답변 작성 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--adm-text-sec)', marginBottom: 8 }}>답변 작성</div>
            <textarea
              value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="답변을 입력하세요..."
              rows={4}
              style={{
                width: '100%', borderRadius: 10, border: '1px solid var(--adm-border)',
                background: 'var(--adm-surface-2)', padding: 14, fontSize: 14,
                color: 'var(--adm-text)', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleReply} disabled={replying || !replyText.trim()}
              style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#3182f6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: replying || !replyText.trim() ? 0.5 : 1 }}>
              {replying ? '전송 중...' : '답변 보내기'}
            </button>
            {selected.status !== 'closed' && (
              <button onClick={handleClose}
                style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-sec)', fontSize: 14, cursor: 'pointer' }}>
                종료 처리
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
