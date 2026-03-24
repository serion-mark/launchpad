'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  provider: string;
  createdAt: string;
}

export default function ProfileTab() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editing, setEditing] = useState<'name' | 'company' | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // 비밀번호 변경 모달
  const [pwModal, setPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authFetch('/auth/me');
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || '');
      setEditCompany(data.company || '');
    } catch {
      // handled by authFetch 401
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (field: 'name' | 'company') => {
    setSaving(true);
    setMsg('');
    try {
      const body = field === 'name' ? { name: editName } : { company: editCompany };
      const res = await authFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMsg('저장되었습니다');
        setEditing(null);
        loadProfile();
      } else {
        const err = await res.json();
        setMsg(err.message || '저장 실패');
      }
    } catch {
      setMsg('네트워크 오류');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const changePassword = async () => {
    setPwError('');
    if (newPw.length < 8) { setPwError('새 비밀번호는 8자 이상이어야 합니다'); return; }
    if (newPw !== confirmPw) { setPwError('비밀번호가 일치하지 않습니다'); return; }
    if (!currentPw) { setPwError('현재 비밀번호를 입력해주세요'); return; }

    setPwLoading(true);
    try {
      const res = await authFetch('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.ok) {
        setPwModal(false);
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setMsg('비밀번호가 변경되었습니다');
        setTimeout(() => setMsg(''), 3000);
      } else {
        const err = await res.json();
        setPwError(err.message || '비밀번호 변경 실패');
      }
    } catch {
      setPwError('네트워크 오류');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3182f6] border-t-transparent" />
      </div>
    );
  }

  if (!profile) return <div className="text-[#8b95a1] py-10 text-center">프로필을 불러올 수 없습니다</div>;

  return (
    <div className="space-y-6">
      {msg && (
        <div className="rounded-xl bg-[#3182f6]/10 border border-[#3182f6]/20 px-4 py-3 text-sm text-[#3182f6]">
          {msg}
        </div>
      )}

      <div className="rounded-2xl bg-[#17171c] border border-[#2c2c35] p-6 space-y-5">
        <h2 className="text-lg font-bold text-[#f2f4f6]">내 정보</h2>

        {/* 이름 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-[#8b95a1]">이름</span>
            {editing === 'name' ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="rounded-lg bg-[#2c2c35] border border-[#3a3a45] px-3 py-2 text-sm text-[#f2f4f6] outline-none focus:border-[#3182f6]"
                  autoFocus
                />
                <button onClick={() => saveField('name')} disabled={saving} className="rounded-lg bg-[#3182f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1b64da] disabled:opacity-50">저장</button>
                <button onClick={() => setEditing(null)} className="text-xs text-[#6b7684]">취소</button>
              </div>
            ) : (
              <p className="text-[#f2f4f6] mt-0.5">{profile.name || '미설정'}</p>
            )}
          </div>
          {editing !== 'name' && (
            <button onClick={() => setEditing('name')} className="text-sm text-[#3182f6] hover:text-[#1b64da]">수정</button>
          )}
        </div>

        {/* 이메일 */}
        <div>
          <span className="text-sm text-[#8b95a1]">이메일</span>
          <p className="text-[#f2f4f6] mt-0.5">{profile.email}</p>
        </div>

        {/* 회사명 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-[#8b95a1]">회사명</span>
            {editing === 'company' ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  value={editCompany}
                  onChange={e => setEditCompany(e.target.value)}
                  className="rounded-lg bg-[#2c2c35] border border-[#3a3a45] px-3 py-2 text-sm text-[#f2f4f6] outline-none focus:border-[#3182f6]"
                  autoFocus
                />
                <button onClick={() => saveField('company')} disabled={saving} className="rounded-lg bg-[#3182f6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1b64da] disabled:opacity-50">저장</button>
                <button onClick={() => setEditing(null)} className="text-xs text-[#6b7684]">취소</button>
              </div>
            ) : (
              <p className="text-[#f2f4f6] mt-0.5">{profile.company || '미설정'}</p>
            )}
          </div>
          {editing !== 'company' && (
            <button onClick={() => setEditing('company')} className="text-sm text-[#3182f6] hover:text-[#1b64da]">수정</button>
          )}
        </div>

        {/* 가입일 */}
        <div>
          <span className="text-sm text-[#8b95a1]">가입일</span>
          <p className="text-[#f2f4f6] mt-0.5">{new Date(profile.createdAt).toLocaleDateString('ko-KR')}</p>
        </div>

        <div className="border-t border-[#2c2c35] pt-4 flex gap-3">
          {profile.provider === 'email' && (
            <button
              onClick={() => setPwModal(true)}
              className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm font-medium text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors"
            >
              비밀번호 변경
            </button>
          )}
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPwModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#17171c] border border-[#2c2c35] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#f2f4f6]">비밀번호 변경</h3>

            {pwError && (
              <div className="rounded-lg bg-[#f45452]/10 border border-[#f45452]/20 px-3 py-2 text-sm text-[#f45452]">
                {pwError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#8b95a1] mb-1">현재 비밀번호</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="w-full rounded-lg bg-[#2c2c35] border border-[#3a3a45] px-4 py-3 text-sm text-[#f2f4f6] outline-none focus:border-[#3182f6]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8b95a1] mb-1">새 비밀번호 (8자 이상)</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full rounded-lg bg-[#2c2c35] border border-[#3a3a45] px-4 py-3 text-sm text-[#f2f4f6] outline-none focus:border-[#3182f6]"
                  placeholder="8자 이상 입력"
                />
                {newPw && newPw.length < 8 && (
                  <p className="text-xs text-[#f45452] mt-1">8자 이상 입력해주세요</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-[#8b95a1] mb-1">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="w-full rounded-lg bg-[#2c2c35] border border-[#3a3a45] px-4 py-3 text-sm text-[#f2f4f6] outline-none focus:border-[#3182f6]"
                  placeholder="다시 한번 입력"
                />
                {confirmPw && newPw !== confirmPw && (
                  <p className="text-xs text-[#f45452] mt-1">비밀번호가 일치하지 않습니다</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPwModal(false)} className="rounded-xl px-4 py-2.5 text-sm text-[#8b95a1] hover:text-[#f2f4f6]">취소</button>
              <button
                onClick={changePassword}
                disabled={pwLoading || newPw.length < 8 || newPw !== confirmPw || !currentPw}
                className="rounded-xl bg-[#3182f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1b64da] disabled:opacity-50 transition-colors"
              >
                {pwLoading ? '변경 중...' : '변경하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
