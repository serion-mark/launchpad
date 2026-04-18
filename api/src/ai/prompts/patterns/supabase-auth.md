# Supabase 인증 패턴

## 🟢 인증 상태 확인 (모든 페이지 공통)
```typescript
const [user, setUser] = useState<any>(null)
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => setUser(data.user))
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
    setUser(session?.user || null)
  })
  return () => subscription.unsubscribe()
}, [])
```

## 로그인 / 회원가입 / 로그아웃
```typescript
// 로그인
const { error } = await supabase.auth.signInWithPassword({ email, password })

// 회원가입 (메타 데이터 포함)
const { error } = await supabase.auth.signUp({
  email, password,
  options: { data: { name } }
})

// 로그아웃
await supabase.auth.signOut()
```

## 🟢 CRUD 패턴
```typescript
// 조회 (본인 데이터만)
const { data } = await supabase.from('table_name').select('*').eq('user_id', user.id)

// 생성 (user_id 자동 주입)
await supabase.from('table_name').insert([{ ...fields, user_id: user.id }])

// 수정 (본인 것만)
await supabase.from('table_name').update({ ...fields }).eq('id', id).eq('user_id', user.id)

// 삭제 (본인 것만)
await supabase.from('table_name').delete().eq('id', id).eq('user_id', user.id)
```

## 🟢 RBAC (역할 기반 접근)
```typescript
const userRole = user?.user_metadata?.role || 'user'

let query = supabase.from('table_name').select('*')
if (userRole !== 'admin') {
  query = query.eq('user_id', user.id)
}
const { data } = await query.order('created_at', { ascending: false })
```

## 비로그인 데모 모드 대응
- user가 null이어도 페이지 렌더링 (리다이렉트 금지)
- 비로그인 시 샘플 데이터 fallback
- 수정/삭제 버튼 대신 "로그인하면 이용 가능합니다" 표시

```tsx
{user ? (
  <button onClick={handleEdit}>수정</button>
) : (
  <p className="text-xs text-[var(--color-text-secondary)]">로그인하면 수정할 수 있습니다</p>
)}
```

## 파일 업로드 (Storage)
```typescript
const handleUpload = async (file: File) => {
  const ext = file.name.split('.').pop()
  const path = `${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('uploads').upload(path, file)
  if (error) { alert('업로드 실패: ' + error.message); return null }
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
  return publicUrl
}
```
