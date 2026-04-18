# 대시보드 페이지 패턴

## 레이아웃 구조
- 상단: 기간 선택 (오늘/주/월) + 필터
- 중앙 상단: StatCard 4개 (반응형 2x2 → 1x4)
- 중앙 하단: 차트 1~2개 + 최근 활동 리스트
- 하단: 빠른 액션 버튼

## 필수 컴포넌트
```typescript
const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, revenue: 0, growth: 0 })
const [chartData, setChartData] = useState<any[]>([])
const [recentList, setRecentList] = useState<any[]>([])
const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
const [loading, setLoading] = useState(true)
```

## StatCard 반응형 그리드
```tsx
<div data-component="StatsGrid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <div data-component="StatCard" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
    <div className="text-xs text-[var(--color-text-secondary)]">총 사용자</div>
    <div className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{stats.totalUsers.toLocaleString()}</div>
    <div className="text-xs text-green-500 mt-1">+{stats.growth}%</div>
  </div>
  {/* ... 3개 더 */}
</div>
```

## 차트 (recharts)
```typescript
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

<div data-component="ChartSection" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
  <h3 className="text-sm font-semibold mb-3">주간 추이</h3>
  <ResponsiveContainer width="100%" height={240}>
    <LineChart data={chartData}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

## Supabase 집계 조회 (RPC 함수 활용)
```typescript
// RPC 함수 호출 (DB에 미리 정의된 집계 쿼리)
const { data } = await supabase.rpc('get_dashboard_stats', { period })

// 또는 count 쿼리로 직접 집계
const { count: userCount } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', startDate)

// 일별 집계 (차트용)
const { data: daily } = await supabase
  .from('events')
  .select('date, count')
  .gte('date', startDate)
  .order('date')
```

## 기간 선택 토글
```tsx
<div className="flex gap-2 mb-4">
  {(['day', 'week', 'month'] as const).map(p => (
    <button
      key={p}
      onClick={() => setPeriod(p)}
      className={`px-3 py-1.5 rounded-lg text-sm ${period === p ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-primary)]'}`}
    >
      {p === 'day' ? '오늘' : p === 'week' ? '주간' : '월간'}
    </button>
  ))}
</div>
```

## 샘플 데이터 (비로그인 데모)
```typescript
const SAMPLE_STATS = { totalUsers: 1234, activeToday: 87, revenue: 3450000, growth: 12 }
const SAMPLE_CHART = [
  { date: '월', value: 100 }, { date: '화', value: 120 }, { date: '수', value: 95 },
  { date: '목', value: 140 }, { date: '금', value: 180 }, { date: '토', value: 160 }, { date: '일', value: 130 },
]
```
