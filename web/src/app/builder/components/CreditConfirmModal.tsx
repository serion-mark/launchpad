'use client';

interface CreditConfirmModalProps {
  showCostModal: 'deploy' | 'download' | 'generate';
  setShowCostModal: (m: 'deploy' | 'download' | 'generate' | null) => void;
  creditBalance: number | null;
  projectName: string;
  onGenerate: () => void;
  onDeploy: () => void;
  onDownload: () => void;
}

export default function CreditConfirmModal({
  showCostModal, setShowCostModal,
  creditBalance, projectName,
  onGenerate, onDeploy, onDownload,
}: CreditConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCostModal(null)}>
      <div className="w-[480px] max-w-[90vw] rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-6" onClick={e => e.stopPropagation()}>
        {showCostModal === 'generate' ? (
          <>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">🚀 앱 생성</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">AI가 풀스택 앱을 생성합니다.</p>
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4 mb-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">앱 생성 비용</span><span className="text-[var(--toss-yellow)] font-bold">6,800 cr</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">현재 잔액</span><span className={`font-bold ${(creditBalance ?? 0) >= 6800 ? 'text-[var(--toss-green)]' : 'text-[var(--toss-red)]'}`}>{(creditBalance ?? 0).toLocaleString()} cr</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">생성 후 잔액</span><span className="text-[var(--text-primary)]">{Math.max(0, (creditBalance ?? 0) - 6800).toLocaleString()} cr</span></div>
            </div>
            {(creditBalance ?? 0) < 6800 && (
              <div className="rounded-xl bg-[var(--toss-red)]/10 border border-[var(--toss-red)]/20 p-3 mb-4">
                <p className="text-xs text-[var(--toss-red)]">⚠️ 크레딧이 부족합니다 (필요: 6,800cr / 잔액: {(creditBalance ?? 0).toLocaleString()}cr) — <a href="/credits" className="underline font-bold">크레딧 충전하기</a></p>
              </div>
            )}
            <div className="rounded-xl bg-[var(--toss-green)]/10 border border-[var(--toss-green)]/20 p-3 mb-4">
              <p className="text-xs text-[var(--toss-green)]">🎉 생성 완료 후 24시간 무료 체험 배포가 자동 제공됩니다!</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCostModal(null)} className="flex-1 rounded-xl bg-[var(--bg-elevated)] py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--border-hover)]">취소</button>
              <button onClick={() => { setShowCostModal(null); onGenerate(); }} className="flex-1 rounded-xl bg-gradient-to-r from-[#30d158] to-[#28c840] py-3 text-sm font-bold text-white hover:shadow-lg" disabled={(creditBalance ?? 0) < 6800}>6,800cr 생성 시작</button>
            </div>
          </>
        ) : showCostModal === 'deploy' ? (
          <>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">🌐 온라인 게시</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">만든 앱을 인터넷에 게시하여 누구나 접속할 수 있게 합니다.</p>
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4 mb-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">내 앱 주소</span><span className="text-[var(--text-primary)]">{projectName || 'myapp'}.foundry.ai.kr</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">보안 연결 (HTTPS)</span><span className="text-[var(--toss-green)]">✅ 자동 적용</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">게시 후 수정</span><span className="text-[var(--toss-green)]">✅ 언제든 가능</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">호스팅 비용</span><span className="text-[var(--toss-yellow)] font-bold">월 29,000원</span></div>
            </div>
            <div className="rounded-xl bg-[var(--toss-green)]/10 border border-[var(--toss-green)]/20 p-3 mb-4">
              <p className="text-xs text-[var(--toss-green)]">🎉 앱 생성 시 24시간 무료 체험이 자동 제공됩니다. 이후 계속 사용하시려면 호스팅 구독이 필요합니다.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCostModal(null)} className="flex-1 rounded-xl bg-[var(--bg-elevated)] py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--border-hover)]">취소</button>
              <button onClick={() => { setShowCostModal(null); onDeploy(); }} className="flex-1 rounded-xl bg-[var(--toss-blue)] py-3 text-sm font-bold text-white hover:bg-[var(--toss-blue-hover)]">온라인 게시하기</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">📦 소스코드 다운로드</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">전체 소스코드를 ZIP으로 다운로드합니다. 코드 소유권 100% 보장.</p>
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4 mb-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">다운로드 비용</span><span className="text-[var(--toss-yellow)] font-bold">10,000 크레딧</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">스탠다드/프로/모두의창업</span><span className="text-[var(--toss-green)] font-bold">무료 포함!</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">포함 내용</span><span className="text-[var(--text-primary)]">프론트+백엔드+DB 전체</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">ERD + API 명세</span><span className="text-[var(--toss-green)]">✅ 포함</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">코드 소유권</span><span className="text-[var(--toss-green)]">✅ 100% 사용자 소유</span></div>
            </div>
            <div className="rounded-xl bg-[var(--toss-yellow)]/10 border border-[var(--toss-yellow)]/20 p-3 mb-4">
              <p className="text-xs text-[var(--toss-yellow)]">💡 <b>절약 팁:</b> 온라인 게시(월 29,000원)로 먼저 사용해보고, 만족하면 다운로드하세요. 게시 중에도 수정이 가능합니다!</p>
            </div>
            {creditBalance !== null && creditBalance < 10000 && (
              <div className="rounded-xl bg-[var(--toss-red)]/10 border border-[var(--toss-red)]/20 p-3 mb-4">
                <p className="text-xs text-[var(--toss-red)]">⚠️ 크레딧 부족 (현재 {creditBalance.toLocaleString()}) — <a href="/credits" className="underline font-bold">충전하러 가기</a></p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowCostModal(null)} className="flex-1 rounded-xl bg-[var(--bg-elevated)] py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--border-hover)]">취소</button>
              <button onClick={() => { setShowCostModal(null); onDownload(); }} className="flex-1 rounded-xl bg-[var(--toss-purple)] py-3 text-sm font-bold text-white hover:bg-[var(--toss-purple)]" disabled={creditBalance !== null && creditBalance < 10000}>10,000 크레딧 다운로드</button>
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
          <p className="text-xs text-[var(--text-tertiary)]">💡 크레딧이 부족하신가요? <a href="/credits" className="text-[var(--toss-blue)] font-medium hover:underline">크레딧 충전하기 →</a></p>
        </div>
      </div>
    </div>
  );
}
