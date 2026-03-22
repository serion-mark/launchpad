'use client';

import { useState, useRef, useEffect } from 'react';
import { authFetch, getToken, API_BASE } from '@/lib/api';

// ── 타입 ────────────────────────────────────────────────

type MeetingTier = 'standard' | 'premium';
type MeetingPreset = 'business_plan' | 'market_analysis' | 'idea_validation' | 'ir_feedback' | 'competitor' | 'free';
type MeetingPhase = 'idle' | 'pre_question' | 'briefing' | 'analysis' | 'debate' | 'report' | 'done' | 'error';

interface MeetingMessage {
  id: string;
  phase: string;
  ai?: string;
  role?: string;
  content: string;
  dispute?: string;
}

// ── 프리셋 정의 ─────────────────────────────────────────

const PRESETS: { id: MeetingPreset; icon: string; label: string; desc: string }[] = [
  { id: 'business_plan', icon: '📋', label: '사업계획서 평가', desc: 'PDF/텍스트로 올리면 AI 3개가 점수+피드백' },
  { id: 'market_analysis', icon: '📊', label: '시장 분석', desc: '주제 입력 → 시장규모/경쟁/트렌드' },
  { id: 'idea_validation', icon: '💡', label: '아이디어 검증', desc: '아이디어 → 실현가능성/차별점/리스크' },
  { id: 'ir_feedback', icon: '🎤', label: 'IR 피드백', desc: '발표자료 → 투자자 관점 평가' },
  { id: 'competitor', icon: '⚔️', label: '경쟁사 분석', desc: '경쟁사명 → 강점/약점/차별화 전략' },
  { id: 'free', icon: '🆓', label: '자유 주제', desc: '아무 주제나 AI 3개 토론' },
];

const AI_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  GPT: { bg: 'bg-emerald-900/20', border: 'border-emerald-700/40', text: 'text-emerald-400', badge: 'bg-emerald-600' },
  Gemini: { bg: 'bg-red-900/20', border: 'border-red-700/40', text: 'text-red-400', badge: 'bg-red-600' },
  Claude: { bg: 'bg-blue-900/20', border: 'border-blue-700/40', text: 'text-blue-400', badge: 'bg-blue-600' },
};

const AI_ICONS: Record<string, string> = { GPT: '🟢', Gemini: '🔴', Claude: '🔵' };

