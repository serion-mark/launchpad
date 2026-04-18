# 카드/아이템 컴포넌트 패턴 (신규!)

**이 문서는 반복되는 카드/아이템 UI 컴포넌트 생성 시 전용 지침입니다.**
**최대 파일 크기: 100줄 (작게 유지!)**

---

## 🎯 1. 카드 컴포넌트 유형

- **ItemCard**: 리스트의 단일 아이템 (프로젝트, 주문 등)
- **StatCard**: 대시보드 숫자 카드
- **UserCard**: 프로필 카드
- **FeatureCard**: 홈페이지 기능 소개

**공통점**: 단순한 표시용 컴포넌트. 비즈니스 로직 X.

---

## 📋 2. Props 원칙

```tsx
interface ItemCardProps {
  item: Item;
  onClick?: () => void;
  selected?: boolean;
}
```

**Props 4개 이내**. 복잡한 로직은 부모에서.

---

## 🎨 3. Good 예시: ItemCard (약 40줄)

```tsx
'use client';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'pending' | 'archived';
  created_at: string;
}

interface ProjectCardProps {
  project: Project;
  onClick?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  archived: 'bg-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  active: '활성',
  pending: '대기',
  archived: '보관',
};

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div
      data-component="ProjectCard"
      onClick={() => onClick?.(project.id)}
      className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)] hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-[var(--color-text-primary)] line-clamp-1">{project.name}</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs text-white ${STATUS_COLORS[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">{project.description}</p>
      <div className="text-xs text-[var(--color-text-secondary)]">
        {new Date(project.created_at).toLocaleDateString('ko-KR')}
      </div>
    </div>
  );
}
```

**= 약 45줄 / 완벽**.

---

## 🎨 4. Good 예시: StatCard (약 35줄)

```tsx
'use client';

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  change?: number;
  format?: 'number' | 'currency' | 'percent';
}

export function StatCard({ icon: Icon, label, value, change, format = 'number' }: StatCardProps) {
  const formatted =
    typeof value === 'number'
      ? format === 'currency'
        ? `₩${value.toLocaleString()}`
        : format === 'percent'
        ? `${value}%`
        : value.toLocaleString()
      : value;

  return (
    <div data-component="StatCard" className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-xs mb-2">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)]">{formatted}</div>
      {change !== undefined && (
        <div className={`text-xs mt-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
    </div>
  );
}
```

**= 약 35줄 / 완벽 / 재사용성 극대화**.

---

## 🎨 5. Good 예시: FeatureCard (홈페이지용, 약 30줄)

```tsx
'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

export function FeatureCard({ icon: Icon, title, description, href }: FeatureCardProps) {
  return (
    <Link href={href} data-component="FeatureCard">
      <div className="p-6 rounded-xl shadow-sm bg-[var(--color-surface)] hover:shadow-md transition-shadow h-full">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
          <Icon size={20} className="text-[var(--color-primary)]" />
        </div>
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
      </div>
    </Link>
  );
}
```

---

## 🔴 6. Bad 예시 (F4 위험)

```tsx
// ❌ 카드 안에 로직 전부
export function BadCard({ item }) {
  // ❌ Supabase 조회
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    supabase.from('details').select().eq('item_id', item.id)...
  }, [item.id]);

  // ❌ 복잡한 계산
  const stats = useMemo(() => {
    return item.activities.reduce(...)
  }, [item]);

  // ❌ 인라인 편집 기능
  const [editing, setEditing] = useState(false);
  // ... 편집 로직 50줄

  // ❌ 매우 긴 JSX
  return (
    <div>
      {/* 200줄 UI */}
    </div>
  );
}
// 총 300줄 = F4!
```

**문제**: 카드 = dumb component. 로직은 부모에서.

---

## 📐 7. 카드 크기/간격 표준

### 그리드에서
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(i => <ProjectCard key={i.id} project={i} />)}
</div>
```

### 단일 카드
```tsx
<div className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)]">
```

### 카드 내부 간격
- `mb-2` (요소 간)
- `mb-3` (섹션 간)
- `pt-4 border-t` (구분선)

---

## 🎨 8. 선택 상태 표현 (`selected` prop)

```tsx
<div
  className={`p-5 rounded-xl shadow-sm cursor-pointer ${
    selected
      ? 'bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)]'
      : 'bg-[var(--color-surface)] hover:shadow-md'
  }`}
>
```

---

## 🧹 9. 흔한 실수 5개

1. **❌ onClick이 있는데 cursor-pointer 없음** → UX 혼란
2. **❌ line-clamp 없는 긴 제목** → 카드 크기 깨짐
   ```tsx
   <h3 className="line-clamp-1">  // 1줄
   <p className="line-clamp-2">   // 2줄
   ```
3. **❌ transition 없이 hover** → 급작스러운 변화
   ```tsx
   className="transition-shadow hover:shadow-md"
   ```
4. **❌ 고정 높이** → 내용 길이 다른 카드 불균형
   ```tsx
   // 금지: className="h-40"
   // 올바름: 내용에 맞춰 자연 크기 + line-clamp
   ```
5. **❌ 배경 하드코딩**
   ```tsx
   // 금지: bg-white
   // 올바름: bg-[var(--color-surface)]
   ```

---

## 🎯 10. 자체 검증 (출력 전!)

- [ ] 파일 100줄 이하?
- [ ] data-component 있나?
- [ ] Props 4개 이내?
- [ ] 비즈니스 로직 없음 (부모 담당)?
- [ ] CSS 변수 사용?
- [ ] line-clamp로 긴 텍스트 처리?
- [ ] hover transition 있나?
- [ ] onClick 있으면 cursor-pointer?
- [ ] 선택 상태 시각적 구분?
- [ ] 반응형 breakpoint 활용?
