# Supabase 인증 + CRUD 패턴 (v2)

**이 문서는 Supabase 인증/데이터 조작 관련 표준 패턴입니다.**
**모든 페이지 생성 시 함께 로드됨.**

---

## 🔐 1. Supabase Client 설정

### ✅ 올바른 import (반드시 이것만!)
```tsx
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
```

### ❌ 금지
```tsx
import { createClient } from '@supabase/supabase-js';        // 직접 X
import { createServerClient } from '@/utils/supabase/server'; // server X
import { createBrowserClient } from '@supabase/ssr';          // 직접 X
```

---

## 👤 2. 인증 상태 관리 (모든 페이지 공통)

```tsx
const [user, setUser] = useState<any>(null);

useEffect(() => {
  // 초기 세션 가져오기
  supabase.auth.getUser().then(({ data }) => setUser(data.user));

  // 세션 변화 구독 (로그인/로그아웃 감지)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user || null);
  });

  return () => subscription.unsubscribe();
}, []);
```

---

## 🔑 3. 로그인/회원가입/로그아웃

```tsx
// 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (error) setToast({ message: '로그인 실패: ' + error.message, type: 'error' });

// 회원가입 (메타데이터 포함)
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name, nickname },  // user_metadata에 저장
  },
});

// 로그아웃
await supabase.auth.signOut();
router.push('/');

// 비밀번호 재설정 요청
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});

// 비밀번호 업데이트 (재설정 링크 클릭 후)
await supabase.auth.updateUser({ password: newPassword });
```

---

## 📦 4. CRUD 기본 패턴

### 전체 조회 (본인 데이터)
```tsx
const { data, error } = await supabase
  .from('items')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

if (!error && data) setItems(data);
```

### 특정 필드만
```tsx
.select('id, name, status, created_at')
```

### 생성
```tsx
const { data, error } = await supabase
  .from('items')
  .insert([{ name, description, user_id: user.id }])
  .select()
  .single();  // 생성된 레코드 반환 받기

if (!error && data) {
  setToast({ message: '저장 완료', type: 'success' });
}
```

### 수정
```tsx
const { error } = await supabase
  .from('items')
  .update({ name, description })
  .eq('id', id)
  .eq('user_id', user.id);  // RBAC — 본인 것만
```

### 삭제
```tsx
const { error } = await supabase
  .from('items')
  .delete()
  .eq('id', id)
  .eq('user_id', user.id);
```

### upsert (있으면 수정, 없으면 생성)
```tsx
const { error } = await supabase
  .from('items')
  .upsert({ id, name, user_id: user.id });
```

---

## 🔗 5. 관계형 조회 (JOIN 대체)

### N:1 (FK)
```tsx
// projects.creator_id → users
.select('*, creator:users(name, email, avatar_url)')
```

### 1:N (역방향)
```tsx
// orders → order_items
.select('*, items:order_items(*)')
```

### 중첩 (3단계)
```tsx
// orders → items → products
.select('*, items:order_items(*, product:products(name, price, image_url))')
```

### 여러 관계 동시
```tsx
.select(`
  *,
  customer:customers(id, name, phone),
  staff:staff_members(id, name),
  payments:payments(id, amount, method, created_at)
`)
.eq('id', orderId)
.single()
```

### 집계 (count + 조회 동시)
```tsx
const { data, count } = await supabase
  .from('items')
  .select('*', { count: 'exact' })
  .range(0, 19);
```

---

## 🔍 6. 검색/필터/페이지네이션

### 검색 (부분 일치)
```tsx
.ilike('name', `%${search}%`)              // 대소문자 구분 X
.like('name', `%${search}%`)               // 구분 O
.or(`name.ilike.%${search}%,email.ilike.%${search}%`) // 여러 필드
```

### 필터
```tsx
.eq('status', 'active')                    // 같음
.neq('status', 'archived')                 // 다름
.gt('age', 18)                              // 초과
.gte('created_at', startDate)               // 이상
.lt('price', 10000)                         // 미만
.lte('price', 10000)                        // 이하
.in('status', ['active', 'pending'])        // 포함
.contains('tags', ['premium'])              // 배열 포함
```

### 정렬
```tsx
.order('created_at', { ascending: false })
.order('name', { ascending: true })
.order('priority', { ascending: false, nullsFirst: false })  // null 뒤로
```

### 페이지네이션 (range)
```tsx
const PAGE_SIZE = 20;
.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```

### 제한 (기본 limit)
```tsx
.limit(10)
```

---

## 🔐 7. RBAC (역할 기반 접근)

```tsx
const userRole = user?.user_metadata?.role || 'user';

let query = supabase.from('items').select('*');

if (userRole !== 'admin') {
  query = query.eq('user_id', user.id);  // 본인 것만
}
// admin이면 모두 조회

const { data } = await query.order('created_at', { ascending: false });
```

