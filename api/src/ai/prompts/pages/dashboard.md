# 대시보드 페이지 패턴 (v2)

**이 문서는 대시보드/통계/분석 페이지 생성 시 전용 지침입니다.**
**최대 파일 크기: 250줄 (초과 시 StatCard/차트 컴포넌트 분리)**

---

## 🎯 1. 대시보드 핵심 구조

```
┌─────────────────────────────────────────────┐
│ [제목]            [오늘] [주간] [월간] 🔘    │
├─────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │
│ │총합 │ │오늘 │ │매출 │ │증가 │ ← 4 StatCards│
│ └─────┘ └─────┘ └─────┘ └─────┘             │
├─────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐          │
│ │  추이 차트   │  │  분포 차트   │          │
│ │  (LineChart) │  │  (BarChart)  │          │
│ └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────┤
│  최근 활동 (5개)                            │
│  - 활동 1                                    │
│  - 활동 2                                    │
└─────────────────────────────────────────────┘
```

---

## 📋 2. 필수 상태 관리

```tsx
const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
const [stats, setStats] = useState({
  totalUsers: 0,
  activeToday: 0,
  revenue: 0,
  growth: 0,
});
const [chartData, setChartData] = useState<any[]>([]);
const [recentList, setRecentList] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
```

---

## 📦 3. recharts Import 패턴 (트리쉐이킹)

```tsx
// ✅ 필요한 것만 import
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ❌ 전체 import 금지
import * as recharts from 'recharts';
```

**꼭 필요한 요소만**: `ResponsiveContainer` + `LineChart/BarChart` + `Line/Bar` + `XAxis/YAxis` + `Tooltip`. CartesianGrid/Legend는 선택.

---

## 🔌 4. Supabase 집계 패턴

### 전체 count
```tsx
const { count } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true });
setStats(s => ({ ...s, totalUsers: count || 0 }));
```

### 조건부 count (오늘 가입)
```tsx
const today = new Date();
today.setHours(0, 0, 0, 0);
const { count: todayCount } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', today.toISOString());
setStats(s => ({ ...s, activeToday: todayCount || 0 }));
```

### RPC (복잡한 집계)
```tsx
// DB에 함수 미리 정의 필요
const { data } = await supabase.rpc('get_dashboard_stats', { period });
if (data) setStats(data);
```

### 일별 집계 (차트 데이터)
```tsx
// 방법 A: RPC로 한 번에
const { data } = await supabase.rpc('get_daily_counts', { days: 7 });
setChartData(data || []);

// 방법 B: 프론트에서 groupBy (소규모)
const { data } = await supabase
  .from('events')
  .select('created_at, amount')
  .gte('created_at', startDate);
const grouped = groupByDate(data || []); // 유틸 함수
setChartData(grouped);
```

---

## 🎨 5. Good 예시 (완전 작동 250줄 이하 대시보드)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, ShoppingBag, Activity } from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeToday: number;
  revenue: number;
  growth: number;
}

const SAMPLE_STATS: Stats = {
  totalUsers: 1234,
  activeToday: 87,
  revenue: 3450000,
  growth: 12.5,
};

const SAMPLE_CHART = [
  { date: '월', value: 100 },
  { date: '화', value: 120 },
  { date: '수', value: 95 },
  { date: '목', value: 140 },
  { date: '금', value: 180 },
  { date: '토', value: 160 },
  { date: '일', value: 130 },
];

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<Stats>(SAMPLE_STATS);
  const [chartData, setChartData] = useState(SAMPLE_CHART);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user, period]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [{ count: total }, { count: today }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      ]);
      setStats({
        totalUsers: total || SAMPLE_STATS.totalUsers,
        activeToday: today || SAMPLE_STATS.activeToday,
        revenue: SAMPLE_STATS.revenue,
        growth: SAMPLE_STATS.growth,
      });
    } finally {
      setLoading(false);
    }
  };

  const PERIODS: { key: 'day' | 'week' | 'month'; label: string }[] = [
    { key: 'day', label: '오늘' },
    { key: 'week', label: '주간' },
    { key: 'month', label: '월간' },
  ];

  return (
    <div data-foundry-file="app/dashboard/page.tsx" data-component="DashboardPage" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">대시보드</h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                period === p.key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div data-component="StatsGrid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div data-component="StatCard" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-xs mb-2">
            <Users size={14} />총 사용자
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
            {stats.totalUsers.toLocaleString()}
          </div>
        </div>

        <div data-component="StatCard" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-xs mb-2">
            <Activity size={14} />오늘 활동
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
            {stats.activeToday}
          </div>
        </div>

        <div data-component="StatCard" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-xs mb-2">
            <ShoppingBag size={14} />매출
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
            ₩{stats.revenue.toLocaleString()}
          </div>
        </div>

        <div data-component="StatCard" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-xs mb-2">
            <TrendingUp size={14} />증가율
          </div>
          <div className="text-2xl font-bold text-green-500">
            +{stats.growth}%
          </div>
        </div>
      </div>

      <div data-component="ChartSection" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)] mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">주간 추이</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" stroke="var(--color-text-secondary)" fontSize={12} />
            <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
              }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**= 약 175줄 / 안전 / 4 StatCards + Line Chart + 기간 토글 전부 포함.**

---

## 🔴 6. Bad 예시 (F4 발생!)

