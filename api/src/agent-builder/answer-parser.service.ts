import { Injectable } from '@nestjs/common';
import type { CardRequest, CardOption } from './stream-event.types';

// "시작" 키워드 계열 — 기본값(추정값)으로 즉시 진행
const START_KEYWORDS = new Set([
  '시작',
  'ㄱㄱ',
  '고',
  'GO',
  'go',
  'start',
  '응',
  '네',
  '예',
  '그대로',
  '그대로시작',
  '그대로 시작',
  '좋아',
  '좋아요',
  'ok',
  'OK',
  'Ok',
]);

// 파싱 결과 — Agent loop이 tool_result로 돌려줄 자료
export type ParsedAnswer =
  | {
      kind: 'default_all';
      message: string;
      assumed: Record<string, string>;
    }
  | {
      kind: 'numbers';
      message: string;
      picks: Record<string, { num: number; label: string; value: string }>;
      remaining: string[]; // 응답 안 된 질문 id
    }
  | {
      kind: 'free_text';
      message: string;
      text: string;
    };

@Injectable()
export class AnswerParserService {
  // 사용자 원문 답변 + 현재 카드를 받아 구조화된 결과로 변환
  parse(userInput: string, card: CardRequest): ParsedAnswer {
    const trimmed = (userInput ?? '').trim();

    // 1) 빈 입력 또는 "시작" 키워드 → 기본값 전체 적용
    if (!trimmed || START_KEYWORDS.has(trimmed.toLowerCase()) || START_KEYWORDS.has(trimmed)) {
      return {
        kind: 'default_all',
        message: '사용자가 "그대로 시작" — 추정값 그대로 진행',
        assumed: card.assumed ?? {},
      };
    }

    // 2) 번호 패턴 — "1, 2, 1" / "1 1 1" / "1"
    // 공백/쉼표 허용, 숫자만 있으면 번호 응답으로 간주
    if (/^[\d\s,./]+$/.test(trimmed)) {
      const nums = trimmed.match(/\d+/g)?.map((n) => Number(n)) ?? [];
      if (nums.length > 0) {
        const picks: Record<string, { num: number; label: string; value: string }> = {};
        const remaining: string[] = [];

        card.questions.forEach((q, idx) => {
          const pickedNum = nums[idx];
          if (pickedNum === undefined) {
            remaining.push(q.id);
            return;
          }
          const option = q.options.find((o: CardOption) => o.num === pickedNum);
          if (!option) {
            remaining.push(q.id);
            return;
          }
          picks[q.id] = { num: option.num, label: option.label, value: option.value };
        });

        return {
          kind: 'numbers',
          message: `번호 입력 파싱 — ${Object.keys(picks).length}개 선택${remaining.length ? `, ${remaining.length}개 미응답` : ''}`,
          picks,
          remaining,
        };
      }
    }

    // 3) 자연어 자유 입력 — Agent가 재해석
    return {
      kind: 'free_text',
      message: '자연어 입력 — Agent가 답지에 매핑해서 진행',
      text: trimmed,
    };
  }

  // Agent에게 tool_result로 넘길 간결한 요약 문자열
  summarize(parsed: ParsedAnswer): string {
    switch (parsed.kind) {
      case 'default_all':
        return `사용자 답변: [DEFAULT_ALL — 그대로 시작]\n추정값 그대로 진행하라. 추가 질문 금지.\n추정값: ${JSON.stringify(parsed.assumed, null, 2)}`;
      case 'numbers': {
        const picksStr = Object.entries(parsed.picks)
          .map(([k, v]) => `  - ${k}: [${v.num}] ${v.label} (value="${v.value}")`)
          .join('\n');
        const remaining = parsed.remaining.length
          ? `\n응답 안 된 질문 ID: ${parsed.remaining.join(', ')} — 추정값 또는 기본값으로 진행하라. 추가 질문 금지.`
          : '';
        return `사용자 답변: [번호 선택]\n${picksStr}${remaining}`;
      }
      case 'free_text':
        return `사용자 답변: [자유 텍스트]\n"${parsed.text}"\n\n이 발화를 답지에 매핑해서 진행하라. 맥락상 명확하면 추가 질문 금지. 정말 모호하면 마지막 한 번만 AskUser.`;
    }
  }
}
