# 상세 페이지 패턴 (v2)

**이 문서는 개별 항목 상세 보기/편집 페이지 생성 시 전용 지침입니다.**
**최대 파일 크기: 250줄 (초과 시 섹션별 컴포넌트 분리)**

---

## ⚠️ 1. 핵심 원칙 — 동적 라우트 금지!

Static export에서는 `[id]` 폴더를 못 씀. **2가지 대안**:

### 방법 A: 모달 (리스트 페이지 내)
목록에서 클릭 → 같은 페이지 내 모달 표시. 자세한 건 `pages/list.md` 참조.

### 방법 B: searchParams (전용 상세 페이지)
```
app/projects/detail/page.tsx  ← 동적 아닌 일반 폴더
```
URL: `/projects/detail?id=abc123`
`useSearchParams()`로 id 추출.

**이 문서는 방법 B에 대한 지침**.

---

## 📋 2. 필수 상태 관리

```tsx
const [item, setItem] = useState<Item | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [confirmDelete, setConfirmDelete] = useState(false);
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
```

---

## 🔌 3. searchParams + 상세 조회 패턴

```tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function DetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      router.push('/projects');  // id 없으면 목록으로
      return;
    }
    loadItem();
  }, [id]);

  const loadItem = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*, creator:users(name, email), tags:project_tags(name)')
      .eq('id', id)
      .single();
    if (error) {
      setError(error.message);
    } else {
      setItem(data);
    }
    setLoading(false);
  };
}
```

---

## 🔗 4. 관계형 조회 패턴 (Supabase .select)

### 1:1 관계 (N:1)
```tsx
// 프로젝트 + 생성자
.select('*, creator:users(name, email, avatar_url)')
```

### 1:N 관계
```tsx
// 주문 + 주문 항목
.select('*, items:order_items(*)')

// 중첩 (주문 → 항목 → 상품)
.select('*, items:order_items(*, product:products(name, price))')
```

### 여러 관계 동시
```tsx
.select(`
  *,
  customer:customers(name, phone),
  staff:staff_members(name),
  payments:payments(id, amount, method)
`)
```

---

## 🎨 5. Good 예시 (완전 작동 250줄 이하 상세 페이지)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Edit, Trash } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'pending' | 'archived';
  created_at: string;
  creator?: { name: string; email: string };
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  archived: 'bg-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  active: '활성',
  pending: '대기',
  archived: '보관',
};

export default function ProjectDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const id = searchParams.get('id');

  const [user, setUser] = useState<any>(null);
  const [item, setItem] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!id) {
      router.push('/projects');
      return;
    }
    loadItem();
  }, [id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadItem = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*, creator:users(name, email)')
      .eq('id', id)
      .single();
    if (!error && data) setItem(data);
    setLoading(false);
  };

  const handleEdit = () => {
    router.push(`/projects/edit?id=${id}`);
  };

  const handleDelete = async () => {
    if (!user) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      setToast({ message: '삭제 실패', type: 'error' });
      return;
    }
    setToast({ message: '삭제 완료', type: 'success' });
    setTimeout(() => router.push('/projects'), 1000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-b-2 border-[var(--color-primary)] rounded-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20 text-[var(--color-text-secondary)]">
        프로젝트를 찾을 수 없습니다
      </div>
    );
  }

  return (
    <div data-foundry-file="app/projects/detail/page.tsx" data-component="ProjectDetailPage" className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft size={16} />뒤로
        </button>

        {user && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
            >
              <Edit size={14} />수정
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm"
            >
              <Trash size={14} />삭제
            </button>
          </div>
        )}
      </div>

      <div data-component="DetailCard" className="p-6 rounded-xl shadow-sm bg-[var(--color-surface)] mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{item.name}</h1>
          <span className={`px-3 py-1 rounded-full text-xs text-white ${STATUS_COLORS[item.status]}`}>
            {STATUS_LABELS[item.status]}
          </span>
        </div>

        <p className="text-[var(--color-text-secondary)] mb-4 whitespace-pre-wrap">
          {item.description || '설명이 없습니다'}
        </p>

        <div className="pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
          {item.creator && <div>작성자: {item.creator.name}</div>}
          <div>생성일: {new Date(item.created_at).toLocaleDateString('ko-KR')}</div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">삭제 확인</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              정말 삭제하시겠습니까? 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
