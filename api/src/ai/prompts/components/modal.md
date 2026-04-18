# 모달 컴포넌트 패턴 (신규!)

**이 문서는 페이지 내 모달/팝업 컴포넌트 생성 시 전용 지침입니다.**
**최대 파일 크기: 150줄 (F4 방지 핵심)**

---

## ⚠️ 1. 왜 모달 전용 .md가 필요한가?

**cpzm_v1 실패 분석**: F4 발생 5건 중 대부분이 `*-modal.tsx`, `*-form.tsx` 같은 **sub-component 파일들**.

모달 컴포넌트는:
- UI 자체는 단순 (header + body + footer)
- 근데 Sonnet 4.6이 자유롭게 만들면 **300~500줄까지 팽창**
- → F4 잘림 → 실패

**이 문서는 150줄로 강제**.

---

## 🎯 2. 모달 표준 구조

```
┌────────────────────────────────┐
│ [제목]                     [×] │ ← Header
├────────────────────────────────┤
│                                │
│  [본문 내용]                   │ ← Body
│                                │
│  [폼 필드들...]                │
│                                │
├────────────────────────────────┤
│         [취소]    [확인]       │ ← Footer
└────────────────────────────────┘
```

**3부분만**: Header + Body + Footer. 이 구조 깨면 복잡도 ↑ → F4.

---

## 📋 3. 필수 Props 인터페이스

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  // 작업 관련 props는 최소화
  item?: Item | null;
  onSave?: (data: any) => void | Promise<void>;
}
```

**Props 5개 이내 유지**. 더 필요하면 object로 묶음.

---

## 🎨 4. Good 예시 (완전 작동 120줄 모달)

```tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Reservation {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

interface EditReservationModalProps {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Reservation>) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기' },
  { value: 'confirmed', label: '확정' },
  { value: 'cancelled', label: '취소' },
];

export function EditReservationModal({ reservation, open, onClose, onSave }: EditReservationModalProps) {
  const [status, setStatus] = useState(reservation?.status || 'pending');
  const [loading, setLoading] = useState(false);

  if (!open || !reservation) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ status });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-component="EditReservationModal"
      onClick={onClose}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--color-surface)] rounded-xl shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">예약 수정</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">고객명</label>
            <p className="text-[var(--color-text-secondary)]">{reservation.guest_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">체크인</label>
            <p className="text-[var(--color-text-secondary)]">{reservation.check_in}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**= 약 105줄 / 안전 / 모든 필수 요소 포함**.

---

## 🔴 5. Bad 예시 (F4 발생!)

```tsx
// ❌ 모달에 비즈니스 로직 전부 포함
export function HugeModal({ ... }) {
  // ❌ 상태 15개
  const [form, setForm] = useState({...});
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [previousData, setPreviousData] = useState(null);
  // ... 10개 더

  // ❌ 복잡한 Supabase 조회 (부모에서 해야 함)
  useEffect(() => {
    supabase.from('items').select()...
    supabase.from('logs').select()...
  }, [...]);

  // ❌ 다단계 폼 (step 1, 2, 3 전부 인라인)
  return (
    <div>
      {step === 1 && (
        <div>...50줄...</div>
      )}
      {step === 2 && (
        <div>...60줄...</div>
      )}
      {step === 3 && (
        <div>...50줄...</div>
      )}
    </div>
  );
}
// 총 300~400줄 = F4!
```

**문제**:
1. 모달 안에 **비즈니스 로직** (Supabase 조회) → 부모가 해야 함
2. **다단계 폼** → 별도 페이지로
3. 상태 10개+ → 부모에서 관리

---

## 🧩 6. 모달 분리 기준

### 하나의 모달 = 하나의 작업

```
❌ 나쁨: "데이터 관리 모달" (CRUD 전부)
✅ 좋음:
  - AddItemModal       (추가)
  - EditItemModal      (수정)
  - DeleteConfirmModal (삭제 확인)
```

### 다단계는 별도 페이지

- Step 1/2/3 있으면 → `/items/new/page.tsx` 스스로 관리
- 모달은 **단일 작업**만

---

## 🎨 7. 모달 배경 오버레이 표준

```tsx
<div
  onClick={onClose}  // 배경 클릭 시 닫힘
  className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
>
  <div
    onClick={(e) => e.stopPropagation()}  // 내용 클릭은 전파 방지
    className="w-full max-w-md bg-[var(--color-surface)] rounded-xl shadow-xl"
  >
    {/* 내용 */}
  </div>
</div>
```

**z-50 필수** (다른 요소 위에).

---

## 📐 8. 모달 크기 가이드

| 모달 유형 | max-w | 높이 |
|---------|-------|------|
| 확인 모달 (삭제 등) | `max-w-sm` | 자동 |
| 단순 입력 | `max-w-md` | 자동 |
| 복잡한 폼 | `max-w-lg` | 최대 80vh (스크롤) |
| 이미지/미디어 | `max-w-2xl` | 자동 |

**긴 컨텐츠**:
```tsx
<div className="max-w-lg max-h-[80vh] overflow-y-auto">
  ...
</div>
```

---

## ⌨️ 9. 키보드/접근성 (선택적)

```tsx
// ESC로 닫기
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  if (open) document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [open, onClose]);

// 배경 스크롤 방지
useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }
}, [open]);
```

**선택사항** — 기본 모달엔 불필요. 꼭 필요한 경우만.

---

## 🧹 10. 흔한 실수 5개

1. **❌ e.stopPropagation() 없음** → 내용 클릭해도 배경 클릭으로 판단 → 닫힘
   ```tsx
   <div onClick={(e) => e.stopPropagation()}>
   ```

2. **❌ open 체크 없이 return 렌더** → 닫힌 상태에서도 DOM에 존재
   ```tsx
   if (!open) return null;
   ```

3. **❌ z-50 없음** → 다른 요소에 가려짐
   ```tsx
   className="fixed inset-0 ... z-50 ..."
   ```

4. **❌ 모달 안에 데이터 fetch** → 부모에서 가져와 props로 전달
   ```tsx
   // 금지
   const { data } = useEffect(() => supabase.from(...), [...])
   // 올바름: props로 받음
   ```

5. **❌ 여러 모달이 중첩** → UX 혼란. 하나씩 처리.

---

## 🎯 11. 자체 검증 (출력 전!)

- [ ] 파일 150줄 이하? (F4 방지 핵심!)
- [ ] data-component 속성 있나?
- [ ] `if (!open) return null;` 있나?
- [ ] 배경 클릭 시 닫힘? (`onClick={onClose}`)
- [ ] 내용 stopPropagation 있나?
- [ ] z-50 fixed inset-0 bg-black/40?
- [ ] Header + Body + Footer 3구조 유지?
- [ ] Props 5개 이내?
- [ ] 비즈니스 로직 없음 (부모 담당)?
- [ ] 취소/저장 버튼 loading 상태?
