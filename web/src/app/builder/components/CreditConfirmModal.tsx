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
      <div className="w-[480px] max-w-[90vw] rounded-2xl bg-[#1b1b21] border border-[#2c2c35] p-6" onClick={e => e.stopPropagation()}>
        {showCostModal === 'generate' ? (
          <>
            <h3 className="text-lg font-bold text-[#f2f4f6] mb-1">🚀 앱 생성</h3>
            <p className="text-sm text-[#8b95a1] mb-4">AI가 풀스택 앱을 생성합니다.</p>
            <div className="rounded-xl bg-[#2c2c35] p-4 mb-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">앱 생성 비용</span><span className="text-[#ffd60a] font-bold">6,800 cr</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">현재 잔액</span><span className={`font-bold ${(creditBalance ?? 0) >= 6800 ? 'text-[#30d158]' : 'text-[#f43f5e]'}`}>{(creditBalance ?? 0).toLocaleString()} cr</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">생성 후 잔액</span><span className="text-[#f2f4f6]">{Math.max(0, (creditBalance ?? 0) - 6800).toLocaleString()} cr</span></div>
            </div>
            {(creditBalance ?? 0) < 6800 && (
              <div className="rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/20 p-3 mb-4">
                <p className="text-xs text-[#f43f5e]">⚠️ 크레딧이 부족합니다 (필요: 6,800cr / 잔액: {(creditBalance ?? 0).toLocaleString()}cr) — <a href="/credits" className="underline font-bold">크레딧 충전하기</a></p>
              </div>
            )}
            <div className="rounded-xl bg-[#30d158]/10 border border-[#30d158]/20 p-3 mb-4">
              <p className="text-xs text-[#30d158]">🎉 생성 완료 후 24시간 무료 체험 배포가 자동 제공됩니다!</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCostModal(null)} className="flex-1 rounded-xl bg-[#2c2c35] py-3 text-sm font-medium text-[#8b95a1] hover:bg-[#3a3a45]">취소</button>
              <button onClick={() => { setShowCostModal(null); onGenerate(); }} className="flex-1 rounded-xl bg-gradient-to-r from-[#30d158] to-[#28c840] py-3 text-sm font-bold text-white hover:shadow-lg" disabled={(creditBalance ?? 0) < 6800}>6,800cr 생성 시작</button>
            </div>
          </>
        ) : showCostModal === 'deploy' ? (
          <>
            <h3 className="text-lg font-bold text-[#f2f4f6] mb-1">🚀 배포하기</h3>
            <p className="text-sm text-[#8b95a1] mb-4">Foundry 서버에 앱을 배포하면 바로 사용할 수 있습니다.</p>
            <div className="rounded-xl bg-[#2c2c35] p-4 mb-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">호스팅 비용</span><span className="text-[#ffd60a] font-bold">월 29,000원</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">서브도메인</span><span className="text-[#f2f4f6]">{projectName || 'myapp'}.foundry.ai.kr</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">SSL/HTTPS</span><span className="text-[#30d158]">✅ 자동 적용</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">배포 후 수정</span><span className="text-[#30d158]">✅ 가능</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCostModal(null)} className="flex-1 rounded-xl bg-[#2c2c35] py-3 text-sm font-medium text-[#8b95a1] hover:bg-[#3a3a45]">취소</button>
              <button onClick={() => { setShowCostModal(null); onDeploy(); }} className="flex-1 rounded-xl bg-[#3182f6] py-3 text-sm font-bold text-white hover:bg-[#1b64da]">월 29,000원 배포하기</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-[#f2f4f6] mb-1">📦 소스코드 다운로드</h3>
            <p className="text-sm text-[#8b95a1] mb-4">전체 소스코드를 ZIP으로 다운로드합니다. 코드 소유권 100% 보장.</p>
            <div className="rounded-xl bg-[#2c2c35] p-4 mb-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">다운로드 비용</span><span className="text-[#ffd60a] font-bold">10,000 크레딧</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">스탠다드/프로/모두의창업</span><span className="text-[#30d158] font-bold">무료 포함!</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">포함 내용</span><span className="text-[#f2f4f6]">프론트+백엔드+DB 전체</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">ERD + API 명세</span><span className="text-[#30d158]">✅ 포함</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">코드 소유권</span><span className="text-[#30d158]">✅ 100% 사용자 소유</span></div>
            </div>
            <div className="rounded-xl bg-[#ffd60a]/10 border border-[#ffd60a]/20 p-3 mb-4">
              <p className="text-xs text-[#ffd60a]">💡 <b>절약 팁:</b> 배포(월 29,000원)로 먼저 사용해보고, 만족하면 다운로드하세요. 배포 중에도 수정이 가능합니다!</p>
            </div>
            {creditBalance !== null && creditBalance < 10000 && (
              <div className="rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/20 p-3 mb-4">
                <p className="text-xs text-[#f43f5e]">⚠️ 크레딧 부족 (현재 {creditBalance.toLocaleString()}) — <a href="/credits" className="underline font-bold">충전하러 가기</a></p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowCostModal(null)} className="flex-1 rounded-xl bg-[#2c2c35] py-3 text-sm font-medium text-[#8b95a1] hover:bg-[#3a3a45]">취소</button>
              <button onClick={() => { setShowCostModal(null); onDownload(); }} className="flex-1 rounded-xl bg-[#a855f7] py-3 text-sm font-bold text-white hover:bg-[#9333ea]" disabled={creditBalance !== null && creditBalance < 10000}>10,000 크레딧 다운로드</button>
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-[#2c2c35]">
          <p className="text-xs text-[#6b7684]">💡 크레딧이 부족하신가요? <a href="/credits" className="text-[#3182f6] font-medium hover:underline">크레딧 충전하기 →</a></p>
        </div>
      </div>
    </div>
  );
}