```

**= 약 210줄 / 모든 필수 패턴 포함 / 안전 범위.**

---

## 🔴 6. Bad 예시 (F4 발생!)

```tsx
// ❌ 모든 기능을 한 파일에 (편집 모드 포함)
export default function Page() {
  // 편집 모드 / 보기 모드 토글 + 폼 상태 + 삭제 확인 + ...
  // 400~600줄 JSX
}
```

**문제**: 상세 페이지에 **편집 기능**까지 넣으면 비대해짐. **편집은 별도 페이지** (`detail/edit/page.tsx`).

---

## 🔄 7. 상태 전이 머신 (상태 변경 가드)

```tsx
type Status = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

const canTransition = (from: Status, to: Status): boolean => {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
};

const handleStatusChange = async (newStatus: Status) => {
  if (!item || !canTransition(item.status, newStatus)) {
    setToast({ message: '유효하지 않은 상태 변경', type: 'error' });
    return;
  }
  const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', id);
  if (error) {
    setToast({ message: '변경 실패', type: 'error' });
    return;
  }
  await loadItem();
};
```

---

## 🔐 8. 복수 테이블 안전 업데이트 (트랜잭션 패턴)

Supabase는 트랜잭션이 없어서 **순차 처리**:

```tsx
const handleComplete = async () => {
  setLoading(true);
  try {
    // 1) 메인 레코드
    const { error: e1 } = await supabase
      .from('orders').update({ status: 'completed' }).eq('id', orderId);
    if (e1) throw e1;

    // 2) 관련 레코드
    const { error: e2 } = await supabase
      .from('customers').update({ visit_count: count + 1 }).eq('id', customerId);
    if (e2) throw e2;

    // 3) 로그
    const { error: e3 } = await supabase
      .from('activity_log').insert([{ action: 'order_complete', order_id: orderId }]);
    if (e3) throw e3;

    await loadItem();
    setToast({ message: '완료!', type: 'success' });
  } catch (err: any) {
    setToast({ message: '처리 실패: ' + err.message, type: 'error' });
    // 실패 시 수동 롤백 (필요 시)
  } finally {
    setLoading(false);
  }
};
```

---

## 📂 9. 컴포넌트 분리 기준 (detail 페이지)

### 섹션이 5개 넘어가면 분리

```
app/projects/detail/
├── page.tsx                   (메인, 180줄)
└── components/
    ├── detail-card.tsx        (정보 카드, 60줄)
    ├── related-items.tsx      (관련 항목, 80줄)
    └── delete-confirm-modal.tsx (80줄)
```

---

## 🧹 10. 흔한 실수 6개

1. **❌ .single() 에러 처리 없음**
   ```tsx
   // 금지: 레코드 없을 때 에러
   const { data } = await supabase.from('projects').select().eq('id', id).single();
   // 올바름: error 체크
   const { data, error } = await supabase.from('projects').select().eq('id', id).single();
   if (error && error.code === 'PGRST116') { /* 없음 */ }
   ```

2. **❌ id 없는데 loadItem 호출** → 쿼리 실패
   ```tsx
   useEffect(() => {
     if (!id) return; // 필수
     loadItem();
   }, [id]);
   ```

3. **❌ 삭제 확인 없이 삭제** → 사용자 실수 위험
   ```tsx
   // 올바름: confirmDelete 모달 필수
   ```

4. **❌ 날짜 format 없음**
   ```tsx
   // 금지: "2026-04-18T15:30:00.000Z"
   // 올바름: new Date(item.created_at).toLocaleDateString('ko-KR')
   ```

5. **❌ whitespace-pre-wrap 없이 description 출력** → 줄바꿈 무시됨

6. **❌ 비로그인 상태에서 수정/삭제 버튼 표시** → RLS 에러
   ```tsx
   // 올바름: {user && <button>수정</button>}
   ```

---

## 🎯 11. 자체 검증 (출력 전!)

- [ ] 파일 250줄 이하?
- [ ] 'use client' + data-foundry-file 있나?
- [ ] useSearchParams로 id 추출?
- [ ] id 없으면 목록으로 router.push?
- [ ] .single() 에러 처리?
- [ ] 로딩/없음/에러 3가지 상태 다 있나?
- [ ] 삭제 확인 모달 있나?
- [ ] 비로그인 상태에서 수정/삭제 버튼 숨김?
- [ ] 날짜 toLocaleDateString('ko-KR') 포맷?
- [ ] 동적 라우트 [id] 사용 안 함?
