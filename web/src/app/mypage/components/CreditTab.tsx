'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';

interface CreditLog {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  taskType: string | null;
  projectId: string | null;
  createdAt: string;
}

interface ChargeItem {
  date: string;
  packageName: string;
  credits: number;
  price: number;
  method: string;
  paymentRefId: string | null;
}

const FEATURE_LABELS: Record<string, string> = {
  app_generate: '앱 생성',
  ai_modify_simple: 'AI 수정 (단순)',
  ai_modify_complex: 'AI 수정 (복잡)',
  ai_modify: 'AI 수정',
  ai_chat: 'AI 대화',
  meeting_standard: 'AI 회의실',
  meeting_premium: 'AI 회의실 (프리미엄)',
  smart_analysis_standard: '스마트 분석',
  smart_analysis_premium: '스마트 분석 (프리미엄)',
  image_generate: 'AI 이미지',
  code_download: '코드 다운로드',
  premium_theme: '프리미엄 테마',
  architecture: '설계',
  frontend: '프론트엔드',
  backend: '백엔드',
  schema: '스키마',
  modify: 'AI 수정',
  chat: 'AI 대화',
};

export default function CreditTab() {
  const [balance, setBalance] = useState(0);
  const [logs, setLogs] = useState<CreditLog[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [summary, setSummary] = useState({ totalCharged: 0, totalUsed: 0, chargedAmount: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);

  // 월 선택
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const loadData = useCallback(async () => {
    setLoading(true);
    const from = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const to = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

    try {
      const [historyRes, chargesRes] = await Promise.all([
        authFetch(`/credits/history?from=${from}&to=${to}&page=${pagination.page}&limit=20`),
        authFetch('/credits/charges'),
      ]);
      const historyData = await historyRes.json();
      const chargesData = await chargesRes.json();

      setBalance(historyData.balance);
      setLogs(historyData.logs);
      setSummary(historyData.summary);
      setPagination(historyData.pagination);

      // 충전 내역은 해당 월만 필터
      const fromDate = new Date(from);
      const toDate = new Date(to + 'T23:59:59');
      setCharges(chargesData.charges.filter((c: ChargeItem) => {
        const d = new Date(c.date);
        return d >= fromDate && d <= toDate;
      }));
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, pagination.page]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  };

  const getFeatureLabel = (log: CreditLog) => {
    if (log.taskType && FEATURE_LABELS[log.taskType]) return FEATURE_LABELS[log.taskType];
    if (log.description) {
      for (const [, label] of Object.entries(FEATURE_LABELS)) {
        if (log.description.includes(label)) return label;
      }
      return log.description.length > 20 ? log.description.slice(0, 20) + '...' : log.description;
    }
    return log.type === 'CHARGE' ? '크레딧 충전' : log.type === 'SIGNUP_BONUS' ? '가입 보너스' : '기타';
  };

  return (
    <div className="space-y-6">
      {/* 잔액 + 월 선택 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-[var(--toss-yellow)]/10 border border-[var(--toss-yellow)]/20 px-5 py-3">
            <span className="text-sm text-[var(--text-secondary)]">현재 잔액</span>
            <p className="text-2xl font-bold text-[var(--toss-yellow)]">{balance.toLocaleString()}cr</p>
          </div>
          <a href="/credits" className="rounded-xl bg-[var(--toss-blue)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--toss-blue-hover)] transition-colors">
            충전하기
          </a>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={`${selectedYear}-${selectedMonth}`}
            onChange={e => {
              const [y, m] = e.target.value.split('-').map(Number);
              setSelectedYear(y); setSelectedMonth(m);
            }}
            className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hover)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            {Array.from({ length: 6 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              return (
                <option key={i} value={`${d.getFullYear()}-${d.getMonth() + 1}`}>
                  {d.getFullYear()}년 {d.getMonth() + 1}월
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--toss-blue)] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* 충전 내역 */}
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">충전 내역</h3>
            {charges.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">이번 달 충전 내역이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                      <th className="text-left py-2 font-medium">날짜</th>
                      <th className="text-left py-2 font-medium">패키지</th>
                      <th className="text-right py-2 font-medium">크레딧</th>
                      <th className="text-right py-2 font-medium">결제금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.map((c, i) => (
                      <tr key={i} className="border-b border-[var(--border-primary)]/50">
                        <td className="py-3 text-[var(--text-primary)]">{formatDate(c.date)}</td>
                        <td className="py-3 text-[var(--text-primary)]">{c.packageName}</td>
                        <td className="py-3 text-right text-[var(--toss-green)] font-medium">+{c.credits.toLocaleString()}cr</td>
                        <td className="py-3 text-right text-[var(--text-secondary)]">
                          {c.price > 0 ? `${c.price.toLocaleString()}원 ${c.method}` : '무료'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 사용 내역 */}
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">사용 내역</h3>
            {logs.filter(l => l.type === 'USE').length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">이번 달 사용 내역이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                      <th className="text-left py-2 font-medium">날짜</th>
                      <th className="text-left py-2 font-medium">기능</th>
                      <th className="text-right py-2 font-medium">사용</th>
                      <th className="text-right py-2 font-medium">잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.filter(l => l.type === 'USE').map(log => (
                      <tr key={log.id} className="border-b border-[var(--border-primary)]/50">
                        <td className="py-3 text-[var(--text-primary)]">{formatDate(log.createdAt)}</td>
                        <td className="py-3 text-[var(--text-primary)]">{getFeatureLabel(log)}</td>
                        <td className="py-3 text-right text-[var(--toss-red)] font-medium">{log.amount.toLocaleString()}cr</td>
                        <td className="py-3 text-right text-[var(--text-secondary)]">{log.balanceAfter.toLocaleString()}cr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 페이지네이션 */}
            {pagination.total > pagination.limit && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}
                    className={`rounded-lg px-3 py-1.5 text-xs ${
                      pagination.page === i + 1
                        ? 'bg-[var(--toss-blue)] text-white'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-hover)]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 이번 달 합계 */}
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-3">이번 달 합계</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[var(--bg-secondary)] p-4">
                <span className="text-xs text-[var(--text-secondary)]">충전</span>
                <p className="text-lg font-bold text-[var(--toss-green)]">+{summary.totalCharged.toLocaleString()}cr</p>
                {summary.chargedAmount > 0 && (
                  <p className="text-xs text-[var(--text-tertiary)]">({summary.chargedAmount.toLocaleString()}원)</p>
                )}
              </div>
              <div className="rounded-xl bg-[var(--bg-secondary)] p-4">
                <span className="text-xs text-[var(--text-secondary)]">사용</span>
                <p className="text-lg font-bold text-[var(--toss-red)]">-{summary.totalUsed.toLocaleString()}cr</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-secondary)] p-4">
                <span className="text-xs text-[var(--text-secondary)]">현재 잔액</span>
                <p className="text-lg font-bold text-[var(--toss-yellow)]">{balance.toLocaleString()}cr</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
