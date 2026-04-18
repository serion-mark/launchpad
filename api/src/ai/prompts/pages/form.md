# 폼 페이지 패턴 (v2)

**이 문서는 입력/등록/수정 폼 페이지 생성 시 전용 지침입니다.**
**최대 파일 크기: 250줄 (초과 시 하위 컴포넌트 분리)**

---

## 🎯 1. 폼 페이지 핵심 구조

```
┌─────────────────────────────────────────┐
│ [← 뒤로] [제목]                         │
├─────────────────────────────────────────┤
│ 🏷️ 기본 정보                            │
│ ┌─────────────────────────────────────┐ │
│ │ 이름 *                              │ │
│ │ [________________]                  │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 📧 연락처                                │
│ ┌─────────────────────────────────────┐ │
│ │ 이메일                              │ │
│ │ [________________]                  │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 📎 첨부파일                              │
│ [파일 선택] [업로드 진행률 바]           │
├─────────────────────────────────────────┤
│ [취소]                         [저장]   │
└─────────────────────────────────────────┘
```

---

## 📋 2. 필수 상태 관리 (간단 버전)

```tsx
const [form, setForm] = useState({
  name: '',
  email: '',
  phone: '',
  description: '',
  category: '',
});
const [errors, setErrors] = useState<Record<string, string>>({});
const [loading, setLoading] = useState(false);
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
```

**상태 5개 이내** (react-hook-form 쓰면 더 적음).

---

## 🔧 3. react-hook-form + zod 패턴 (권장!)

```tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(2, '이름은 최소 2자'),
  email: z.string().email('유효한 이메일 입력'),
  phone: z.string().regex(/^01[0-9]{8,9}$/, '전화번호 형식 오류'),
  age: z.number().min(0, '0 이상').max(150, '150 이하'),
});

type FormData = z.infer<typeof schema>;

export default function Form() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.from('items').insert([{ ...data, user_id: user.id }]);
    if (error) { setToast({ message: '저장 실패', type: 'error' }); return; }
    setToast({ message: '저장 완료', type: 'success' });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} className="..." />
      {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
      {/* ... */}
      <button type="submit" disabled={isSubmitting}>저장</button>
    </form>
  );
}
```

**주의**: `@hookform/resolvers`는 **화이트리스트에 없음** → `useState` + 수동 validate 함수 사용 권장.

---

## ✅ 4. 권장 방식: useState + validate 함수 (의존성 최소)

```tsx
const validate = (f: typeof form): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = '이름을 입력하세요';
  if (f.email && !f.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email = '이메일 형식 오류';
  if (f.phone && !f.phone.match(/^01[0-9]{8,9}$/)) e.phone = '전화번호 형식 오류';
  if (!f.category) e.category = '카테고리 선택';
  return e;
};

const handleSubmit = async () => {
  const errs = validate(form);
  if (Object.keys(errs).length > 0) {
    setErrors(errs);
    return;
  }
  setErrors({});
  setLoading(true);
  try {
    const { error } = await supabase.from('items').insert([{ ...form, user_id: user.id }]);
    if (error) throw error;
    setToast({ message: '저장 완료', type: 'success' });
    // 폼 리셋 or 이전 페이지 이동
  } catch (err: any) {
    setToast({ message: '저장 실패: ' + (err.message || '오류'), type: 'error' });
  } finally {
    setLoading(false);
  }
};
```

---

## 🎨 5. Good 예시 (완전 작동 250줄 이하 폼 페이지)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  phone: string;
  category: string;
  description: string;
}

const CATEGORIES = [
  { value: 'sales', label: '영업' },
  { value: 'marketing', label: '마케팅' },
  { value: 'hr', label: '인사' },
];

