# Preview Iframe Report — 2026-03-24

## 핵심 변경: done 상태 미리보기 = 체험 배포 URL iframe

### Before
- `LivePreview` 컴포넌트 (정규식 JSX→HTML 변환) → 흰 화면 계속 나옴
- 근본적 한계: 복잡한 JSX/Supabase 코드 파싱 불가능

### After
- done 상태 미리보기 = **체험 배포 URL iframe**
- `app-7e95.foundry.ai.kr` 같은 실제 돌아가는 앱을 iframe에 넣음
- LivePreview는 generating 중에만 사용 (done에서 절대 안 씀)

## 렌더링 우선순위 (done 상태)

```
1순위: project.deployedUrl 있으면 → iframe src={deployedUrl}
2순위: 없으면 → "배포 준비 중..." + 3초 폴링 대기 (최대 3분)
```

## 수정 → 재배포 → iframe 리로드 플로우

```
A. 고객: "버튼 색 바꿔줘"
B. AI: 코드 수정 (callModifyFiles)
C. ✅ 수정 완료 → 자동 재배포 트리거 (handleModifyComplete)
D. 재배포 완료 대기 (3초 폴링)
E. 빌드 성공 → iframe key 변경으로 리로드
F. 채팅: "🎉 미리보기가 업데이트되었습니다!"
```

## 채팅 메시지 변경

| 시점 | Before | After |
|------|--------|-------|
| 수정 완료 | "✅ 코드 수정 완료!" | "✅ 코드 수정 완료! 재배포 중..." |
| 재배포 완료 | (없음) | "🎉 미리보기가 업데이트되었습니다!" |
| 재배포 실패 | (없음) | "⚠️ 빌드 에러 발생. 자동 수정을 시도합니다." |

## 변경 파일

| 파일 | 변경 |
|------|------|
| `BuilderPreview.tsx` | done → iframe 전용, LivePreview 미사용, 배포 대기 폴링 |
| `BuilderChat.tsx` | onModifyComplete prop 추가, 수정 후 자동 재배포 |
| `page.tsx` | iframeKey/isRedeploying 상태, handleModifyComplete 로직 |

## 상태별 미리보기

| 상태 | 미리보기 |
|------|---------|
| idle | "앱을 설명하면 여기서 미리볼 수 있습니다" |
| questionnaire | 구조 시각화 (페이지목록+기능트리) |
| designing | 구조 시각화 |
| generating (no files) | 프로그레스 뷰 (단계별 아이콘) |
| generating (files) | LivePreview + 미니 프로그레스 |
| done (URL 있음) | **iframe(배포 URL)** + LIVE 배지 |
| done (URL 없음) | "배포 준비 중..." + 폴링 |

## 검증
- [x] tsc --noEmit 0 에러
- [ ] 앱 생성 완료 → 미리보기에 실제 앱 (iframe)
- [ ] 채팅 수정 → 재배포 → iframe 업데이트
- [ ] 로그인 화면 안 나오고 메인 페이지
- [ ] 모바일/PC 전환 작동
