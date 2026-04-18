# 리스트 아이템/행 컴포넌트 패턴 (신규!)

**이 문서는 테이블 행, 리스트 행, 체크 아이템 등 단일 행 UI 컴포넌트 전용 지침입니다.**
**최대 파일 크기: 80줄 (매우 단순하게!)**

---

## 🎯 1. 리스트 아이템 유형

- **TableRow**: 테이블의 한 행
- **CheckItem**: 체크박스 + 텍스트 (할일 등)
- **MediaItem**: 이미지 + 텍스트 + 메타 (좋아요 등)
- **NotificationItem**: 알림 하나

**공통점**: **가로 레이아웃** (flex). 정보 3~4개 미만.

---

## 📋 2. Props 최소화

```tsx
interface ItemProps {
  item: SomeType;
  onAction?: (id: string) => void;
}
```

**Props 3개 이내** 원칙.

---

## 🎨 3. Good 예시: TableRow (약 30줄)

```tsx
'use client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  last_login: string;
}

interface UserRowProps {
  user: User;
  onEdit?: (id: string) => void;
}

export function UserRow({ user, onEdit }: UserRowProps) {
  return (
    <tr data-component="UserRow" className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]/50">
      <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{user.name}</td>
      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{user.email}</td>
      <td className="px-4 py-3 text-sm">
        <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)] text-white text-xs">
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
        {new Date(user.last_login).toLocaleDateString('ko-KR')}
      </td>
      <td className="px-4 py-3">
        {onEdit && (
          <button onClick={() => onEdit(user.id)} className="text-[var(--color-primary)] text-sm hover:underline">
            편집
          </button>
        )}
      </td>
    </tr>
  );
}
```

---

## 🎨 4. Good 예시: CheckItem (약 25줄)

```tsx
'use client';

import { Check } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
}

export function TodoItem({ todo, onToggle }: TodoItemProps) {
  return (
    <label
      data-component="TodoItem"
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-surface)] cursor-pointer"
    >
      <div
        onClick={() => onToggle(todo.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
          todo.done
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
            : 'border-[var(--color-border)]'
        }`}
      >
        {todo.done && <Check size={14} className="text-white" />}
      </div>
      <span className={`flex-1 text-sm ${todo.done ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
        {todo.text}
      </span>
    </label>
  );
}
```

---

## 🎨 5. Good 예시: MediaItem (피드/게시물, 약 40줄)

```tsx
'use client';

import { Heart, MessageCircle } from 'lucide-react';

interface Post {
  id: string;
  author: string;
  content: string;
  image_url?: string;
  likes: number;
  comments: number;
  created_at: string;
}

interface FeedItemProps {
  post: Post;
  onLike?: (id: string) => void;
}

export function FeedItem({ post, onLike }: FeedItemProps) {
  return (
    <article data-component="FeedItem" className="p-4 rounded-xl bg-[var(--color-surface)] shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-semibold">
          {post.author[0]}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{post.author}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {new Date(post.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>
      <p className="text-sm text-[var(--color-text-primary)] mb-3">{post.content}</p>
      {post.image_url && (
        <img src={post.image_url} alt="" className="w-full h-64 object-cover rounded-lg mb-3" />
      )}
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
        <button onClick={() => onLike?.(post.id)} className="flex items-center gap-1 hover:text-red-500">
          <Heart size={14} /><span>{post.likes}</span>
        </button>
        <div className="flex items-center gap-1">
          <MessageCircle size={14} /><span>{post.comments}</span>
        </div>
      </div>
    </article>
  );
}
```

---

## 🔴 6. Bad 예시 (F4 위험)

```tsx
// ❌ 아이템 하나에 모든 기능 (편집/삭제/확대/복사/공유...)
export function BloatedItem({ item }) {
  // ❌ 내부 상태 여러 개
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({...});

  // ❌ 복잡한 조건부 렌더 (편집 모드/보기 모드)
  if (editing) {
    return <div>... 40줄 폼 ...</div>;
  }

  return (
    <div>
      {expanded && <div>... 30줄 상세 ...</div>}
      {/* ... 100줄 ... */}
    </div>
  );
}
// 200~300줄 = F4
```

**문제**:
- 아이템에 **확장/편집 모드** 넣으면 과비대
- 편집은 **별도 모달** or **별도 페이지**
- 확장도 **부모가 selectedId 관리**

---

## 📐 7. 레이아웃 패턴

### flex 수평 (가장 많이 씀)
```tsx
<div className="flex items-center gap-3 px-4 py-3">
  <div>{아이콘/이미지}</div>
  <div className="flex-1">{주요 내용}</div>
  <div>{액션/메타}</div>
</div>
```

### 테이블 행 (semantic)
```tsx
<tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]/50">
  <td className="px-4 py-3">...</td>
</tr>
```

---

## 🧹 8. 흔한 실수 5개

1. **❌ 아이템에 fetch 있음** → N+1 쿼리 문제
   ```tsx
   // 금지: useEffect(() => supabase.from(...), [item.id])
   // 올바름: 부모에서 미리 조회해 props로 전달
   ```

2. **❌ key 없이 map**
   ```tsx
   // 금지
   {items.map(i => <Item ... />)}
   // 올바름
   {items.map(i => <Item key={i.id} ... />)}
   ```

3. **❌ onClick 버튼을 전체 영역에 또 걸기** → 이벤트 버블링 충돌
   ```tsx
   // 금지
   <div onClick={onSelect}>
     <button onClick={onEdit}>편집</button>
   </div>
   // 올바름: button에 e.stopPropagation()
   ```

4. **❌ 긴 텍스트에 line-clamp 없음**
   ```tsx
   <p className="line-clamp-2">{content}</p>
   ```

5. **❌ 이미지에 object-cover 없음** → 비율 깨짐
   ```tsx
   <img src={...} className="w-full h-64 object-cover" />
   ```

---

## 🎯 9. 자체 검증 (출력 전!)

- [ ] 파일 80줄 이하?
- [ ] data-component 있나?
- [ ] Props 3개 이내?
- [ ] key prop 사용 가능?
- [ ] fetch/useEffect 없음 (부모 담당)?
- [ ] flex/table 구조?
- [ ] CSS 변수?
- [ ] line-clamp 또는 truncate로 긴 텍스트 처리?
- [ ] 이미지에 object-cover?
- [ ] hover 효과 있나?