export default function NewContactPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    category: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = '이름을 입력하세요';
    if (form.email && !form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email = '이메일 형식 오류';
    if (form.phone && !form.phone.match(/^01[0-9]{8,9}$/)) e.phone = '전화번호 형식 오류 (010-xxxx-xxxx)';
    if (!form.category) e.category = '카테고리 선택';
    return e;
  };

  const handleSubmit = async () => {
    if (!user) {
      setToast({ message: '로그인이 필요합니다', type: 'error' });
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.from('contacts').insert([{ ...form, user_id: user.id }]);
      if (error) throw error;
      setToast({ message: '저장 완료!', type: 'success' });
      setTimeout(() => router.push('/contacts'), 1000);
    } catch (err: any) {
      setToast({ message: '저장 실패: ' + (err.message || '오류'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div data-foundry-file="app/contacts/new/page.tsx" data-component="NewContactPage" className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-4 hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft size={16} />
        <span>뒤로</span>
      </button>

      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">새 연락처</h1>

      <div className="space-y-4">
        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* 이메일 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">이메일</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateForm('email', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        {/* 전화번호 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">전화번호</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => updateForm('phone', e.target.value)}
            placeholder="01012345678"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => updateForm('category', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <option value="">선택하세요</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => router.back()}
          className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !user}
          data-component="SubmitButton"
          className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>

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

**= 약 195줄 / 모든 필수 패턴 포함 / 안전 범위**.

---

## 🔴 6. Bad 예시 (F4 발생!)

```tsx
'use client';

// ❌ 과도한 import
import { useState, useEffect, useMemo, useCallback, useRef, useId, useLayoutEffect, useTransition, useDeferredValue, ... } from 'react';
import { useForm, Controller, useController, useFormContext, FormProvider, ... } from 'react-hook-form';
import { z, ZodIssue, ZodError, ... } from 'zod';
import * as AllIcons from 'lucide-react';

// ❌ 거대한 zod 스키마 (50줄)
const schema = z.object({
  name: z.string().min(2).max(100).regex(/.../).refine(...).refine(...),
  email: z.string().email().refine(...).or(z.string().length(0)),
  ... 30개 필드
});

// ❌ 인라인 하위 컴포넌트 여러 개
function TextField({ name, label, placeholder, icon, prefix, suffix, ... 20 props }) {
  // 50줄
}
function SelectField({ ... 15 props }) { /* 50줄 */ }
function FileField({ ... 20 props }) { /* 60줄 */ }
function MultiSelectField({ ... 20 props }) { /* 70줄 */ }
function DateRangePicker({ ... }) { /* 100줄 */ }

export default function Page() {
  // ❌ 상태 15개 + useForm + register + formState ...
  // ❌ 입력 필드 20개 + 각 검증 규칙

  return (
    <form>
      {/* 600줄 JSX */}
    </form>
  );
}
// 합계 700~800줄 = F4 보장!
```

**문제**: 
- 화이트리스트 외 의존성 (`@hookform/resolvers`)
- 인라인 컴포넌트 5개+
- 필드 20개+ (페이지 분리 필요)

---

## 📎 7. 파일 업로드 패턴 (Supabase Storage)

```tsx
const [uploading, setUploading] = useState(false);
const [imageUrl, setImageUrl] = useState<string | null>(null);

const handleUpload = async (file: File) => {
  if (!user) return;
  if (file.size > 5 * 1024 * 1024) {
    setToast({ message: '파일 크기 5MB 초과', type: 'error' });
    return;
  }
  setUploading(true);
  const ext = file.name.split('.').pop();
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) {
    setToast({ message: '업로드 실패: ' + error.message, type: 'error' });
    setUploading(false);
    return;
  }
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
  setImageUrl(publicUrl);
  setUploading(false);
};

<input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }}
/>

{uploading && <p className="text-xs text-[var(--color-text-secondary)]">업로드 중...</p>}
{imageUrl && <img src={imageUrl} alt="업로드됨" className="w-32 h-32 object-cover rounded-lg" />}
```

---

## 🔧 8. 입력 필드별 패턴

### Text (기본)
```tsx
<input type="text" value={...} onChange={...} className="..." />
```

### Email (type=email 자동 검증)
```tsx
<input type="email" ... />
```

### Tel (숫자 키패드 모바일)
```tsx
<input type="tel" ... />
```

### Number
```tsx
<input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} min={0} max={150} />
```

### Select
```tsx
<select value={...} onChange={...}>
  <option value="">선택하세요</option>
  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
</select>
```

### Checkbox (단일)
```tsx
<label className="flex items-center gap-2">
  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
  <span>약관 동의</span>
</label>
```

### Checkbox (복수)
```tsx
{options.map((o) => (
  <label key={o.value}>
    <input
      type="checkbox"
      checked={selected.includes(o.value)}
      onChange={(e) => {
        if (e.target.checked) setSelected([...selected, o.value]);
        else setSelected(selected.filter((s) => s !== o.value));
      }}
    />
    {o.label}
  </label>
))}
```

### Radio
```tsx
{options.map((o) => (
  <label key={o.value}>
    <input type="radio" value={o.value} checked={value === o.value} onChange={(e) => setValue(e.target.value)} />
    {o.label}
  </label>
))}
```

### Date
```tsx
<input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
```

### Textarea
```tsx
<textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
```

---

## 🧹 9. 흔한 실수 7개

1. **❌ 비로그인 시도 허용** → RLS 에러
   ```tsx
   // 올바름: user 없으면 버튼 비활성화
   <button disabled={!user || loading}>저장</button>
   ```

2. **❌ 검증 없이 insert** → DB 에러
   ```tsx
   // 올바름: 항상 validate() 먼저
   ```

3. **❌ 전화번호 정규식 없음**
   ```tsx
   phone.match(/^01[0-9]{8,9}$/)  // 010-xxxx-xxxx 만 허용
   ```

4. **❌ textarea에 className resize-none 없음** → 사용자가 크기 조절 (레이아웃 깨짐)

5. **❌ select에 빈 값 option 없음** → 초기 선택 불가

6. **❌ handleChange 매번 새 함수 생성** (성능 이슈 드묾, 하지만 updateForm 재사용 패턴 권장)

7. **❌ 파일 업로드 크기/타입 체크 없음** → 10MB 이미지 업로드 가능

---

## 🎯 10. 자체 검증 (출력 전!)

- [ ] 파일 250줄 이하?
- [ ] 'use client' + data-foundry-file 있나?
- [ ] validate 함수 + errors 상태 있나?
- [ ] 제출 버튼 disabled (loading/!user) 처리?
- [ ] 토스트 3초 자동 닫기?
- [ ] useRouter from 'next/navigation'?
- [ ] CSS 변수 사용?
- [ ] 파일 업로드 있으면 크기/타입 검증?
- [ ] 각 입력 필드에 에러 메시지 표시?
- [ ] 제출 성공 시 리다이렉트 또는 폼 리셋?
