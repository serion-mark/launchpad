'use client';

import { useState } from 'react';

// 데모 앱 화면 데이터 (템플릿별)
const DEMO_SCREENS: Record<string, { name: string; content: string }[]> = {
  'beauty-salon': [
    {
      name: '대시보드',
      content: `
        <div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
            <h1 style="font-size:24px;font-weight:700;color:#1e293b">💇 미용실 POS</h1>
            <span style="background:#3b82f6;color:white;padding:6px 16px;border-radius:8px;font-size:14px">관리자</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
            <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
              <div style="font-size:13px;color:#64748b">오늘 매출</div>
              <div style="font-size:28px;font-weight:700;color:#1e293b">₩1,280,000</div>
              <div style="font-size:12px;color:#22c55e">↑ 15% vs 어제</div>
            </div>
            <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
              <div style="font-size:13px;color:#64748b">오늘 예약</div>
              <div style="font-size:28px;font-weight:700;color:#1e293b">12건</div>
              <div style="font-size:12px;color:#3b82f6">3건 대기중</div>
            </div>
            <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
              <div style="font-size:13px;color:#64748b">신규 고객</div>
              <div style="font-size:28px;font-weight:700;color:#1e293b">5명</div>
              <div style="font-size:12px;color:#a855f7">이번 주 23명</div>
            </div>
            <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
              <div style="font-size:13px;color:#64748b">노쇼율</div>
              <div style="font-size:28px;font-weight:700;color:#1e293b">3.2%</div>
              <div style="font-size:12px;color:#22c55e">↓ 1.5%</div>
            </div>
          </div>
          <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;color:#1e293b">오늘 예약 현황</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead><tr style="border-bottom:2px solid #e2e8f0">
                <th style="text-align:left;padding:10px;color:#64748b">시간</th>
                <th style="text-align:left;padding:10px;color:#64748b">고객</th>
                <th style="text-align:left;padding:10px;color:#64748b">시술</th>
                <th style="text-align:left;padding:10px;color:#64748b">디자이너</th>
                <th style="text-align:left;padding:10px;color:#64748b">상태</th>
              </tr></thead>
              <tbody>
                <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px">10:00</td><td>김지현</td><td>커트+염색</td><td>민수 원장</td><td><span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:12px;font-size:12px">완료</span></td></tr>
                <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px">11:30</td><td>이서윤</td><td>디지털펌</td><td>수진 디자이너</td><td><span style="background:#dbeafe;color:#2563eb;padding:3px 10px;border-radius:12px;font-size:12px">시술중</span></td></tr>
                <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px">13:00</td><td>박민준</td><td>남성 커트</td><td>민수 원장</td><td><span style="background:#fef9c3;color:#ca8a04;padding:3px 10px;border-radius:12px;font-size:12px">대기</span></td></tr>
                <tr><td style="padding:10px">14:30</td><td>최하은</td><td>매직셋팅펌</td><td>수진 디자이너</td><td><span style="background:#fef9c3;color:#ca8a04;padding:3px 10px;border-radius:12px;font-size:12px">대기</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>`,
    },
    {
      name: '예약 관리',
      content: `
        <div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
            <h2 style="font-size:20px;font-weight:700;color:#1e293b">📅 예약 관리</h2>
            <button style="background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px">+ 새 예약</button>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:20px">
            <button style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:20px;font-size:13px">전체</button>
            <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">대기</button>
            <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">확정</button>
            <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">완료</button>
          </div>
          <div style="display:grid;gap:12px">
            ${[
              { time: '10:00', customer: '김지현', service: '커트+염색', designer: '민수', status: '완료', statusColor: '#16a34a', statusBg: '#dcfce7', price: '85,000' },
              { time: '11:30', customer: '이서윤', service: '디지털펌', designer: '수진', status: '시술중', statusColor: '#2563eb', statusBg: '#dbeafe', price: '150,000' },
              { time: '13:00', customer: '박민준', service: '남성 커트', designer: '민수', status: '대기', statusColor: '#ca8a04', statusBg: '#fef9c3', price: '25,000' },
              { time: '14:30', customer: '최하은', service: '매직셋팅펌', designer: '수진', status: '대기', statusColor: '#ca8a04', statusBg: '#fef9c3', price: '180,000' },
              { time: '15:00', customer: '정도윤', service: '클리닉', designer: '민수', status: '대기', statusColor: '#ca8a04', statusBg: '#fef9c3', price: '50,000' },
            ].map(r => `
              <div style="background:white;padding:16px 20px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 2px rgba(0,0,0,.05)">
                <div style="display:flex;align-items:center;gap:16px">
                  <div style="font-size:15px;font-weight:600;color:#3b82f6;min-width:50px">${r.time}</div>
                  <div><div style="font-weight:600;color:#1e293b">${r.customer}</div><div style="font-size:13px;color:#64748b">${r.service} · ${r.designer}</div></div>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="font-weight:600;color:#1e293b">₩${r.price}</span>
                  <span style="background:${r.statusBg};color:${r.statusColor};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:500">${r.status}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`,
    },
    {
      name: '고객 관리',
      content: `
        <div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
            <h2 style="font-size:20px;font-weight:700;color:#1e293b">👥 고객 관리</h2>
            <div style="display:flex;gap:8px">
              <input placeholder="고객 검색..." style="border:1px solid #e2e8f0;padding:8px 16px;border-radius:8px;font-size:14px;width:240px" />
              <button style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:14px">+ 신규</button>
            </div>
          </div>
          <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
                <th style="text-align:left;padding:12px 16px;color:#64748b">고객명</th>
                <th style="text-align:left;padding:12px;color:#64748b">연락처</th>
                <th style="text-align:left;padding:12px;color:#64748b">최근 방문</th>
                <th style="text-align:left;padding:12px;color:#64748b">총 방문</th>
                <th style="text-align:left;padding:12px;color:#64748b">누적 매출</th>
                <th style="text-align:left;padding:12px;color:#64748b">등급</th>
              </tr></thead>
              <tbody>
                ${[
                  { name: '김지현', phone: '010-1234-5678', last: '2026.03.18', visits: 28, total: '2,450,000', grade: 'VIP', gradeColor: '#eab308' },
                  { name: '이서윤', phone: '010-2345-6789', last: '2026.03.18', visits: 15, total: '1,890,000', grade: 'VIP', gradeColor: '#eab308' },
                  { name: '박민준', phone: '010-3456-7890', last: '2026.03.15', visits: 8, total: '560,000', grade: '일반', gradeColor: '#64748b' },
                  { name: '최하은', phone: '010-4567-8901', last: '2026.03.12', visits: 22, total: '3,200,000', grade: 'VVIP', gradeColor: '#a855f7' },
                  { name: '정도윤', phone: '010-5678-9012', last: '2026.03.10', visits: 3, total: '175,000', grade: '신규', gradeColor: '#22c55e' },
                ].map(c => `
                  <tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <td style="padding:12px 16px;font-weight:600">${c.name}</td>
                    <td style="padding:12px;color:#64748b">${c.phone}</td>
                    <td style="padding:12px;color:#64748b">${c.last}</td>
                    <td style="padding:12px">${c.visits}회</td>
                    <td style="padding:12px;font-weight:600">₩${c.total}</td>
                    <td style="padding:12px"><span style="color:${c.gradeColor};font-weight:600;font-size:13px">${c.grade}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>`,
    },
  ],
  'booking-crm': [
    {
      name: '대시보드',
      content: `
        <div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
          <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin-bottom:24px">📅 예약 관리 시스템</h1>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
            <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">오늘 예약</div><div style="font-size:28px;font-weight:700">8건</div></div>
            <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">이번 주</div><div style="font-size:28px;font-weight:700">34건</div></div>
            <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">전체 고객</div><div style="font-size:28px;font-weight:700">1,247명</div></div>
          </div>
          <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
            <h3 style="margin-bottom:16px;font-weight:600">오늘 일정</h3>
            <div style="display:grid;gap:8px">
              ${['09:00 김철수 - 상담', '10:30 이영희 - 정기 점검', '13:00 박지성 - 초진', '14:30 최민수 - 재진', '16:00 홍길동 - 상담'].map(item => `
                <div style="padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:4px solid #3b82f6">${item}</div>
              `).join('')}
            </div>
          </div>
        </div>`,
    },
  ],
  'ecommerce': [
    {
      name: '쇼핑몰 메인',
      content: `
        <div style="font-family:system-ui;background:#ffffff;min-height:100vh">
          <header style="background:#1e293b;color:white;padding:16px 24px;display:flex;justify-content:space-between;align-items:center">
            <h1 style="font-size:20px;font-weight:700">🛒 My Shop</h1>
            <div style="display:flex;gap:16px;font-size:14px">
              <span>검색</span><span>장바구니(3)</span><span>마이페이지</span>
            </div>
          </header>
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:60px 24px;text-align:center;color:white">
            <h2 style="font-size:32px;font-weight:700;margin-bottom:8px">SPRING SALE</h2>
            <p style="font-size:18px;opacity:.8">전 상품 최대 30% 할인</p>
          </div>
          <div style="padding:24px;max-width:1200px;margin:0 auto">
            <h3 style="font-size:18px;font-weight:600;margin-bottom:16px">인기 상품</h3>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
              ${[
                { name: '프리미엄 에센스', price: '45,000', sale: '31,500', img: '🧴' },
                { name: '오가닉 샴푸', price: '28,000', sale: '22,400', img: '🧴' },
                { name: '헤어 트리트먼트', price: '35,000', sale: '24,500', img: '💆' },
                { name: '스타일링 왁스', price: '18,000', sale: '14,400', img: '✨' },
              ].map(p => `
                <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
                  <div style="background:#f8fafc;padding:40px;text-align:center;font-size:48px">${p.img}</div>
                  <div style="padding:16px">
                    <div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                    <div style="display:flex;gap:8px;align-items:center">
                      <span style="text-decoration:line-through;color:#94a3b8;font-size:13px">₩${p.price}</span>
                      <span style="font-weight:700;color:#ef4444">₩${p.sale}</span>
                    </div>
                    <button style="width:100%;margin-top:12px;background:#1e293b;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;font-size:13px">장바구니 담기</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>`,
    },
  ],
};

export default function PreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('beauty-salon');
  const [selectedScreen, setSelectedScreen] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const screens = DEMO_SCREENS[selectedTemplate] || [];
  const currentScreen = screens[selectedScreen];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-700/50 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="text-xl font-bold">
              <span className="text-blue-400">Launch</span>pad
            </a>
            <span className="text-sm text-gray-400">미리보기</span>
          </div>

          {/* 템플릿 전환 */}
          <div className="flex items-center gap-2">
            {Object.keys(DEMO_SCREENS).map(tid => (
              <button
                key={tid}
                onClick={() => { setSelectedTemplate(tid); setSelectedScreen(0); }}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  selectedTemplate === tid
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
              >
                {tid === 'beauty-salon' ? '✂️ 미용실' : tid === 'booking-crm' ? '📅 예약' : '🛒 쇼핑몰'}
              </button>
            ))}
          </div>

          {/* 뷰 모드 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('desktop')}
              className={`rounded-lg px-3 py-1.5 text-sm ${viewMode === 'desktop' ? 'bg-gray-600' : 'bg-gray-700/50 text-gray-400'}`}
            >
              🖥 데스크톱
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`rounded-lg px-3 py-1.5 text-sm ${viewMode === 'mobile' ? 'bg-gray-600' : 'bg-gray-700/50 text-gray-400'}`}
            >
              📱 모바일
            </button>
            <a
              href="/"
              className="ml-4 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium hover:bg-blue-500 transition"
            >
              내 프로젝트로 생성
            </a>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 사이드바: 화면 목록 */}
        <aside className="w-48 border-r border-gray-700/50 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase text-gray-500">화면 목록</h3>
          <div className="space-y-1">
            {screens.map((screen, i) => (
              <button
                key={i}
                onClick={() => setSelectedScreen(i)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  selectedScreen === i
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                {screen.name}
              </button>
            ))}
          </div>
        </aside>

        {/* 메인: 프리뷰 */}
        <main className="flex-1 flex items-start justify-center p-8">
          <div
            className={`overflow-hidden rounded-xl border border-gray-600 bg-white shadow-2xl transition-all ${
              viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-5xl'
            }`}
            style={{ height: viewMode === 'mobile' ? '812px' : '600px' }}
          >
            {currentScreen && (
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif}</style></head><body>${currentScreen.content}</body></html>`}
                className="h-full w-full border-0"
                title="Preview"
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