---

## 📤 8. 파일 업로드 (Supabase Storage)

### 단일 파일
```tsx
const handleUpload = async (file: File) => {
  if (!user) return null;
  if (file.size > 5 * 1024 * 1024) {
    setToast({ message: '파일 크기 5MB 초과', type: 'error' });
    return null;
  }
  const ext = file.name.split('.').pop();
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, file);

  if (error) {
    setToast({ message: '업로드 실패: ' + error.message, type: 'error' });
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(path);

  return publicUrl;
};
```

### 이미지 미리보기
```tsx
<input
  type="file"
  accept="image/*"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleUpload(file);
      if (url) setImageUrl(url);
    }
  }}
/>
{imageUrl && <img src={imageUrl} alt="" className="w-32 h-32 object-cover rounded-lg" />}
```

### 파일 삭제
```tsx
await supabase.storage.from('uploads').remove([path]);
```

---

## 🎭 9. 비로그인 데모 모드

```tsx
const SAMPLE: Item[] = [
  { id: '1', name: '샘플 1', ... },
  { id: '2', name: '샘플 2', ... },
];

const [items, setItems] = useState<Item[]>(SAMPLE);

useEffect(() => {
  if (!user) return;  // 비로그인 = SAMPLE 유지

  supabase.from('items').select('*').eq('user_id', user.id).then(({ data }) => {
    if (data && data.length > 0) setItems(data);  // 실데이터 있으면 교체
  });
}, [user]);
```

### 비로그인 UI 가이드
```tsx
{user ? (
  <button onClick={handleEdit}>수정</button>
) : (
  <p className="text-xs text-[var(--color-text-secondary)]">
    로그인하면 수정할 수 있습니다
  </p>
)}
```

---

## 🔄 10. 복수 테이블 안전 업데이트 (트랜잭션 패턴)

Supabase는 클라이언트 레벨 트랜잭션 없음 → **순차 + try/catch**:

```tsx
const handleComplete = async () => {
  setLoading(true);
  try {
    const { error: e1 } = await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);
    if (e1) throw e1;

    const { error: e2 } = await supabase.from('customers').update({ visit_count: count + 1 }).eq('id', customerId);
    if (e2) throw e2;

    const { error: e3 } = await supabase.from('activity_log').insert([{ order_id: orderId, action: 'complete' }]);
    if (e3) throw e3;

    setToast({ message: '완료!', type: 'success' });
  } catch (err: any) {
    setToast({ message: '실패: ' + err.message, type: 'error' });
    // 필요 시 수동 롤백
  } finally {
    setLoading(false);
  }
};
```

---

## 🧹 11. 흔한 실수 7개

1. **❌ user 없이 insert/update** → RLS 에러
   ```tsx
   if (!user) return;  // 항상 먼저
   ```

2. **❌ .single() 에러 처리 없음**
   ```tsx
   const { data, error } = await supabase.from(...).select().single();
   if (error?.code === 'PGRST116') {
     // 레코드 없음 — 404 처리
   }
   ```

3. **❌ user_id 주입 안 함**
   ```tsx
   // 금지
   .insert([{ name, description }])
   // 올바름
   .insert([{ name, description, user_id: user.id }])
   ```

4. **❌ RBAC 없이 조회** → 다른 사용자 데이터 노출
   ```tsx
   // 올바름: 항상 .eq('user_id', user.id) (관리자 제외)
   ```

5. **❌ select('*') 과용** → 큰 텍스트 필드까지 전송
   ```tsx
   // 추천: .select('id, name, status, created_at')
   ```

6. **❌ 에러 무시**
   ```tsx
   // 금지
   const { data } = await supabase.from(...).select();
   setItems(data);  // data가 null이면?
   // 올바름
   const { data, error } = await ...;
   if (!error && data) setItems(data);
   ```

7. **❌ onAuthStateChange 구독 해제 안 함**
   ```tsx
   // 올바름: return 시 unsubscribe
   return () => subscription.unsubscribe();
   ```

---

## 🎯 12. 자체 검증 (사용 전!)

- [ ] `createClient from '@/utils/supabase/client'` import?
- [ ] user 확인 후 CRUD 호출?
- [ ] `.eq('user_id', user.id)` 포함 (RBAC)?
- [ ] error 체크 및 토스트?
- [ ] 비로그인 SAMPLE fallback?
- [ ] 파일 업로드 크기/타입 체크?
- [ ] 관계형 조회 필요 시 nested select?
- [ ] 트랜잭션이 필요하면 try/catch 순차 처리?
- [ ] onAuthStateChange 구독 해제?
