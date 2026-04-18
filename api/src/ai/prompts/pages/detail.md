# 상세 페이지 패턴

## 레이아웃 구조
- 상단: 뒤로가기 버튼 + 제목 + 액션 버튼 (수정/삭제)
- 중앙: 정보 섹션 (이미지 + 기본 정보 + 메타)
- 하단: 관련 항목 리스트 or 이력/댓글

## ⚠️ 동적 라우트 금지
- [id] 폴더 생성 금지 (static export 불가)
- 대안 1: searchParams + useState로 ID 관리
- 대안 2: 목록 페이지 내 모달로 상세 표시

## URL searchParams로 ID 관리
```typescript
import { useSearchParams, useRouter } from 'next/navigation'

const searchParams = useSearchParams()
const router = useRouter()
const id = searchParams.get('id')
const [item, setItem] = useState<Item | null>(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  if (!id) return
  loadItem()
}, [id])

const loadItem = async () => {
  setLoading(true)
  const { data } = await supabase.from('table_name').select('*').eq('id', id).single()
  setItem(data)
  setLoading(false)
}
```

## 관계형 조회 (1:N, N:1, 중첩)
```typescript
// 1:N (주문 + 주문항목)
const { data: order } = await supabase
  .from('orders')
  .select('*, items:order_items(*, product:products(name, price))')
  .eq('id', id)
  .single()

// N:1 (예약 + 고객 + 담당자)
const { data: reservation } = await supabase
  .from('reservations')
  .select('*, customer:customers(name, phone), staff:staff_members(name)')
  .eq('id', id)
  .single()
```

## 뒤로가기 + 액션 헤더
```tsx
<div data-component="DetailHeader" className="flex items-center justify-between mb-6">
  <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--color-text-secondary)]">
    <ArrowLeft size={20} />
    <span>뒤로</span>
  </button>
  <div className="flex gap-2">
    <button onClick={handleEdit} className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">수정</button>
    <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg bg-red-500 text-white">삭제</button>
  </div>
</div>
```

## 상태 전이 (enum 기반 상태 머신)
```typescript
type Status = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
}

const canTransition = (from: Status, to: Status) => STATUS_TRANSITIONS[from].includes(to)
```

## 복수 테이블 안전 업데이트
```typescript
const handleComplete = async () => {
  setLoading(true)
  try {
    const { error: e1 } = await supabase.from('orders').update({ status: 'completed' }).eq('id', id)
    if (e1) throw e1
    const { error: e2 } = await supabase.from('customers').update({ visit_count: count + 1 }).eq('id', customerId)
    if (e2) throw e2
    await loadItem()
    setToast({ message: '완료!', type: 'success' })
  } catch (err: any) {
    setToast({ message: '처리 실패: ' + err.message, type: 'error' })
  } finally {
    setLoading(false)
  }
}
```

## 삭제 확인 모달
```typescript
const [confirmDelete, setConfirmDelete] = useState(false)

const handleDelete = () => setConfirmDelete(true)
const confirmDeleteAction = async () => {
  const { error } = await supabase.from('table_name').delete().eq('id', id)
  if (error) { setToast({ message: '삭제 실패', type: 'error' }); return }
  router.push('/list-page')
}
```

## 로딩/없음 상태
```tsx
if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-[var(--color-primary)] rounded-full"/></div>
if (!item) return <div className="text-center py-20 text-[var(--color-text-secondary)]">항목을 찾을 수 없습니다</div>
```
