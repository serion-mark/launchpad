# 리스트 페이지 패턴 (v2)

**이 문서는 목록/리스트 페이지 생성 시 전용 지침입니다.**
**최대 파일 크기: 250줄 (초과 시 하위 컴포넌트 분리)**

---

## 🎯 1. 리스트 페이지 핵심 구조

```
┌─────────────────────────────────────────┐
│ [제목]                         [+ 추가] │
├─────────────────────────────────────────┤
│ [🔍 검색창]         [필터 칩]           │
├─────────────────────────────────────────┤
│ [카드 or 테이블 리스트]                 │
│  - 아이템 1                             │
│  - 아이템 2 ← 클릭 → 모달               │
│  - 아이템 3                             │
├─────────────────────────────────────────┤
│           [이전] [1] [2] [3] [다음]     │
└─────────────────────────────────────────┘
```

---

## 📋 2. 필수 상태 관리

```tsx
const [items, setItems] = useState<Item[]>(SAMPLE);
const [search, setSearch] = useState('');
const [filter, setFilter] = useState<string>('all');
const [page, setPage] = useState(0);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
const PAGE_SIZE = 20;
```

**상태 개수: 8개 이내로 유지** (이 이상이면 분리 검토).

---

## 🔌 3. Supabase 조회 패턴 (완전판)

```tsx
const loadItems = async () => {
  setLoading(true);
  let query = supabase
    .from('items')
    .select('*, category:categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  // 검색
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  // 필터
  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  // RBAC (관리자 아니면 본인 것만)
  if (userRole !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  // 페이지네이션
  query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (!error && data) {
    setItems(data);
    setTotal(count || 0);
  }
  setLoading(false);
};
```

**비로그인 fallback**: `useEffect`에서 `if (!user) return;` 후 loadItems.

---

## 🔍 4. 검색 디바운싱 패턴 (성능 최적화)

```tsx
useEffect(() => {
  if (!user) return;
  const timer = setTimeout(() => {
    loadItems();
  }, 300); // 300ms 디바운싱
  return () => clearTimeout(timer);
}, [search, filter, page, user]);
```

**WHY**: 검색어 입력 시 매 키 입력마다 DB 쿼리 막기. 300ms 대기 후 1회만 호출.

---

## 🎨 5. Good 예시 (완전히 작동하는 200줄 리스트 페이지)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, Plus, X } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'pending' | 'archived';
  created_at: string;
}

const SAMPLE: Item[] = [
  { id: '1', name: '프로젝트 A', description: '샘플 설명', status: 'active', created_at: '2026-04-01' },
  { id: '2', name: '프로젝트 B', description: '진행 중', status: 'pending', created_at: '2026-04-02' },
  { id: '3', name: '프로젝트 C', description: '보관', status: 'archived', created_at: '2026-03-15' },
];

const STATUS_LABELS: Record<string, string> = {
  all: '전체',
  active: '활성',
  pending: '대기',
  archived: '보관',
};

const PAGE_SIZE = 20;

