'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

interface BusinessInfo {
  businessName: string | null;
  businessNumber: string | null;
  representative: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
}

interface ChargeItem {
  date: string;
  packageName: string;
  credits: number;
  price: number;
  method: string;
  paymentRefId: string | null;
}

export default function BillingTab() {
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BusinessInfo>({
    businessName: '', businessNumber: '', representative: '',
    businessAddress: '', businessPhone: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // 이용 가능한 월 목록 (최근 6개월)
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bizRes, chargesRes] = await Promise.all([
        authFetch('/auth/business-info'),
        authFetch('/credits/charges'),
      ]);
      const bizData = await bizRes.json();
      const chargesData = await chargesRes.json();
      setBusiness(bizData);
      setForm({
        businessName: bizData.businessName || '',
        businessNumber: bizData.businessNumber || '',
        representative: bizData.representative || '',
        businessAddress: bizData.businessAddress || '',
        businessPhone: bizData.businessPhone || '',
      });
      setCharges(chargesData.charges.filter((c: ChargeItem) => c.price > 0));
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  const saveBusiness = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/auth/business-info', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg('저장되었습니다');
        setEditing(false);
        loadData();
      }
    } catch {
      setMsg('저장 실패');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const downloadPdf = async (month: string) => {
    setPdfLoading(month);
    try {
      const res = await authFetch(`/credits/report?month=${month}`);
      const data = await res.json();

      // 클라이언트에서 PDF 대신 이용내역서 HTML을 새 탭에서 열고 인쇄
      const html = generateReportHtml(data, month);
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        w.onload = () => {
          setTimeout(() => w.print(), 500);
        };
      }
    } catch {
      setMsg('이용내역서 생성 실패');
      setTimeout(() => setMsg(''), 2000);
    } finally {
      setPdfLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3182f6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="rounded-xl bg-[#3182f6]/10 border border-[#3182f6]/20 px-4 py-3 text-sm text-[#3182f6]">
          {msg}
        </div>
      )}

      {/* 사업자 정보 */}
      <div className="rounded-2xl bg-[#17171c] border border-[#2c2c35] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#f2f4f6]">사업자 정보</h3>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm text-[#3182f6] hover:text-[#1b64da]">
              수정
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            {[
              { key: 'businessName' as const, label: '상호' },
              { key: 'businessNumber' as const, label: '사업자등록번호' },
              { key: 'representative' as const, label: '대표자' },
              { key: 'businessAddress' as const, label: '주소' },
              { key: 'businessPhone' as const, label: '전화번호' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm text-[#8b95a1] mb-1">{field.label}</label>
                <input
                  value={form[field.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-lg bg-[#2c2c35] border border-[#3a3a45] px-4 py-2.5 text-sm text-[#f2f4f6] outline-none focus:border-[#3182f6]"
                  placeholder={field.label}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={saveBusiness} disabled={saving} className="rounded-xl bg-[#3182f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b64da] disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-[#8b95a1]">취소</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex"><span className="w-28 text-[#8b95a1]">상호</span><span className="text-[#f2f4f6]">{business?.businessName || '미설정'}</span></div>
            <div className="flex"><span className="w-28 text-[#8b95a1]">사업자번호</span><span className="text-[#f2f4f6]">{business?.businessNumber || '미설정'}</span></div>
            <div className="flex"><span className="w-28 text-[#8b95a1]">대표자</span><span className="text-[#f2f4f6]">{business?.representative || '미설정'}</span></div>
            <div className="flex"><span className="w-28 text-[#8b95a1]">주소</span><span className="text-[#f2f4f6]">{business?.businessAddress || '미설정'}</span></div>
            <div className="flex"><span className="w-28 text-[#8b95a1]">전화번호</span><span className="text-[#f2f4f6]">{business?.businessPhone || '미설정'}</span></div>
          </div>
        )}
      </div>

      {/* 이용내역서 */}
      <div className="rounded-2xl bg-[#17171c] border border-[#2c2c35] p-6">
        <h3 className="text-base font-bold text-[#f2f4f6] mb-4">이용내역서</h3>
        <p className="text-xs text-[#6b7684] mb-4">정부지원사업비 정산 증빙 자료로 사용 가능합니다</p>
        <div className="space-y-2">
          {months.map(month => {
            const [y, m] = month.split('-');
            return (
              <div key={month} className="flex items-center justify-between rounded-xl bg-[#1b1b21] px-4 py-3">
                <span className="text-sm text-[#f2f4f6]">{y}년 {parseInt(m)}월 이용내역서</span>
                <button
                  onClick={() => downloadPdf(month)}
                  disabled={pdfLoading === month}
                  className="rounded-lg bg-[#2c2c35] px-3 py-1.5 text-xs font-medium text-[#3182f6] hover:bg-[#3a3a45] disabled:opacity-50 transition-colors"
                >
                  {pdfLoading === month ? '생성 중...' : 'PDF 다운로드'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 세금계산서 (결제 내역 기반) */}
      {charges.length > 0 && (
        <div className="rounded-2xl bg-[#17171c] border border-[#2c2c35] p-6">
          <h3 className="text-base font-bold text-[#f2f4f6] mb-4">결제 영수증</h3>
          <div className="space-y-2">
            {charges.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-[#1b1b21] px-4 py-3">
                <div>
                  <span className="text-sm text-[#f2f4f6]">
                    {new Date(c.date).toLocaleDateString('ko-KR')} {c.packageName}
                  </span>
                  <span className="ml-2 text-sm text-[#8b95a1]">{c.price.toLocaleString()}원</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 이용내역서 HTML 생성 (인쇄용) */
function generateReportHtml(data: any, month: string): string {
  const [y, m] = month.split('-');
  const user = data.user || {};
  const period = data.period || {};
  const charges = data.charges || [];
  const usages = data.usages || [];
  const featureSummary = data.featureSummary || {};
  const totals = data.totals || {};

  const FEATURE_LABELS: Record<string, string> = {
    architecture: '설계', frontend: '프론트엔드', backend: '백엔드',
    schema: '스키마', modify: 'AI 수정', chat: 'AI 대화',
    app_generate: '앱 생성', meeting_standard: 'AI 회의실',
    smart_analysis_standard: '스마트 분석', image_generate: 'AI 이미지',
  };

  const chargeRows = charges.map((c: any) =>
    `<tr><td>${new Date(c.date).toLocaleString('ko-KR')}</td><td>${c.description || '크레딧 충전'}</td><td style="text-align:right">${c.credits.toLocaleString()}cr</td></tr>`
  ).join('');

  const summaryRows = Object.entries(featureSummary).map(([key, val]: [string, any]) =>
    `<tr><td>${FEATURE_LABELS[key] || key}</td><td style="text-align:right">${val.count}회</td><td style="text-align:right">${val.credits.toLocaleString()}cr</td></tr>`
  ).join('');

  const usageRows = usages.map((u: any) =>
    `<tr><td>${new Date(u.date).toLocaleString('ko-KR')}</td><td>${FEATURE_LABELS[u.taskType] || u.description || u.taskType || '기타'}</td><td style="text-align:right">${u.credits}cr</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>이용내역서 ${y}년 ${m}월</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Pretendard', sans-serif; color: #222; max-width: 700px; margin: 0 auto; padding: 40px 20px; }
  h1 { text-align: center; font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin-top: 30px; margin-bottom: 8px; border-bottom: 2px solid #222; padding-bottom: 4px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .info-table td { border: none; padding: 3px 8px; }
  .info-table td:first-child { color: #666; width: 120px; }
  .total-row { font-weight: 700; border-top: 2px solid #222; }
  .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; font-size: 12px; color: #666; }
  .stamp { text-align: center; margin-top: 30px; font-size: 14px; color: #333; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Foundry AI</h1>
<p class="subtitle">서비스 이용내역서</p>

<table class="info-table">
  <tr><td>기간</td><td>${period.from || ''} ~ ${period.to || ''}</td></tr>
  <tr><td>고객</td><td>${user.businessName || user.company || user.name || '-'}</td></tr>
  <tr><td>이메일</td><td>${user.email || '-'}</td></tr>
  ${user.businessNumber ? `<tr><td>사업자번호</td><td>${user.businessNumber}</td></tr>` : ''}
</table>

<h2>충전 내역</h2>
<table>
  <thead><tr><th>일시</th><th>내용</th><th style="text-align:right">크레딧</th></tr></thead>
  <tbody>${chargeRows || '<tr><td colspan="3" style="text-align:center;color:#999">내역 없음</td></tr>'}</tbody>
  <tfoot><tr class="total-row"><td colspan="2">합계</td><td style="text-align:right">${(totals.totalCharged || 0).toLocaleString()}cr (${(totals.totalChargedAmount || 0).toLocaleString()}원)</td></tr></tfoot>
</table>

<h2>사용 내역 요약</h2>
<table>
  <thead><tr><th>기능</th><th style="text-align:right">횟수</th><th style="text-align:right">크레딧</th></tr></thead>
  <tbody>${summaryRows || '<tr><td colspan="3" style="text-align:center;color:#999">내역 없음</td></tr>'}</tbody>
  <tfoot><tr class="total-row"><td>합계</td><td></td><td style="text-align:right">${(totals.totalUsed || 0).toLocaleString()}cr</td></tr></tfoot>
</table>

<h2>상세 사용 내역</h2>
<table>
  <thead><tr><th>일시</th><th>기능</th><th style="text-align:right">크레딧</th></tr></thead>
  <tbody>${usageRows || '<tr><td colspan="3" style="text-align:center;color:#999">내역 없음</td></tr>'}</tbody>
</table>

<div class="footer">
  <p>발행일: ${new Date().toLocaleDateString('ko-KR')}</p>
  <p>발행자: 주식회사 세리온</p>
  <p>사업자등록번호: 726-15-02592</p>
  <p>대표: 김진형</p>
  <p>주소: 경기도 성남시 분당구 대왕판교로 660 유스페이스1 A동 605호</p>
</div>

<p class="stamp">본 내역서는 정부지원사업비 정산 증빙 자료로 사용 가능합니다.</p>
</body></html>`;
}
