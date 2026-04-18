// Answer Sheet — "답지 채우기" 모델의 데이터 구조
// Day 3에서 프론트 카드 UI + 백엔드 파서가 이 타입을 공유한다

// 필수 5항목 + 동적 추가 필드로 구성된 "답지"
// 각 필드는 AI가 추정했는지 / 사용자가 명시했는지 / 비어있는지 구분
export type AnswerSheetFieldValue<T = string> =
  | { status: 'filled'; source: 'user'; value: T }
  | { status: 'filled'; source: 'inferred'; value: T; confidence: 'high' | 'medium' | 'low' }
  | { status: 'empty' };

// 답지 필수 5항목 (모든 앱 공통)
export interface AnswerSheetRequired {
  appKind: AnswerSheetFieldValue<string>;        // 앱 종류 (예약앱, 쇼핑몰, 블로그...)
  industry: AnswerSheetFieldValue<string>;       // 업종 (미용실, 병원, 식당...)
  oneLiner: AnswerSheetFieldValue<string>;       // 한 마디 설명

  benchmarkSites: AnswerSheetFieldValue<string[]>; // 벤치마킹 사이트 (URL/이름 또는 "없음")
  designRef: AnswerSheetFieldValue<string>;         // 디자인 참조 (이미지/URL/키워드 또는 "없음")

  corePages: AnswerSheetFieldValue<string[]>;       // 핵심 페이지/기능
  freeText: AnswerSheetFieldValue<string>;          // 자유 입력 (특별 요구)
}

// 동적 필드 (앱 종류별로 AI가 즉석 추가)
// 예: 예약앱 → { operationHours, paymentMethod } / 쇼핑몰 → { shipping, memberTier }
export interface AnswerSheetDynamic {
  [key: string]: AnswerSheetFieldValue<string | string[]>;
}

// 전체 답지
export interface AnswerSheet {
  required: AnswerSheetRequired;
  dynamic: AnswerSheetDynamic;
  // 답지가 "완성" 판정되면 Agent가 작업 시작
  completed: boolean;
  // 마지막 업데이트 시각 (디버깅용)
  updatedAt: string;
}

// 종합 카드 — 빈 칸을 한 번에 표시할 구조
export interface AnswerSheetCard {
  greeting: string;                  // "미용실 예약앱 만들어드릴게요" 같은 한 줄
  questions: AnswerSheetQuestion[];  // 최대 2~3개
  allowFreeText: true;               // 항상 true
  startKeywords: string[];           // "시작" / "ㄱㄱ" / "응" / "그대로"
}

export interface AnswerSheetQuestion {
  id: string;                    // 답지 필드 키 (예: "benchmarkSites")
  label: string;                 // 사용자에게 보일 질문
  options: AnswerSheetOption[];  // 최대 3~5개
}

export interface AnswerSheetOption {
  number: number;   // [1] [2] [3] — 모바일 입력 친화
  label: string;
  value: string;
}

// 사용자 응답 파싱 결과 — Day 3에서 구현할 번호/클릭/자연어 통합 파서의 결과
export type AnswerSheetResponse =
  | { kind: 'number'; picks: Record<string, number> }  // { "benchmarkSites": 1, "designRef": 2 }
  | { kind: 'start' }                                   // "시작" / "그대로" — 기본값으로 즉시 진행
  | { kind: 'free'; text: string };                     // 자연어 자유 입력

// 빈 답지 팩토리
export function createEmptyAnswerSheet(): AnswerSheet {
  const empty: AnswerSheetFieldValue = { status: 'empty' };
  return {
    required: {
      appKind: empty,
      industry: empty,
      oneLiner: empty,
      benchmarkSites: { status: 'empty' },
      designRef: empty,
      corePages: { status: 'empty' },
      freeText: empty,
    },
    dynamic: {},
    completed: false,
    updatedAt: new Date().toISOString(),
  };
}

// 빈 칸 카운트 (Level 판단용)
// Level 0 (0 빈칸) = 즉시 시작 / Level 1 (1개) = 1개 질문 / Level 2+ = 종합 카드
export function countEmpty(sheet: AnswerSheet): number {
  let count = 0;
  for (const field of Object.values(sheet.required)) {
    if (field.status === 'empty') count++;
  }
  for (const field of Object.values(sheet.dynamic)) {
    if (field.status === 'empty') count++;
  }
  return count;
}