export default function ProjectsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Item[]>(SAMPLE);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(loadItems, 300);
    return () => clearTimeout(timer);
  }, [user, search, filter]);

  const loadItems = async () => {
    setLoading(true);
    let q = supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (search) q = q.ilike('name', `%${search}%`);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q.range(0, PAGE_SIZE - 1);
    if (data && data.length > 0) setItems(data);
    setLoading(false);
  };

  const handleSelect = (item: Item) => setSelectedItem(item);
  const closeModal = () => setSelectedItem(null);

  return (
    <div data-foundry-file="app/projects/page.tsx" data-component="ProjectsPage" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">프로젝트</h1>
        {user && (
          <button className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]">
            <Plus size={16} className="inline mr-1" />추가
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="프로젝트 검색..."
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        </div>
        <div className="flex gap-2">
          {Object.keys(STATUS_LABELS).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-2 rounded-lg text-sm ${
                filter === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
              }`}
            >
              {STATUS_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-b-2 border-[var(--color-primary)] rounded-full" />
        </div>
      )}
      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">프로젝트가 없습니다</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            data-component="ProjectCard"
            onClick={() => handleSelect(item)}
            className="p-5 rounded-xl shadow-sm bg-[var(--color-surface)] hover:shadow-md transition-shadow cursor-pointer"
          >
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{item.name}</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-accent)] text-white">
                {STATUS_LABELS[item.status]}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">{item.created_at}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 상세 모달 (동적 라우트 대신!) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            data-component="ProjectDetailModal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--color-surface)] rounded-xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedItem.name}</h2>
              <button onClick={closeModal}><X size={20} /></button>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-4">{selectedItem.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <span>{STATUS_LABELS[selectedItem.status]}</span>
              <span className="text-[var(--color-text-secondary)]">· {selectedItem.created_at}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**= 약 155줄 / 안전 범위 / 모든 필수 패턴 포함.**

---

## 🔴 6. Bad 예시 (F4 발생 — 이러면 안 됨!)

```tsx
'use client';

// ❌ 아이콘 20개 import (한 파일에서 다 안 씀)
import { Search, Plus, Edit, Trash, Filter, Eye, Check, X, ArrowUp, ArrowDown, ... } from 'lucide-react';

// ❌ SAMPLE이 너무 큼 (50줄)
const SAMPLE = [
  { id: '1', name: '...', description: '길게길게...', ...20개 필드... },
  ... 30개 엔트리
];

// ❌ 하위 컴포넌트를 한 파일에 전부 인라인 (각 50줄+)
function SearchBar({ value, onChange, placeholder, ... }) {
  const [focus, setFocus] = useState(false);
  // ... 50줄 ...
}

function FilterPanel({ filters, onFilterChange, options, ... }) {
  // ... 40줄 ...
}

function ItemCard({ item, onEdit, onDelete, onSelect, ... }) {
  const [hover, setHover] = useState(false);
  // ... 60줄 ...
}

function DetailModal({ item, onClose, onSave, ... }) {
  // ... 80줄 ...
}

function EditModal({ item, onClose, onSave, ... }) {
  // ... 80줄 ...
}

// 메인 컴포넌트
export default function Page() {
  // ❌ 상태 15개
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(0);
  // ... 10개 더

  // ❌ 복잡한 useMemo 3개
  const filtered = useMemo(() => {...}, [...]);
  const sorted = useMemo(() => {...}, [...]);
  const paginated = useMemo(() => {...}, [...]);

  return (
    <div>
      {/* ❌ 모든 UI 인라인 (400줄 넘는 JSX) */}
      <header>...</header>
      <SearchBar ... />
      <FilterPanel ... />
      {/* 수많은 컴포넌트들 */}
    </div>
  );
}
// 총 500~700줄 = 15~20K 토큰 = F4 발생!
```

**핵심 문제**:
- 하위 컴포넌트가 한 파일에 4개 이상 = 분리 필요 신호
- 상태 10개+ = 설계 재검토
- 인라인 컴포넌트 50줄+ = 반드시 별도 파일로

---

## 📂 7. 하위 컴포넌트 분리 기준

### 언제 분리?
- 인라인 함수 컴포넌트가 50줄 넘을 때
- 같은 페이지에 3개 이상 하위 컴포넌트가 있을 때
- 모달/드롭다운/차트 등 재사용 가능성 있는 UI

### 분리 방법
```
app/projects/
├── page.tsx                        (메인 리스트, 200줄 이내)
└── components/
    ├── project-card.tsx            (카드 컴포넌트, 80줄)
    ├── project-detail-modal.tsx    (모달, 100줄)
    └── project-filter-bar.tsx      (필터 바, 60줄)
```

**page.tsx에서 import**:
```tsx
import { ProjectCard } from './components/project-card';
import { ProjectDetailModal } from './components/project-detail-modal';
```

---

## 🎯 8. 상세 페이지 대안 (동적 라우트 금지!)

### 방법 A: 모달 (추천)
```tsx
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

// 목록에서 클릭
<div onClick={() => setSelectedItem(item)}>...</div>

// 모달 렌더
{selectedItem && (
  <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
)}
```

### 방법 B: searchParams + 상세 페이지
```tsx
// app/projects/detail/page.tsx (동적 아님!)
'use client';
import { useSearchParams, useRouter } from 'next/navigation';

export default function DetailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  // id로 데이터 조회
}

// 목록에서 이동
<Link href={`/projects/detail?id=${item.id}`}>
```

**둘 다 동적 라우트 안 씀 → static export 가능**.

---

## 📝 9. 페이지네이션 UI

```tsx
const totalPages = Math.ceil(total / PAGE_SIZE);
const canPrev = page > 0;
const canNext = page < totalPages - 1;

<div className="flex items-center justify-center gap-2 mt-6">
  <button
    onClick={() => setPage(p => p - 1)}
    disabled={!canPrev}
    className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] disabled:opacity-40"
  >
    이전
  </button>
  <span className="px-4 text-sm text-[var(--color-text-primary)]">
    {page + 1} / {totalPages}
  </span>
  <button
    onClick={() => setPage(p => p + 1)}
    disabled={!canNext}
    className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] disabled:opacity-40"
  >
    다음
  </button>
</div>
```

**또는 무한 스크롤** (IntersectionObserver 사용 — 선택).

---

## 🧹 10. 흔한 실수 5개

1. **❌ useEffect 의존성에 `loadItems` 함수 추가** → 무한 렌더링
   ```tsx
   // 금지
   useEffect(() => { loadItems() }, [loadItems]);
   // 올바름: 의존성은 search/filter/page/user만
   ```

2. **❌ Supabase 에러 무시**
   ```tsx
   // 금지
   const { data } = await supabase.from(...).select();
   setItems(data); // data가 null이면 에러!
   // 올바름:
   const { data, error } = await supabase.from(...).select();
   if (!error && data) setItems(data);
   ```

3. **❌ 하드코딩 배경색**
   ```tsx
   // 금지
   <div className="bg-white">
   // 올바름:
   <div className="bg-[var(--color-surface)]">
   ```

4. **❌ 모든 필드 select**
   ```tsx
   // 비효율 (큰 텍스트 필드 포함)
   .select('*')
   // 추천: 필요한 필드만
   .select('id, name, status, created_at')
   ```

5. **❌ 디바운싱 없이 search 의존성**
   ```tsx
   useEffect(() => { loadItems(); }, [search]); // 매 키입력마다 쿼리!
   // 올바름: setTimeout 300ms
   ```

---

## 🎯 11. 자체 검증 (출력 전!)

- [ ] 파일 250줄 이하?
- [ ] 하위 컴포넌트 50줄+ 있으면 분리됐나?
- [ ] 'use client' + data-foundry-file 있나?
- [ ] Supabase select/eq/range 올바른가?
- [ ] 검색 디바운싱 300ms 있나?
- [ ] 비로그인 샘플 fallback 작동?
- [ ] 로딩/빈/에러 상태 전부 있나?
- [ ] 동적 라우트 없나? ([id] 금지)
- [ ] CSS 변수 사용 중? (하드코딩 색상 X)
- [ ] 모든 아이콘/import 실제로 사용 중?
