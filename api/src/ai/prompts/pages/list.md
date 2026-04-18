# 리스트 페이지 패턴

## 레이아웃 구조
- 상단: 검색 바 + 필터 + "추가" 버튼
- 중앙: 리스트/카드 그리드 또는 테이블
- 하단: 페이지네이션 또는 "더 보기"
- 클릭 시: 같은 페이지 내 모달 or 선택 상태로 상세 표시

## 필수 컴포넌트
```typescript
const [items, setItems] = useState<Item[]>([])
const [search, setSearch] = useState('')
const [page, setPage] = useState(0)
const [loading, setLoading] = useState(true)
const [selectedId, setSelectedId] = useState<string | null>(null)
const pageSize = 20
```

## Supabase 조회 패턴 (필터 + 정렬 + 페이지네이션)
```typescript
const loadItems = async () => {
  setLoading(true)
  let query = supabase.from('table_name')
    .select('*, category:categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (search) query = query.ilike('name', `%${search}%`)
  if (userRole !== 'admin') query = query.eq('user_id', user.id)
  const { data, count } = await query
  setItems(data || [])
  setLoading(false)
}
```

## 상세 페이지 대안 (동적 라우트 금지!)
```typescript
const handleSelect = async (id: string) => {
  const { data } = await supabase.from('table_name').select('*').eq('id', id).single()
  setSelectedItem(data)
  setSelectedId(id)
}
// UI: selectedItem이 있으면 상세 모달, 없으면 목록
{selectedItem ? <DetailModal item={selectedItem} onClose={() => setSelectedId(null)} /> : <List />}
```

## 필수 UI 상태
```tsx
if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-[var(--color-primary)] rounded-full"/></div>
if (items.length === 0) return <div className="text-center py-20 text-[var(--color-text-secondary)]">데이터가 없습니다</div>
```

## 반응형 카드 그리드
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <div key={item.id} onClick={() => handleSelect(item.id)} data-component="ItemCard"
         className="p-4 rounded-xl shadow-sm bg-[var(--color-surface)] hover:shadow-md cursor-pointer">
      ...
    </div>
  ))}
</div>
```

## 검색 + 필터 UI
- 검색 input: `<input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." className="..."/>`
- 디바운싱: useEffect로 300ms 대기 후 loadItems 호출
- 필터 칩: 상태별 버튼 배열
