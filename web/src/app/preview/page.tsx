'use client';

import { useState } from 'react';

// ── 미용실 POS 데모 화면 ──
const beautyScreens = [
  {
    name: '대시보드',
    content: `<div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h1 style="font-size:24px;font-weight:700;color:#1e293b">💇 미용실 POS</h1>
        <span style="background:#3b82f6;color:white;padding:6px 16px;border-radius:8px;font-size:14px">관리자</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">오늘 매출</div><div style="font-size:28px;font-weight:700">₩1,280,000</div><div style="font-size:12px;color:#22c55e">↑ 15%</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">오늘 예약</div><div style="font-size:28px;font-weight:700">12건</div><div style="font-size:12px;color:#3b82f6">3건 대기</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">신규 고객</div><div style="font-size:28px;font-weight:700">5명</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">노쇼율</div><div style="font-size:28px;font-weight:700">3.2%</div><div style="font-size:12px;color:#22c55e">↓ 1.5%</div></div>
      </div>
      <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">오늘 예약 현황</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:10px;color:#64748b">시간</th><th style="text-align:left;padding:10px;color:#64748b">고객</th><th style="text-align:left;padding:10px;color:#64748b">시술</th><th style="text-align:left;padding:10px;color:#64748b">디자이너</th><th style="text-align:left;padding:10px;color:#64748b">상태</th></tr></thead>
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
    content: `<div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:700;color:#1e293b">📅 예약 관리</h2>
        <button style="background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px">+ 새 예약</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:20px;font-size:13px">전체</button>
        <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">대기</button>
        <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">확정</button>
        <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">완료</button>
      </div>
      <div style="display:grid;gap:12px">
        <div style="background:white;padding:16px 20px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 2px rgba(0,0,0,.05)"><div style="display:flex;align-items:center;gap:16px"><div style="font-size:15px;font-weight:600;color:#3b82f6;min-width:50px">10:00</div><div><div style="font-weight:600">김지현</div><div style="font-size:13px;color:#64748b">커트+염색 · 민수</div></div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-weight:600">₩85,000</span><span style="background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:12px;font-size:12px">완료</span></div></div>
        <div style="background:white;padding:16px 20px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 2px rgba(0,0,0,.05)"><div style="display:flex;align-items:center;gap:16px"><div style="font-size:15px;font-weight:600;color:#3b82f6;min-width:50px">11:30</div><div><div style="font-weight:600">이서윤</div><div style="font-size:13px;color:#64748b">디지털펌 · 수진</div></div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-weight:600">₩150,000</span><span style="background:#dbeafe;color:#2563eb;padding:4px 12px;border-radius:12px;font-size:12px">시술중</span></div></div>
        <div style="background:white;padding:16px 20px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 2px rgba(0,0,0,.05)"><div style="display:flex;align-items:center;gap:16px"><div style="font-size:15px;font-weight:600;color:#3b82f6;min-width:50px">14:30</div><div><div style="font-weight:600">최하은</div><div style="font-size:13px;color:#64748b">매직셋팅펌 · 수진</div></div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-weight:600">₩180,000</span><span style="background:#fef9c3;color:#ca8a04;padding:4px 12px;border-radius:12px;font-size:12px">대기</span></div></div>
      </div>
    </div>`,
  },
  {
    name: '고객 관리',
    content: `<div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:700;color:#1e293b">👥 고객 관리</h2>
        <div style="display:flex;gap:8px"><input placeholder="고객 검색..." style="border:1px solid #e2e8f0;padding:8px 16px;border-radius:8px;font-size:14px;width:200px" /><button style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:14px">+ 신규</button></div>
      </div>
      <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:12px 16px;color:#64748b">고객명</th><th style="text-align:left;padding:12px;color:#64748b">연락처</th><th style="text-align:left;padding:12px;color:#64748b">최근 방문</th><th style="text-align:left;padding:12px;color:#64748b">총 방문</th><th style="text-align:left;padding:12px;color:#64748b">누적 매출</th><th style="text-align:left;padding:12px;color:#64748b">등급</th></tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:12px 16px;font-weight:600">김지현</td><td style="padding:12px;color:#64748b">010-1234-5678</td><td style="padding:12px;color:#64748b">2026.03.18</td><td style="padding:12px">28회</td><td style="padding:12px;font-weight:600">₩2,450,000</td><td style="padding:12px"><span style="color:#eab308;font-weight:600">VIP</span></td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:12px 16px;font-weight:600">최하은</td><td style="padding:12px;color:#64748b">010-4567-8901</td><td style="padding:12px;color:#64748b">2026.03.12</td><td style="padding:12px">22회</td><td style="padding:12px;font-weight:600">₩3,200,000</td><td style="padding:12px"><span style="color:#a855f7;font-weight:600">VVIP</span></td></tr>
            <tr><td style="padding:12px 16px;font-weight:600">정도윤</td><td style="padding:12px;color:#64748b">010-5678-9012</td><td style="padding:12px;color:#64748b">2026.03.10</td><td style="padding:12px">3회</td><td style="padding:12px;font-weight:600">₩175,000</td><td style="padding:12px"><span style="color:#22c55e;font-weight:600">신규</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
  },
];