export default function MeetingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = 아직 체크 안 함
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);
  const [tier, setTier] = useState<MeetingTier>('standard');
  const [preset, setPreset] = useState<MeetingPreset>('free');
  const [phase, setPhase] = useState<MeetingPhase>('idle');
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [currentAI, setCurrentAI] = useState('');
  const [preQuestions, setPreQuestions] = useState('');
  const [preAnswers, setPreAnswers] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRunning = phase !== 'idle' && phase !== 'done' && phase !== 'error' && phase !== 'pre_question';

  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (uploadedFile.size > maxSize) {
      alert('파일 크기는 10MB 이하만 가능합니다');
      return;
    }
    setFileLoading(true);
    setFileName(uploadedFile.name);

    const isPdf = uploadedFile.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // PDF → 서버사이드 파싱
      try {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        const token = getToken();
        const res = await fetch(`${API_BASE}/ai/parse-pdf`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'PDF 파싱 실패');
        }
        const data = await res.json();
        setFile(data.text || '');
        setFileLoading(false);
      } catch (err: any) {
        alert(err.message || 'PDF를 읽을 수 없습니다');
        setFileLoading(false);
        setFileName('');
      }
    } else {
      // 텍스트 파일 — 기존 방식
      const reader = new FileReader();
      reader.onload = (e) => {
        setFile(e.target?.result as string || '');
        setFileLoading(false);
      };
      reader.onerror = () => {
        alert('파일을 읽을 수 없습니다');
        setFileLoading(false);
        setFileName('');
      };
      reader.readAsText(uploadedFile);
    }
  };
  const tierCredits = tier === 'standard' ? 300 : 1500;

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  };

  // ── 회의 시작 ─────────────────────────────────────────

  // 사전 질문 요청
  const askPreQuestions = async () => {
    if (!topic.trim()) return;

    const token = getToken();
    if (!token) {
      alert('AI 회의실을 사용하려면 로그인이 필요합니다');
      window.location.href = '/login';
      return;
    }

    setPhase('pre_question');
    setPreQuestions('');
    setPreAnswers('');

    try {
      const res = await fetch(`${API_BASE}/ai/meeting-pre-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: topic.trim(), preset }),
      });
      if (!res.ok) throw new Error('사전 질문 생성 실패');
      const data = await res.json();
      setPreQuestions(data.questions);
    } catch {
      // 사전 질문 실패 시 바로 회의 시작
      startMeeting();
    }
  };

  // 실제 회의 시작
  const startMeeting = async () => {
    const token = getToken();
    if (!token) {
      alert('AI 회의실을 사용하려면 로그인이 필요합니다');
      window.location.href = '/login';
      return;
    }

    setMessages([]);
    setPhase('briefing');
    setCurrentAI('브리핑 생성 중...');

    try {
      const res = await fetch(`${API_BASE}/ai/meeting-sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: topic.trim(), file: file || undefined, tier, preset, preAnswers: preAnswers || undefined }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (res.status === 401) {
          alert('로그인이 필요합니다');
          window.location.href = '/login';
          return;
        }
        const friendlyMessages: Record<number, string> = {
          400: '입력 형식이 잘못되었습니다',
          403: '권한이 없습니다',
          429: '요청이 많아요. 잠시 후 다시 시도해주세요',
          500: '서버에 일시적인 문제가 발생했습니다',
        };
        throw new Error(errBody.message || friendlyMessages[res.status] || '회의 시작에 실패했습니다');
      }
      if (!res.body) throw new Error('SSE 스트림 없음');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch { /* skip malformed */ }
        }
      }

      setPhase('done');
      setCurrentAI('');
    } catch (err: any) {
      setPhase('error');
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, phase: 'error', content: err.message }]);
    }
  };

  const handleEvent = (event: any) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (event.phase === 'briefing') {
      setPhase('briefing');
      setCurrentAI('브리핑 완료');
      setMessages(prev => [...prev, { id, phase: 'briefing', content: event.content }]);
    } else if (event.phase === 'analysis') {
      setPhase('analysis');
      setCurrentAI(`${event.ai} 분석 중...`);
      setMessages(prev => [...prev, { id, phase: 'analysis', ai: event.ai, role: event.role, content: event.content }]);
    } else if (event.phase === 'debate') {
      setPhase('debate');
      setCurrentAI('쟁점 토론 중...');
      for (const resp of event.responses || []) {
        setMessages(prev => [...prev, {
          id: `${id}-${resp.ai}`,
          phase: 'debate',
          ai: resp.ai,
          dispute: event.dispute,
          content: resp.content,
        }]);
      }
    } else if (event.phase === 'report') {
      setPhase('report');
      setCurrentAI('보고서 작성 완료');
      setMessages(prev => [...prev, { id, phase: 'report', content: event.content }]);
    } else if (event.phase === 'error') {
      setPhase('error');
      setMessages(prev => [...prev, { id, phase: 'error', content: event.message }]);
    }

    scrollToBottom();
  };

  // ── 보고서 복사 ───────────────────────────────────────

  const copyReport = () => {
    const report = messages.find(m => m.phase === 'report');
    if (report) navigator.clipboard.writeText(report.content);
  };

  // ── 앱 만들기 연결 ────────────────────────────────────

  const goToStart = () => {
    const report = messages.find(m => m.phase === 'report');
    if (report) {
      sessionStorage.setItem('meeting_context', report.content);
    }
    window.location.href = '/start';
  };

  // ── 렌더링 ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      {/* 헤더 */}
      <header className="border-b border-[#2c2c35] px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Foundry" className="h-8" />
          </a>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-[#8b95a1] hover:text-white transition-colors">내 프로젝트</a>
            <a href="/credits" className="text-sm text-[#8b95a1] hover:text-white transition-colors">크레딧</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* 타이틀 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">🧠 AI 회의실</h1>
          <p className="text-[#8b95a1]">AI 3개가 각자 관점으로 분석하고 서로 토론합니다</p>
        </div>

        {/* 비로그인 안내 */}
        {isLoggedIn === false && phase === 'idle' && (
          <div className="mb-6 mx-auto max-w-2xl rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="text-sm font-medium text-[#f59e0b]">로그인이 필요합니다</p>
                <p className="text-xs text-[#8b95a1]">회원가입 시 500 크레딧 무료 제공 (스탠다드 회의 1회 가능)</p>
              </div>
            </div>
            <a href="/login" className="shrink-0 rounded-lg bg-[#f59e0b] px-4 py-2 text-sm font-bold text-black hover:brightness-110 transition-all">
              로그인
            </a>
          </div>
        )}

        {/* 입력 영역 */}
        {phase === 'idle' && (
          <div className="space-y-6">
            {/* 프리셋 선택 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    preset === p.id
                      ? 'border-[#3182f6] bg-[#3182f6]/10'
                      : 'border-[#2c2c35] bg-[#1b1b21] hover:border-[#3c3c45]'
                  }`}
                >
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="text-xs text-[#8b95a1] mt-1">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* 주제 입력 */}
            <div>
              <label className="block text-sm font-medium text-[#8b95a1] mb-2">주제 / 질문</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="예: AI 기반 미용실 POS 시스템의 시장성을 분석해줘"
                rows={3}
                className="w-full rounded-xl border border-[#2c2c35] bg-[#1b1b21] px-4 py-3 text-[15px] placeholder-[#6b7684] outline-none focus:border-[#3182f6] transition-colors resize-none"
              />
            </div>

            {/* 파일 첨부 (드래그앤드롭 + 클릭) */}
            <div>
              <label className="block text-sm font-medium text-[#8b95a1] mb-2">첨부 자료 (선택)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
              {!fileName ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[#3182f6]', 'bg-[#3182f6]/5'); }}
                  onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-[#3182f6]', 'bg-[#3182f6]/5'); }}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-[#3182f6]', 'bg-[#3182f6]/5');
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  className="w-full rounded-xl border-2 border-dashed border-[#2c2c35] bg-[#1b1b21] px-4 py-8 text-center cursor-pointer hover:border-[#3c3c45] transition-colors"
                >
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm text-[#8b95a1]">파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs text-[#4e5968] mt-1">PDF, TXT, MD, CSV, JSON (최대 10MB)</p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#2c2c35] bg-[#1b1b21] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📎</span>
                    <div>
                      <p className="text-sm font-medium text-[#f2f4f6]">{fileName}</p>
                      <p className="text-xs text-[#6b7684]">{fileLoading ? '읽는 중...' : `${(file.length / 1024).toFixed(1)}KB`}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setFile(''); setFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="rounded-lg px-3 py-1 text-xs text-[#8b95a1] hover:bg-[#2c2c35] hover:text-red-400 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>

            {/* 티어 선택 */}
            <div className="flex gap-3">
              <button
                onClick={() => setTier('standard')}
                className={`flex-1 rounded-xl border p-4 text-center transition-all ${
                  tier === 'standard'
                    ? 'border-[#3182f6] bg-[#3182f6]/10'
                    : 'border-[#2c2c35] bg-[#1b1b21] hover:border-[#3c3c45]'
                }`}
              >
                <div className="text-lg font-bold">⚡ 스탠다드</div>
                <div className="text-sm text-[#8b95a1] mt-1">Sonnet + GPT-4o + Gemini</div>
                <div className="text-[#ffd60a] font-bold mt-2">300 cr</div>
              </button>
              <button
                onClick={() => setTier('premium')}
                className={`flex-1 rounded-xl border p-4 text-center transition-all ${
                  tier === 'premium'
                    ? 'border-[#f59e0b] bg-[#f59e0b]/10'
                    : 'border-[#2c2c35] bg-[#1b1b21] hover:border-[#3c3c45]'
                }`}
              >
                <div className="text-lg font-bold">🔥 프리미엄</div>
                <div className="text-sm text-[#8b95a1] mt-1">최고급 + 쟁점 핑퐁 토론</div>
                <div className="text-[#f59e0b] font-bold mt-2">1,500 cr</div>
              </button>
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={askPreQuestions}
              disabled={!topic.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-[#3182f6] to-[#6366f1] py-4 text-lg font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🧠 AI 회의 시작 ({tierCredits} cr)
            </button>
          </div>
        )}

        {/* 사전 질문 단계 */}
        {phase === 'pre_question' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#3182f6]/40 bg-[#3182f6]/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🤔</span>
                <span className="font-bold text-[#3182f6]">회의 전 확인</span>
              </div>
              {preQuestions ? (
                <div className="text-sm text-[#d1d5db] whitespace-pre-wrap leading-relaxed">{preQuestions}</div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[#8b95a1]">
                  <div className="h-3 w-3 rounded-full bg-[#3182f6] animate-pulse" />
                  질문 생성 중...
                </div>
              )}
            </div>

            {preQuestions && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#8b95a1] mb-2">답변 (선택)</label>
                  <textarea
                    value={preAnswers}
                    onChange={e => setPreAnswers(e.target.value)}
                    placeholder="분석 방향이나 중점 사항을 입력하세요 (건너뛰기 가능)"
                    rows={3}
                    className="w-full rounded-xl border border-[#2c2c35] bg-[#1b1b21] px-4 py-3 text-[15px] placeholder-[#6b7684] outline-none focus:border-[#3182f6] transition-colors resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPhase('idle'); setPreQuestions(''); setPreAnswers(''); }}
                    className="flex-1 rounded-xl border border-[#2c2c35] py-3 text-sm font-semibold text-[#8b95a1] hover:bg-[#2c2c35] hover:text-white transition-colors"
                  >
                    ← 돌아가기
                  </button>
                  <button
                    onClick={startMeeting}
                    className="flex-[2] rounded-xl bg-gradient-to-r from-[#3182f6] to-[#6366f1] py-3 text-sm font-bold text-white hover:brightness-110 transition-all"
                  >
                    {preAnswers.trim() ? '🧠 이 방향으로 회의 시작' : '⚡ 바로 회의 시작'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 회의 진행 중 / 결과 */}
        {phase !== 'idle' && phase !== 'pre_question' && (
          <div className="space-y-4">
            {/* 상태 표시 */}
            {isRunning && (
              <div className="flex items-center gap-3 rounded-xl border border-[#2c2c35] bg-[#1b1b21] p-4">
                <div className="h-3 w-3 rounded-full bg-[#3182f6] animate-pulse" />
                <span className="text-sm font-medium">{currentAI}</span>
                <span className="text-xs text-[#6b7684] ml-auto">
                  {tier === 'premium' ? '프리미엄 회의 진행 중' : '스탠다드 회의 진행 중'}
                </span>
              </div>
            )}

            {/* 메시지 영역 */}
            <div ref={scrollRef} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {messages.map(msg => {
                if (msg.phase === 'briefing') {
                  return (
                    <div key={msg.id} className="rounded-xl border border-[#2c2c35] bg-[#1b1b21] p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📋</span>
                        <span className="font-bold text-[#ffd60a]">브리핑</span>
                      </div>
                      <div className="text-sm text-[#d1d5db] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                  );
                }

                if (msg.phase === 'analysis' && msg.ai) {
                  const colors = AI_COLORS[msg.ai] || AI_COLORS.Claude;
                  return (
                    <div key={msg.id} className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{AI_ICONS[msg.ai]}</span>
                        <span className={`font-bold ${colors.text}`}>{msg.ai}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge} text-white`}>{msg.role}</span>
                      </div>
                      <div className="text-sm text-[#d1d5db] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                  );
                }

                if (msg.phase === 'debate' && msg.ai) {
                  const colors = AI_COLORS[msg.ai] || AI_COLORS.Claude;
                  return (
                    <div key={msg.id} className={`rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-5`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">⚡</span>
                        <span className="text-xs text-[#f59e0b] font-medium">쟁점: {msg.dispute}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span>{AI_ICONS[msg.ai]}</span>
                        <span className={`font-bold text-sm ${colors.text}`}>{msg.ai} 반론</span>
                      </div>
                      <div className="text-sm text-[#d1d5db] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                  );
                }

                if (msg.phase === 'report') {
                  return (
                    <div key={msg.id} className="rounded-xl border border-[#3182f6]/40 bg-[#3182f6]/10 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📊</span>
                        <span className="font-bold text-[#3182f6]">종합 보고서</span>
                      </div>
                      <div className="text-sm text-[#d1d5db] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                  );
                }

                if (msg.phase === 'error') {
                  return (
                    <div key={msg.id} className="rounded-xl border border-red-700/40 bg-red-900/20 p-4">
                      <span className="text-red-400 text-sm">오류: {msg.content}</span>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* 완료 후 액션 버튼 */}
            {phase === 'done' && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={copyReport}
                  className="flex-1 rounded-xl border border-[#2c2c35] py-3 text-sm font-semibold text-[#8b95a1] hover:bg-[#2c2c35] hover:text-white transition-colors"
                >
                  📥 보고서 복사
                </button>
                <button
                  onClick={goToStart}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#3182f6] to-[#6366f1] py-3 text-sm font-bold text-white hover:brightness-110 transition-all"
                >
                  🚀 이걸로 앱 만들기
                </button>
                <button
                  onClick={() => { setPhase('idle'); setMessages([]); }}
                  className="flex-1 rounded-xl border border-[#2c2c35] py-3 text-sm font-semibold text-[#8b95a1] hover:bg-[#2c2c35] hover:text-white transition-colors"
                >
                  🔄 새 회의
                </button>
              </div>
            )}

            {phase === 'error' && (
              <button
                onClick={() => { setPhase('idle'); setMessages([]); }}
                className="w-full rounded-xl border border-[#2c2c35] py-3 text-sm font-semibold text-[#8b95a1] hover:bg-[#2c2c35] hover:text-white transition-colors"
              >
                다시 시도
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
