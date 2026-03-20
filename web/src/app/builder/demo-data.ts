// ── 업종별 데모 데이터 ──────────────────────────────────

export interface DemoData {
  names: string[];
  services: string[];
  staffTitle: string;
  staffNames: string[];
}

export function getDemoData(templateId: string, industry: string): DemoData {
  const isBeauty = templateId === 'beauty-salon';
  const isCommerce = templateId === 'ecommerce';
  const isO2O = templateId === 'o2o-matching';
  const isEdutech = templateId === 'edutech';
  const isFacility = templateId === 'facility-mgmt';
  const isClinic = industry.includes('병원') || industry.includes('클리닉');
  const isFitness = industry.includes('피트니스') || industry.includes('요가') || industry.includes('헬스');
  const isEdu = isEdutech || industry.includes('학원') || industry.includes('교육');
  const isFood = industry.includes('식당') || industry.includes('카페');

  const names = isFacility ? ['101동 김주민', '203동 박입주', '305동 이세대', '402동 최거주'] :
    isO2O ? ['김고객', '이의뢰', '박주문', '최사용'] :
    isEdutech ? ['김수진', '이태현', '박지은', '최민호'] :
    isEdu ? ['김수진', '이태현', '박지은', '최민호'] :
    isClinic ? ['김지현', '이서윤', '박민준', '최하은'] :
    isFitness ? ['김유진', '이준혁', '박소연', '최강민'] :
    isFood ? ['김철수', '이영희', '박상준', '최미경'] :
    isCommerce ? ['김쇼핑', '이주문', '박구매', '최고객'] :
    isBeauty ? ['김지현', '이서윤', '박민준', '최하은'] :
    ['김지현', '이서윤', '박민준', '최하은'];

  const services = isFacility ? ['누수 수리 요청', '주차 문의', '층간소음 민원', '시설 예약'] :
    isO2O ? ['청소 매칭', '과외 매칭', '배달 요청', '펫시터 매칭'] :
    isEdutech ? ['Python 기초', '웹개발 심화', '데이터분석', 'AI 입문'] :
    isEdu ? ['수학 심화', '영어 회화', '과학 실험', '코딩 기초'] :
    isClinic ? ['일반 진료', '건강검진', '재활치료', '상담'] :
    isFitness ? ['PT 10회', '요가 클래스', '필라테스', '크로스핏'] :
    isFood ? ['4인 테이블', '룸 예약', '단체석', '바 좌석'] :
    isCommerce ? ['주문 #1082', '주문 #1083', '주문 #1084', '주문 #1085'] :
    isBeauty ? ['커트+펌', '염색', '클리닉', '드라이'] :
    ['서비스 A', '서비스 B', '서비스 C', '서비스 D'];

  const staffTitle = isFacility ? '관리자' : isO2O ? '제공자' : isBeauty ? '디자이너' : isClinic ? '의사' : isEdu || isEdutech ? '강사' : isFitness ? '트레이너' : '담당자';

  const staffNames = isFacility ? ['김관리', '박담당'] : isO2O ? ['김제공자', '박파트너'] : isEdu || isEdutech ? ['정선생', '김강사'] : isClinic ? ['정원장', '김의사'] : isFitness ? ['정트레이너', '김코치'] : ['정원장', '김매니저'];

  return { names, services, staffTitle, staffNames };
}