// ── 범용 예약/CRM 데모 화면 ──
const bookingScreens = [
  {
    name: '대시보드',
    content: `<div style="padding:24px;font-family:system-ui;background:#f0fdf4;min-height:100vh">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h1 style="font-size:24px;font-weight:700;color:#1e293b">🏥 우리 병원 예약 시스템</h1>
        <span style="background:#16a34a;color:white;padding:6px 16px;border-radius:8px;font-size:14px">원장님</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">오늘 예약</div><div style="font-size:28px;font-weight:700">18건</div><div style="font-size:12px;color:#16a34a">5건 대기</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">이번 주 환자</div><div style="font-size:28px;font-weight:700">87명</div><div style="font-size:12px;color:#3b82f6">↑ 12%</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">온라인 예약</div><div style="font-size:28px;font-weight:700">34%</div><div style="font-size:12px;color:#a855f7">전월 28%</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">노쇼율</div><div style="font-size:28px;font-weight:700">2.1%</div><div style="font-size:12px;color:#22c55e">↓ 0.8%</div></div>
      </div>
      <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">오늘 진료 일정</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:10px;color:#64748b">시간</th><th style="text-align:left;padding:10px;color:#64748b">환자명</th><th style="text-align:left;padding:10px;color:#64748b">진료 과목</th><th style="text-align:left;padding:10px;color:#64748b">담당의</th><th style="text-align:left;padding:10px;color:#64748b">상태</th></tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px">09:00</td><td>김철수</td><td>일반 진료</td><td>이원장</td><td><span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:12px;font-size:12px">완료</span></td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px">09:30</td><td>박영희</td><td>건강검진</td><td>김부원장</td><td><span style="background:#dbeafe;color:#2563eb;padding:3px 10px;border-radius:12px;font-size:12px">진료중</span></td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px">10:00</td><td>이민호</td><td>재활치료</td><td>이원장</td><td><span style="background:#fef9c3;color:#ca8a04;padding:3px 10px;border-radius:12px;font-size:12px">대기</span></td></tr>
            <tr><td style="padding:10px">10:30</td><td>정수진</td><td>초진 상담</td><td>김부원장</td><td><span style="background:#fef9c3;color:#ca8a04;padding:3px 10px;border-radius:12px;font-size:12px">대기</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
  },
  {
    name: '예약 캘린더',
    content: `<div style="padding:24px;font-family:system-ui;background:#f0fdf4;min-height:100vh">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:700;color:#1e293b">📅 예약 캘린더</h2>
        <div style="display:flex;gap:8px"><button style="background:#16a34a;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px">+ 새 예약</button></div>
      </div>
      <div style="background:white;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;align-items:center">
          <button style="border:1px solid #e2e8f0;background:white;padding:6px 12px;border-radius:6px">← 이전</button>
          <h3 style="font-size:18px;font-weight:700">2026년 3월</h3>
          <button style="border:1px solid #e2e8f0;background:white;padding:6px 12px;border-radius:6px">다음 →</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">
          <div style="padding:8px;font-weight:600;color:#ef4444;font-size:13px">일</div><div style="padding:8px;font-weight:600;color:#64748b;font-size:13px">월</div><div style="padding:8px;font-weight:600;color:#64748b;font-size:13px">화</div><div style="padding:8px;font-weight:600;color:#64748b;font-size:13px">수</div><div style="padding:8px;font-weight:600;color:#64748b;font-size:13px">목</div><div style="padding:8px;font-weight:600;color:#64748b;font-size:13px">금</div><div style="padding:8px;font-weight:600;color:#3b82f6;font-size:13px">토</div>
          <div style="padding:8px;color:#d1d5db">23</div><div style="padding:8px;color:#d1d5db">24</div><div style="padding:8px;color:#d1d5db">25</div><div style="padding:8px;color:#d1d5db">26</div><div style="padding:8px;color:#d1d5db">27</div><div style="padding:8px;color:#d1d5db">28</div><div style="padding:8px">1</div>
          <div style="padding:8px">2</div><div style="padding:8px">3</div><div style="padding:8px">4</div><div style="padding:8px">5</div><div style="padding:8px">6</div><div style="padding:8px">7</div><div style="padding:8px">8</div>
          <div style="padding:8px">9</div><div style="padding:8px">10</div><div style="padding:8px">11</div><div style="padding:8px">12</div><div style="padding:8px">13</div><div style="padding:8px">14</div><div style="padding:8px">15</div>
          <div style="padding:8px">16</div><div style="padding:8px">17</div><div style="padding:8px;background:#16a34a;color:white;border-radius:8px;font-weight:700">18</div><div style="padding:8px;position:relative">19<div style="width:6px;height:6px;background:#3b82f6;border-radius:50%;margin:2px auto 0"></div></div><div style="padding:8px;position:relative">20<div style="width:6px;height:6px;background:#3b82f6;border-radius:50%;margin:2px auto 0"></div></div><div style="padding:8px">21</div><div style="padding:8px">22</div>
        </div>
      </div>
    </div>`,
  },
  {
    name: '환자 관리',
    content: `<div style="padding:24px;font-family:system-ui;background:#f0fdf4;min-height:100vh">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:700;color:#1e293b">🧑‍⚕️ 환자 관리</h2>
        <div style="display:flex;gap:8px"><input placeholder="환자 검색..." style="border:1px solid #e2e8f0;padding:8px 16px;border-radius:8px;font-size:14px;width:200px" /><button style="background:#16a34a;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:14px">+ 신규 등록</button></div>
      </div>
      <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="background:#f0fdf4;border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:12px 16px;color:#64748b">환자명</th><th style="text-align:left;padding:12px;color:#64748b">연락처</th><th style="text-align:left;padding:12px;color:#64748b">최근 내원</th><th style="text-align:left;padding:12px;color:#64748b">진료 횟수</th><th style="text-align:left;padding:12px;color:#64748b">주요 진료</th><th style="text-align:left;padding:12px;color:#64748b">다음 예약</th></tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:12px 16px;font-weight:600">김철수</td><td style="padding:12px;color:#64748b">010-1111-2222</td><td style="padding:12px">2026.03.18</td><td style="padding:12px">15회</td><td style="padding:12px">일반 진료</td><td style="padding:12px"><span style="color:#16a34a;font-weight:600">03.25</span></td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:12px 16px;font-weight:600">박영희</td><td style="padding:12px;color:#64748b">010-3333-4444</td><td style="padding:12px">2026.03.18</td><td style="padding:12px">8회</td><td style="padding:12px">건강검진</td><td style="padding:12px"><span style="color:#64748b">미정</span></td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:12px 16px;font-weight:600">이민호</td><td style="padding:12px;color:#64748b">010-5555-6666</td><td style="padding:12px">2026.03.15</td><td style="padding:12px">22회</td><td style="padding:12px">재활치료</td><td style="padding:12px"><span style="color:#16a34a;font-weight:600">03.19</span></td></tr>
            <tr><td style="padding:12px 16px;font-weight:600">정수진</td><td style="padding:12px;color:#64748b">010-7777-8888</td><td style="padding:12px">-</td><td style="padding:12px">0회</td><td style="padding:12px">초진</td><td style="padding:12px"><span style="color:#16a34a;font-weight:600">03.18</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
  },
];

