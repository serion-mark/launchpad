'use client';

import { useState } from 'react';
import { logout } from '@/lib/api';

export default function SettingsTab() {
  const [notifications, setNotifications] = useState({
    appComplete: true,
    creditLow: true,
    trialExpire: true,
  });

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* 알림 설정 */}
      <div className="rounded-2xl bg-[#17171c] border border-[#2c2c35] p-6">
        <h3 className="text-base font-bold text-[#f2f4f6] mb-4">알림 설정</h3>
        <div className="space-y-3">
          {[
            { key: 'appComplete' as const, label: '앱 생성 완료 알림', desc: '앱 생성이 완료되면 알림을 받습니다' },
            { key: 'creditLow' as const, label: '크레딧 부족 알림', desc: '크레딧이 1,000cr 이하일 때 알림을 받습니다' },
            { key: 'trialExpire' as const, label: '체험 만료 알림', desc: '24시간 무료 체험이 만료되기 전 알림을 받습니다' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between rounded-xl bg-[#1b1b21] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[#f2f4f6]">{item.label}</p>
                <p className="text-xs text-[#6b7684]">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(item.key)}
                className={`relative h-6 w-11 rounded-full transition-colors ${notifications[item.key] ? 'bg-[#3182f6]' : 'bg-[#3a3a45]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${notifications[item.key] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 계정 연동 (준비중) */}
      <div className="rounded-2xl bg-[#17171c] border border-[#2c2c35] p-6">
        <h3 className="text-base font-bold text-[#f2f4f6] mb-4">계정 연동</h3>
        <div className="space-y-2">
          {[
            { provider: '카카오', icon: '💬', status: '준비 중' },
            { provider: '네이버', icon: '🟢', status: '준비 중' },
          ].map(item => (
            <div key={item.provider} className="flex items-center justify-between rounded-xl bg-[#1b1b21] px-4 py-3">
              <div className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-sm text-[#f2f4f6]">{item.provider}</span>
              </div>
              <span className="text-xs text-[#6b7684]">{item.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 로그아웃 */}
      <div className="rounded-2xl bg-[#17171c] border border-[#2c2c35] p-6">
        <h3 className="text-base font-bold text-[#f2f4f6] mb-4">계정</h3>
        <button
          onClick={logout}
          className="rounded-xl bg-[#f45452]/10 border border-[#f45452]/20 px-5 py-2.5 text-sm font-medium text-[#f45452] hover:bg-[#f45452]/20 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
