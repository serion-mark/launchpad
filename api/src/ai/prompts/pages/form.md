# 폼 페이지 패턴

## 레이아웃 구조
- 상단: 페이지 제목 + 뒤로가기 버튼
- 중앙: 입력 필드 (세로 배치) + 라벨 + 에러 메시지
- 하단: 제출 버튼 (전체 너비 또는 우측 정렬)

## 필수 상태
```typescript
const [form, setForm] = useState({ name: '', phone: '', price: 0 })
const [errors, setErrors] = useState<Record<string, string>>({})
const [loading, setLoading] = useState(false)
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
```

## 입력 검증 (zod 선택, 기본은 validate 함수)
```typescript
const validate = (): Record<string, string> => {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = '이름을 입력하세요'
  if (!form.phone.match(/^01[0-9]{8,9}$/)) e.phone = '올바른 전화번호를 입력하세요'
  if (form.price < 0) e.price = '가격은 0 이상이어야 합니다'
  return e
}
```

## 제출 핸들러
```typescript
const handleSubmit = async () => {
  const e = validate()
  if (Object.keys(e).length > 0) { setErrors(e); return }
  setErrors({})
  setLoading(true)
  try {
    const { error } = await supabase.from('table_name').insert([{ ...form, user_id: user.id }])
    if (error) throw error
    setToast({ message: '저장 완료', type: 'success' })
    // 폼 리셋 or 이전 페이지 이동
  } catch (err: any) {
    setToast({ message: '저장 실패: ' + (err.message || '알 수 없는 오류'), type: 'error' })
  } finally {
    setLoading(false)
  }
}
```

## 토스트 (3초 자동 닫기)
```typescript
useEffect(() => {
  if (toast) setTimeout(() => setToast(null), 3000)
}, [toast])
```

## 입력 필드 UI 패턴
```tsx
<div className="mb-4">
  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">이름</label>
  <input
    type="text"
    value={form.name}
    onChange={e => setForm({ ...form, name: e.target.value })}
    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)]"
  />
  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
</div>
```

## 파일 업로드 (Supabase Storage)
```typescript
const handleUpload = async (file: File) => {
  const ext = file.name.split('.').pop()
  const path = `${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('uploads').upload(path, file)
  if (error) { setToast({ message: '업로드 실패', type: 'error' }); return null }
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
  return publicUrl
}
```

## 제출 버튼 (로딩 상태 반영)
```tsx
<button
  onClick={handleSubmit}
  disabled={loading}
  data-component="SubmitButton"
  className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
>
  {loading ? '저장 중...' : '저장'}
</button>
```