// ── 쇼핑몰 데모 화면 ──
const ecommerceScreens = [
  {
    name: '쇼핑몰 메인',
    content: `<div style="font-family:system-ui;background:#fff;min-height:100vh">
      <header style="background:#1e293b;color:white;padding:14px 24px;display:flex;justify-content:space-between;align-items:center">
        <h1 style="font-size:20px;font-weight:700">🛍 STYLE SHOP</h1>
        <div style="display:flex;gap:20px;font-size:14px;align-items:center"><span>카테고리</span><span>신상품</span><span>SALE</span><input placeholder="검색..." style="padding:6px 12px;border-radius:6px;border:none;font-size:13px;width:160px" /><span>🛒 3</span><span>👤</span></div>
      </header>
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:60px 24px;text-align:center;color:white">
        <h2 style="font-size:32px;font-weight:700;margin-bottom:8px">SPRING COLLECTION</h2>
        <p style="font-size:18px;opacity:.8">신상품 최대 30% OFF</p>
        <button style="margin-top:16px;background:white;color:#764ba2;border:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer">쇼핑하기 →</button>
      </div>
      <div style="padding:24px;max-width:1200px;margin:0 auto">
        <h3 style="font-size:18px;font-weight:600;margin-bottom:16px">🔥 베스트 상품</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
          <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#fef3c7;padding:48px;text-align:center;font-size:56px">👗</div><div style="padding:16px"><div style="font-weight:600;margin-bottom:4px">린넨 원피스</div><div style="display:flex;gap:8px;align-items:center"><span style="text-decoration:line-through;color:#94a3b8;font-size:13px">₩89,000</span><span style="font-weight:700;color:#ef4444">₩62,300</span></div><button style="width:100%;margin-top:12px;background:#1e293b;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;font-size:13px">장바구니</button></div></div>
          <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#dbeafe;padding:48px;text-align:center;font-size:56px">👜</div><div style="padding:16px"><div style="font-weight:600;margin-bottom:4px">미니 크로스백</div><div style="display:flex;gap:8px;align-items:center"><span style="text-decoration:line-through;color:#94a3b8;font-size:13px">₩45,000</span><span style="font-weight:700;color:#ef4444">₩31,500</span></div><button style="width:100%;margin-top:12px;background:#1e293b;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;font-size:13px">장바구니</button></div></div>
          <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#fce7f3;padding:48px;text-align:center;font-size:56px">👟</div><div style="padding:16px"><div style="font-weight:600;margin-bottom:4px">캔버스 스니커즈</div><div style="display:flex;gap:8px;align-items:center"><span style="text-decoration:line-through;color:#94a3b8;font-size:13px">₩65,000</span><span style="font-weight:700;color:#ef4444">₩45,500</span></div><button style="width:100%;margin-top:12px;background:#1e293b;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;font-size:13px">장바구니</button></div></div>
          <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#f0fdf4;padding:48px;text-align:center;font-size:56px">🧢</div><div style="padding:16px"><div style="font-weight:600;margin-bottom:4px">볼캡 모자</div><div style="display:flex;gap:8px;align-items:center"><span style="font-weight:700;color:#1e293b">₩28,000</span><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:11px">NEW</span></div><button style="width:100%;margin-top:12px;background:#1e293b;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;font-size:13px">장바구니</button></div></div>
        </div>
      </div>
    </div>`,
  },
  {
    name: '주문 관리',
    content: `<div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:700;color:#1e293b">📦 주문 관리</h2>
        <div style="display:flex;gap:8px">
          <button style="background:#6366f1;color:white;border:none;padding:8px 16px;border-radius:20px;font-size:13px">전체 156</button>
          <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">결제완료 23</button>
          <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">배송중 12</button>
          <button style="background:white;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;font-size:13px">배송완료 118</button>
        </div>
      </div>
      <div style="display:grid;gap:12px">
        <div style="background:white;padding:16px 20px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 2px rgba(0,0,0,.05)"><div><div style="font-weight:600;color:#1e293b">주문 #20260318-001</div><div style="font-size:13px;color:#64748b;margin-top:2px">김서연 · 린넨 원피스 외 1건 · ₩107,800</div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-size:13px;color:#64748b">03.18 14:22</span><span style="background:#dbeafe;color:#2563eb;padding:4px 12px;border-radius:12px;font-size:12px">결제완료</span></div></div>
        <div style="background:white;padding:16px 20px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 2px rgba(0,0,0,.05)"><div><div style="font-weight:600;color:#1e293b">주문 #20260318-002</div><div style="font-size:13px;color:#64748b;margin-top:2px">이준혁 · 캔버스 스니커즈 · ₩45,500</div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-size:13px;color:#64748b">03.18 11:05</span><span style="background:#fef9c3;color:#ca8a04;padding:4px 12px;border-radius:12px;font-size:12px">배송준비</span></div></div>
        <div style="background:white;padding:16px 20px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 2px rgba(0,0,0,.05)"><div><div style="font-weight:600;color:#1e293b">주문 #20260317-015</div><div style="font-size:13px;color:#64748b;margin-top:2px">박민지 · 미니 크로스백 · ₩31,500</div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-size:13px;color:#64748b">03.17 16:33</span><span style="background:#e0e7ff;color:#4338ca;padding:4px 12px;border-radius:12px;font-size:12px">배송중</span></div></div>
        <div style="background:white;padding:16px 20px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 2px rgba(0,0,0,.05)"><div><div style="font-weight:600;color:#1e293b">주문 #20260316-008</div><div style="font-size:13px;color:#64748b;margin-top:2px">최유나 · 볼캡 모자 외 2건 · ₩121,000</div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-size:13px;color:#64748b">03.16 09:18</span><span style="background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:12px;font-size:12px">배송완료</span></div></div>
      </div>
    </div>`,
  },
  {
    name: '매출 통계',
    content: `<div style="padding:24px;font-family:system-ui;background:#f8fafc;min-height:100vh">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:24px">📊 매출 통계</h2>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">이번 달 매출</div><div style="font-size:24px;font-weight:700;color:#1e293b">₩12,450,000</div><div style="font-size:12px;color:#22c55e">↑ 23% vs 지난달</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">주문 건수</div><div style="font-size:24px;font-weight:700">156건</div><div style="font-size:12px;color:#3b82f6">일평균 8.7건</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">객단가</div><div style="font-size:24px;font-weight:700">₩79,800</div><div style="font-size:12px;color:#22c55e">↑ 5%</div></div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><div style="font-size:13px;color:#64748b">반품/교환</div><div style="font-size:24px;font-weight:700">3건</div><div style="font-size:12px;color:#22c55e">1.9%</div></div>
      </div>
      <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">카테고리별 매출</h3>
        <div style="display:grid;gap:12px">
          <div style="display:flex;align-items:center;gap:12px"><div style="width:80px;font-size:14px;color:#64748b">의류</div><div style="flex:1;background:#e2e8f0;border-radius:8px;height:24px;overflow:hidden"><div style="background:#6366f1;height:100%;width:45%;border-radius:8px"></div></div><span style="font-size:14px;font-weight:600;width:100px;text-align:right">₩5,602,500</span></div>
          <div style="display:flex;align-items:center;gap:12px"><div style="width:80px;font-size:14px;color:#64748b">가방</div><div style="flex:1;background:#e2e8f0;border-radius:8px;height:24px;overflow:hidden"><div style="background:#3b82f6;height:100%;width:28%;border-radius:8px"></div></div><span style="font-size:14px;font-weight:600;width:100px;text-align:right">₩3,486,000</span></div>
          <div style="display:flex;align-items:center;gap:12px"><div style="width:80px;font-size:14px;color:#64748b">신발</div><div style="flex:1;background:#e2e8f0;border-radius:8px;height:24px;overflow:hidden"><div style="background:#22c55e;height:100%;width:18%;border-radius:8px"></div></div><span style="font-size:14px;font-weight:600;width:100px;text-align:right">₩2,241,000</span></div>
          <div style="display:flex;align-items:center;gap:12px"><div style="width:80px;font-size:14px;color:#64748b">액세서리</div><div style="flex:1;background:#e2e8f0;border-radius:8px;height:24px;overflow:hidden"><div style="background:#f59e0b;height:100%;width:9%;border-radius:8px"></div></div><span style="font-size:14px;font-weight:600;width:100px;text-align:right">₩1,120,500</span></div>
        </div>
      </div>
    </div>`,
  },
];