```tsx
'use client';

// ❌ recharts 전체 import
import * as recharts from 'recharts';

// ❌ 모든 차트 다 import
import {
  LineChart, BarChart, PieChart, ScatterChart, AreaChart, RadarChart,
  Line, Bar, Pie, Scatter, Area, Radar,
  XAxis, YAxis, ZAxis, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, Legend, CartesianGrid, PolarGrid,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
  Sector, Cell, LabelList, ErrorBar, Brush
} from 'recharts';

// ❌ StatCard 인라인 10개 (각 30줄)
<StatCard icon={...} label="..." value={...} change={...} sparkline={...} />
<StatCard ...10개
// 또는 StatCard를 인라인 함수로 정의 (60줄)

// ❌ 차트 5개 (대시보드에 너무 많음)
<LineChart />
<BarChart />
<PieChart />
<AreaChart />
<ScatterChart />

// ❌ 과도한 데이터 변환 (useMemo 5개)
const chartData = useMemo(() => {...}, [...]);
const barData = useMemo(() => {...}, [...]);
const pieData = useMemo(() => {...}, [...]);
// ...

// 합계 600~800줄 = F4 보장!
```

**문제**:
- 차트 5개+ = 한 페이지에 너무 많음 (최대 2~3개)
- StatCard 10개+ = UX 오히려 떨어짐 (4~6개가 적정)
- recharts 과도 import

---

## 📊 7. 차트 선택 가이드

| 상황 | 추천 차트 |
|------|----------|
| 시간대별 추이 | **LineChart** (일/주/월) |
| 카테고리 비교 | **BarChart** (세로 or 가로) |
| 누적 추이 | **AreaChart** |
| 비율 | **PieChart** (5개 이하만!) |

### LineChart 표준 (가장 많이 씀)
```tsx
<ResponsiveContainer width="100%" height={240}>
  <LineChart data={data}>
    <XAxis dataKey="date" stroke="var(--color-text-secondary)" fontSize={12} />
    <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
    <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

### BarChart 표준
```tsx
<ResponsiveContainer width="100%" height={240}>
  <BarChart data={data}>
    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
    <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
    <Tooltip />
    <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### 차트는 **최대 2개**까지만 한 페이지에. 더 필요하면 탭/별도 페이지.

---

## 📐 8. StatCard 표준 구조 (복사해 사용)

```tsx
<div data-component="StatCard" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
  <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-xs mb-2">
    <Icon size={14} />{label}
  </div>
  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
    {value.toLocaleString()}
  </div>
  {change !== undefined && (
    <div className={`text-xs mt-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
      {change >= 0 ? '+' : ''}{change}%
    </div>
  )}
</div>
```

**반응형 그리드**: `grid-cols-2 lg:grid-cols-4` (모바일 2x2, 데스크톱 1x4).

---

## 🎨 9. 컴포넌트 분리 기준

### 200줄 넘기 시작하면 즉시 분리:

```
app/dashboard/
├── page.tsx                         (메인, 180줄)
└── components/
    ├── stat-card.tsx                (StatCard, 40줄)
    ├── trend-chart.tsx              (LineChart, 60줄)
    └── recent-activity.tsx          (최근 목록, 50줄)
```

### page.tsx에서 사용:
```tsx
import { StatCard } from './components/stat-card';
import { TrendChart } from './components/trend-chart';
```

---

## 🧹 10. 흔한 실수 7개

1. **❌ 차트 5개 이상 넣기** → 사용자 혼란
   ```
   최대 2~3개. 나머지는 탭으로 분리.
   ```

2. **❌ ResponsiveContainer 없이 LineChart** → 크기 0 (안 보임)
   ```tsx
   // 필수: ResponsiveContainer로 감싸기
   ```

3. **❌ dot={false} 없이 LineChart** → 점 너무 많으면 지저분
   ```tsx
   <Line ... dot={false} />
   ```

4. **❌ 차트 색상 하드코딩**
   ```tsx
   // 금지
   <Line stroke="#3182f6" />
   // 올바름:
   <Line stroke="var(--color-primary)" />
   ```

5. **❌ 데이터 없는 상태 처리 없음**
   ```tsx
   {chartData.length === 0 ? (
     <div className="h-60 flex items-center justify-center text-[var(--color-text-secondary)]">
       데이터 없음
     </div>
   ) : (
     <LineChart ... />
   )}
   ```

6. **❌ toLocaleString() 없이 큰 숫자** → "1234567" 보다 "1,234,567" 가독성 ↑

7. **❌ 기간 변경 시 차트 애니메이션 없음**
   ```tsx
   // recharts 기본 애니메이션 있음. 끄지 말 것.
   ```

---

## 🎯 11. 자체 검증 (출력 전!)

- [ ] 파일 250줄 이하?
- [ ] 'use client' + data-foundry-file 있나?
- [ ] StatCard 4~6개 (너무 많지 않음)?
- [ ] 차트 2~3개 이하?
- [ ] ResponsiveContainer로 감쌌나?
- [ ] 색상 CSS 변수 사용?
- [ ] 기간 토글 작동?
- [ ] SAMPLE 데이터로 비로그인 fallback?
- [ ] Promise.all로 병렬 쿼리 (성능)?
- [ ] 로딩/빈 상태 처리?
