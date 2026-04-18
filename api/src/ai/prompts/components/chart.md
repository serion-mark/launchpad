# 차트 컴포넌트 패턴 (신규!)

**이 문서는 recharts 차트 컴포넌트 생성 시 전용 지침입니다.**
**최대 파일 크기: 100줄 (F4 방지 핵심)**

---

## ⚠️ 1. 왜 차트 전용 .md가 필요한가?

**cpzm_v1 실패**: `tracking-chart.tsx` F4 발생.

차트 컴포넌트는:
- **ResponsiveContainer + LineChart/BarChart** 구조는 단순
- 근데 Sonnet이 자유롭게 만들면 **커스텀 Tooltip, Legend, ReferenceLine 등** 추가해서 300줄까지 팽창
- → F4

**이 문서는 100줄로 강제** (차트는 "시각화만", 로직은 부모에서).

---

## 🎯 2. 차트 표준 구조

```
부모 페이지 (데이터 fetch + props 전달)
    ↓
차트 컴포넌트 (data props 받아서 렌더만)
    ├─ ResponsiveContainer
    │   └─ LineChart | BarChart | AreaChart
    │       ├─ XAxis
    │       ├─ YAxis
    │       ├─ Tooltip
    │       └─ Line | Bar | Area
    └─ (선택) CartesianGrid
```

**차트는 "dumb component"** — props만 받고 렌더.

---

## 📋 3. 필수 Props

```tsx
interface ChartProps {
  data: ChartData[];        // 부모에서 가공된 데이터
  height?: number;           // 기본 240
  color?: string;            // CSS 변수
}

interface ChartData {
  date: string;              // X축 라벨
  value: number;             // Y축 값
  // 필요 시 추가 필드
}
```

**Props 4개 이내**. 고급 커스터마이징은 지양.

---

## 🎨 4. Good 예시 (LineChart, 약 50줄)

```tsx
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: Array<{ date: string; value: number }>;
  height?: number;
}

export function TrendChart({ data, height = 240 }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        data-component="TrendChartEmpty"
        className="flex items-center justify-center text-[var(--color-text-secondary)]"
        style={{ height }}
      >
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div data-component="TrendChart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            stroke="var(--color-text-secondary)"
            fontSize={12}
          />
          <YAxis
            stroke="var(--color-text-secondary)"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**= 약 45줄 / 완벽 / 안전**.

---

## 🎨 5. Good 예시 (BarChart, 약 45줄)

```tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DistributionChartProps {
  data: Array<{ name: string; count: number }>;
  height?: number;
}

export function DistributionChart({ data, height = 240 }: DistributionChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[var(--color-text-secondary)]"
        style={{ height }}
      >
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div data-component="DistributionChart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
          <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="count"
            fill="var(--color-primary)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 🔴 6. Bad 예시 (F4 발생!)

```tsx
'use client';

// ❌ 차트 5개 종류 한 파일에
import {
  LineChart, BarChart, PieChart, AreaChart, RadarChart, ScatterChart,
  Line, Bar, Pie, Area, Radar, Scatter, Cell,
  XAxis, YAxis, ZAxis, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, Legend, CartesianGrid, PolarGrid,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Brush, LabelList
} from 'recharts';

export function SuperChart({ ... 15 props }) {
  // ❌ 복잡한 데이터 변환
  const transformed = useMemo(() => {
    // 50줄 변환 로직
  }, [...]);

  // ❌ 커스텀 Tooltip (인라인 함수)
  const CustomTooltip = ({ active, payload, label }) => {
    return (
      <div>...복잡한 JSX 40줄...</div>
    );
  };

  // ❌ 커스텀 Legend
  const CustomLegend = ({ payload }) => {...};

  // ❌ ReferenceLine, ReferenceArea 등 과도한 장식

  return (
    <ResponsiveContainer>
      <LineChart data={transformed}>
        {/* 20+ 자식 컴포넌트 */}
      </LineChart>
    </ResponsiveContainer>
  );
}
// 총 300~400줄 = F4!
```

**문제**:
1. **데이터 변환은 부모에서** (useMemo 차트에서 X)
2. **커스텀 Tooltip/Legend는 별도 파일** 또는 **기본 사용**
3. **차트 1개 = 차트 파일 1개** (여러 종류 혼합 X)

---

## 🎯 7. 데이터 전처리 분리 원칙

### ❌ 차트 안에서 변환
```tsx
// 금지
function ChartBad({ rawData }) {
  const chartData = rawData.map(d => ({ date: formatDate(d.created_at), value: d.amount }));
  return <LineChart data={chartData}>...</LineChart>;
}
```

### ✅ 부모에서 변환, 차트는 받기만
```tsx
// 부모 (page.tsx)
const chartData = rawData.map(d => ({ date: formatDate(d.created_at), value: d.amount }));
<TrendChart data={chartData} />

// 차트 (dumb)
function TrendChart({ data }) {
  return <LineChart data={data}>...</LineChart>;
}
```

---

## 🎨 8. 색상 팔레트 (CSS 변수 활용)

```tsx
// 단일 시리즈
stroke="var(--color-primary)"
fill="var(--color-primary)"

// 다중 시리즈 (2~4개)
const COLORS = [
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-secondary)',
  '#10b981',  // 초록 (강조용)
];

<Line dataKey="users" stroke={COLORS[0]} />
<Line dataKey="revenue" stroke={COLORS[1]} />
```

---

## 📐 9. 반응형 차트 크기

```tsx
// 기본 (240px)
<TrendChart data={data} />

// 큰 차트 (메인 대시보드)
<TrendChart data={data} height={320} />

// 작은 차트 (StatCard 내부)
<TrendChart data={data} height={60} />
```

**ResponsiveContainer**가 너비를 100%로 자동 조정 → 부모 컨테이너 크기만 잡아주면 됨.

---

## 🧹 10. 흔한 실수 6개

1. **❌ ResponsiveContainer 없이 LineChart** → 크기 0
   ```tsx
   // 필수: ResponsiveContainer로 감싸기
   ```

2. **❌ data.length === 0 처리 없음**
   ```tsx
   // 추가: 빈 상태 UI
   if (data.length === 0) return <div>데이터 없음</div>;
   ```

3. **❌ height를 부모 style에 안 줌** → 높이 0
   ```tsx
   // 필수: style={{ height }} 또는 className="h-60"
   ```

4. **❌ dot={true} 기본값** → 점 많으면 지저분
   ```tsx
   <Line dot={false} />  // 추천
   ```

5. **❌ 너무 많은 데이터 포인트** → 100개 넘으면 성능 ↓
   ```tsx
   // 집계해서 30~50개로 줄이기 (부모에서 처리)
   ```

6. **❌ 커스텀 Tooltip 복잡** → 기본 Tooltip + contentStyle로 충분

---

## 🎯 11. 자체 검증 (출력 전!)

- [ ] 파일 100줄 이하? (차트 F4 방지 핵심!)
- [ ] data-component 속성?
- [ ] ResponsiveContainer로 감쌌나?
- [ ] height prop (기본값 240)?
- [ ] data.length === 0 빈 상태 처리?
- [ ] dataKey 정확히 명시?
- [ ] stroke/fill에 CSS 변수 사용?
- [ ] Tooltip contentStyle 기본 스타일?
- [ ] dot={false} (Line)?
- [ ] 데이터 변환 로직 없음 (부모 담당)?