const DEMO_SCREENS: Record<string, { name: string; content: string }[]> = {
  'beauty-salon': beautyScreens,
  'booking-crm': bookingScreens,
  'ecommerce': ecommerceScreens,
};

export default function PreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('beauty-salon');
  const [selectedScreen, setSelectedScreen] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const screens = DEMO_SCREENS[selectedTemplate] || [];
  const currentScreen = screens[selectedScreen];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="border-b border-gray-700/50 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="/" className="text-xl font-bold"><span className="text-blue-400">Launch</span>pad</a>
            <span className="text-sm text-gray-400">미리보기</span>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(DEMO_SCREENS).map(tid => (
              <button key={tid} onClick={() => { setSelectedTemplate(tid); setSelectedScreen(0); }}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${selectedTemplate === tid ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:text-white'}`}>
                {tid === 'beauty-salon' ? '✂️ 미용실' : tid === 'booking-crm' ? '🏥 예약' : '🛍 쇼핑몰'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('desktop')} className={`rounded-lg px-3 py-1.5 text-sm ${viewMode === 'desktop' ? 'bg-gray-600' : 'bg-gray-700/50 text-gray-400'}`}>🖥 데스크톱</button>
            <button onClick={() => setViewMode('mobile')} className={`rounded-lg px-3 py-1.5 text-sm ${viewMode === 'mobile' ? 'bg-gray-600' : 'bg-gray-700/50 text-gray-400'}`}>📱 모바일</button>
            <a href="/" className="ml-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium hover:bg-blue-500 transition sm:ml-4">내 프로젝트로 생성</a>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-40 border-r border-gray-700/50 p-4 sm:w-48">
          <h3 className="mb-3 text-xs font-bold uppercase text-gray-500">화면 목록</h3>
          <div className="space-y-1">
            {screens.map((screen, i) => (
              <button key={i} onClick={() => setSelectedScreen(i)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${selectedScreen === i ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}>
                {screen.name}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex items-start justify-center p-4 sm:p-8">
          <div className={`overflow-hidden rounded-xl border border-gray-600 bg-white shadow-2xl transition-all ${viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-5xl'}`}
            style={{ height: viewMode === 'mobile' ? '812px' : '600px' }}>
            {currentScreen && (
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif}</style></head><body>${currentScreen.content}</body></html>`}
                className="h-full w-full border-0" title="Preview" />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
