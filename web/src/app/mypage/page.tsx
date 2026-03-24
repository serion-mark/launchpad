'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/api';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import ProfileTab from './components/ProfileTab';
import CreditTab from './components/CreditTab';
import AppsTab from './components/AppsTab';
import BillingTab from './components/BillingTab';
import SettingsTab from './components/SettingsTab';

const TABS = [
  { id: 'profile', label: '내 정보', icon: '👤' },
  { id: 'credit', label: '크레딧', icon: '💰' },
  { id: 'apps', label: '내 앱', icon: '📱' },
  { id: 'billing', label: '정산', icon: '🧾' },
  { id: 'settings', label: '설정', icon: '⚙️' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [user, setUser] = useState<{ userId: string; email: string } | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      window.location.href = '/login?redirect=/mypage';
      return;
    }
    setUser(u);
    // URL hash로 탭 전환
    const hash = window.location.hash.replace('#', '') as TabId;
    if (hash && TABS.some(t => t.id === hash)) setActiveTab(hash);
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f0f14]">
      <LandingNav />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <h1 className="text-2xl font-bold text-[#f2f4f6] mb-6">마이페이지</h1>

        {/* 탭 네비게이션 */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-[#2c2c35]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-[#3182f6] border-b-2 border-[#3182f6] bg-[#3182f6]/5'
                  : 'text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#1b1b21]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        <div className="min-h-[60vh]">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'credit' && <CreditTab />}
          {activeTab === 'apps' && <AppsTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
      <Footer />
    </div>
  );
}
