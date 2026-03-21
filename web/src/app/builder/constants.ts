// ── 업종별 질문지 ────────────────────────────────────
export type Question = {
  id: string;
  question: string;
  chips: string[];
  multi?: boolean;
};

export const QUESTIONNAIRES: Record<string, Question[]> = {
  'beauty-salon': [
    { id: 'biz_name', question: '매장(서비스) 이름이 뭔가요?', chips: ['헤어살롱 뷰티', '스타일 스튜디오', '○○ 헤어'] },
    { id: 'target', question: '주 고객층은 어떻게 되나요?', chips: ['여성 전문', '남성 전문', '남녀 공용', '키즈 포함'], multi: true },
    { id: 'staff', question: '디자이너(스태프)는 몇 명인가요?', chips: ['1명 (1인샵)', '2~5명', '6~10명', '10명 이상'] },
    { id: 'booking', question: '어떤 예약 방식이 필요한가요?', chips: ['전화 예약', '온라인 예약', '카카오톡 예약', '워크인(현장 접수)'], multi: true },
    { id: 'features', question: '꼭 필요한 기능을 골라주세요!', chips: ['매출/정산 관리', '고객 CRM', '포인트 적립', '알림톡 발송', '재고 관리', '디자이너 성과'], multi: true },
    { id: 'pain', question: '현재 가장 불편한 점은?', chips: ['예약 관리가 복잡해요', '매출 정산이 어려워요', '고객 기록이 없어요', '노쇼가 많아요'], multi: true },
  ],
  'ecommerce': [
    { id: 'biz_name', question: '쇼핑몰 이름이 뭔가요?', chips: ['스타일샵', '○○ 마켓', '핸드메이드 스토어'] },
    { id: 'product', question: '어떤 상품을 판매하시나요?', chips: ['의류/패션', '뷰티/화장품', '식품/음료', '전자제품', '핸드메이드/공예'], multi: true },
    { id: 'delivery', question: '배송 방식은?', chips: ['택배 배송', '당일 배송', '픽업 (직접 수령)', '디지털 상품 (다운로드)'], multi: true },
    { id: 'features', question: '필요한 기능을 골라주세요!', chips: ['장바구니', '쿠폰/할인', '리뷰/평점', '재고 관리', '회원 등급', '정기구독'], multi: true },
    { id: 'payment', question: '결제 수단은?', chips: ['카드 결제', '계좌이체', '네이버페이', '카카오페이'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['상품 등록이 번거로워요', '주문 관리가 어려워요', '재고 파악이 안 돼요', '고객 CS가 힘들어요'], multi: true },
  ],
  'booking-crm': [
    { id: 'biz_name', question: '사업체 이름이 뭔가요?', chips: ['○○ 클리닉', '○○ 피트니스', '○○ 학원'] },
    { id: 'industry', question: '어떤 업종인가요?', chips: ['병원/클리닉', '피트니스/요가', '학원/교육', '식당/카페', '펜션/숙박'], multi: true },
    { id: 'staff', question: '스태프는 몇 명인가요?', chips: ['1명 (1인 운영)', '2~5명', '6~10명', '10명 이상'] },
    { id: 'booking_type', question: '예약 형태는?', chips: ['시간대별 예약', '날짜별 예약', '코스/프로그램 등록', '대기열 (순서대로)'], multi: true },
    { id: 'features', question: '필요한 기능은?', chips: ['온라인 예약 페이지', '고객 CRM', '매출 관리', '알림톡/SMS 발송', '출석 체크', '통계 대시보드'], multi: true },
    { id: 'pain', question: '가장 불편한 점은?', chips: ['예약 중복이 잦아요', '노쇼가 많아요', '고객 관리가 안 돼요', '매출 파악이 어려워요'], multi: true },
  ],
  'o2o-matching': [
    { id: 'biz_name', question: '서비스 이름이 뭔가요?', chips: ['○○ 매칭', '퀵도우미', '매칭플러스'] },
    { id: 'service_type', question: '어떤 서비스를 매칭하나요?', chips: ['배달/심부름', '청소/가사도우미', '과외/레슨', '펫시터/반려동물', '부동산/인테리어'], multi: true },
    { id: 'matching_method', question: '매칭 방식은?', chips: ['자동 매칭 (가까운 제공자)', '제공자 입찰 (견적 제출)', '고객이 직접 선택'] },
    { id: 'payment_method', question: '결제 방식은?', chips: ['선결제 (에스크로)', '후결제 (완료 후)', '현장 결제', '정기 구독'] },
    { id: 'features', question: '필요한 기능은?', chips: ['지도 연동 (위치 표시)', '1:1 채팅', '양방향 리뷰/평점', '수수료 자동 정산', '알림톡 발송', '관리자 대시보드'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['매칭이 느려요', '제공자 관리가 힘들어요', '정산이 복잡해요', '고객 불만이 많아요'], multi: true },
  ],
  'edutech': [
    { id: 'biz_name', question: '교육 서비스 이름이 뭔가요?', chips: ['○○ 아카데미', '런잇', '스터디플러스'] },
    { id: 'edu_type', question: '어떤 교육 서비스인가요?', chips: ['온라인 강의 (VOD)', '실시간 라이브 수업', '오프라인 학원', '기업 교육/연수', '자격증/시험 대비'], multi: true },
    { id: 'content_type', question: '콘텐츠 형태는?', chips: ['영상 강의 (YouTube/Vimeo)', 'PDF/PPT 교재', '실시간 화상 (Zoom)', '과제/포트폴리오 제출'], multi: true },
    { id: 'eval_method', question: '평가 방식은?', chips: ['퀴즈/시험 (자동채점)', '과제 제출', '수료증 자동 발급', '평가 없음 (자유 수강)'], multi: true },
    { id: 'features', question: '필요한 기능은?', chips: ['수강생 진도율 추적', 'Q&A 게시판', '출석 체크', '수업 리마인더 알림', '매출/수강 통계', '수료증 PDF 발급'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['수강생 관리가 어려워요', '진도율 파악이 안 돼요', '결제/환불 처리가 번거로워요', '콘텐츠 관리가 복잡해요'], multi: true },
  ],
  'facility-mgmt': [
    { id: 'biz_name', question: '관리업체(시설) 이름이 뭔가요?', chips: ['○○ 관리', '해피타운 관리사무소', '스마트빌딩'] },
    { id: 'facility_type', question: '어떤 시설을 관리하나요?', chips: ['아파트/주거단지', '오피스빌딩/상업시설', '공유오피스/코워킹', '상가/쇼핑몰'], multi: true },
    { id: 'complaint_type', question: '주요 민원 유형은?', chips: ['하자보수 (누수/설비)', '소음/층간소음', '주차 문제', '시설 이용 문의', '관리비 관련'], multi: true },
    { id: 'scale', question: '관리 규모는?', chips: ['소규모 (~100세대)', '중규모 (100~500세대)', '대규모 (500세대 이상)'] },
    { id: 'features', question: '필요한 기능은?', chips: ['시설 예약 (회의실/주차)', '관리비 청구/수납', '전화 민원 자동 기록', '알림톡 (공지/민원)', '만족도 조사', '민원 현황 대시보드'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['전화 민원이 너무 많아요', '민원 처리 추적이 안 돼요', '공지 전달이 어려워요', '관리비 수납이 번거로워요'], multi: true },
  ],
  'local-commerce': [
    { id: 'biz_name', question: '매장(브랜드) 이름이 뭔가요?', chips: ['○○ 농장', '해녀의집', '산지직송 ○○'] },
    { id: 'product_type', question: '어떤 상품을 판매하세요?', chips: ['수산물/해산물', '농산물/과일', '축산물/유제품', '수공예/특산품', '전통식품/장류'], multi: true },
    { id: 'sales_method', question: '판매 방식은?', chips: ['온라인 직판 (택배)', '현장 판매 (가판대/장터)', '구독형 정기배송', '체험 관광 + 판매'], multi: true },
    { id: 'delivery', question: '배송 방식은?', chips: ['택배 (일반)', '당일 배송', '새벽 배송', '직접 수령', '냉장/냉동 특수배송'], multi: true },
    { id: 'features', question: '필요한 기능은?', chips: ['상품 관리', '주문/결제', '배송 추적', '리뷰/평점', '생산자 소개', '체험 예약', '정기구독 관리'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['온라인 판매 채널이 없어요', '주문 관리가 복잡해요', '배송 관리가 어려워요', '단골 고객 관리가 안 돼요'], multi: true },
  ],
  'healthcare': [
    { id: 'biz_name', question: '서비스 이름이 뭔가요?', chips: ['하루습관', '헬스메이트', '○○ 트래커'] },
    { id: 'health_type', question: '어떤 건강 관리를 하시나요?', chips: ['복약 관리', '운동/피트니스', '식단/영양', '수면 관리', '정신건강/명상', '만성질환 관리'], multi: true },
    { id: 'tracking', question: '어떤 데이터를 기록하나요?', chips: ['일일 체크리스트', '수치 기록 (혈압/체중/혈당)', '사진 기록', '타이머/스톱워치'], multi: true },
    { id: 'motivation', question: '동기부여 방식은?', chips: ['연속 달성 스트릭', '목표 달성 배지', '랭킹/리더보드', '리마인더 알림', '통계 리포트'], multi: true },
    { id: 'features', question: '필요한 기능은?', chips: ['습관 체크리스트', '통계/차트', '목표 설정', '알림/리마인더', '커뮤니티', '전문가 상담'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['꾸준히 기록하기 어려워요', '동기부여가 안 돼요', '데이터를 한눈에 보고 싶어요', '전문가 조언이 필요해요'], multi: true },
  ],
  'matching': [
    { id: 'biz_name', question: '서비스 이름이 뭔가요?', chips: ['○○ 매칭', '전문가 찾기', '견적비교'] },
    { id: 'service_field', question: '어떤 분야의 전문가를 매칭하나요?', chips: ['인테리어/리모델링', '이사/청소', '법률/세무', '디자인/개발', '교육/과외', '기타 전문 서비스'], multi: true },
    { id: 'matching_method', question: '매칭 방식은?', chips: ['고객 견적 요청 → 전문가 입찰', '고객이 전문가 리스트에서 선택', '자동 매칭 (조건 기반)'] },
    { id: 'payment_method', question: '결제 방식은?', chips: ['플랫폼 결제 (에스크로)', '전문가에게 직접 결제', '현장 결제', '무료 (중개만)'] },
    { id: 'features', question: '필요한 기능은?', chips: ['전문가 프로필/포트폴리오', '견적 요청/비교', '1:1 채팅', '리뷰/평점', '자동 매칭', '정산 관리'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['좋은 전문가 찾기 어려워요', '견적 비교가 번거로워요', '전문가 신뢰도 판단이 안 돼요', '정산이 복잡해요'], multi: true },
  ],
  'custom': [
    { id: 'biz_name', question: '앱 이름을 정해주세요!', chips: ['마이앱', '○○ 관리', '○○ 도우미'] },
    { id: 'app_description', question: '어떤 앱을 만들고 싶으세요? 자유롭게 설명해주세요!', chips: ['포모도로 타이머', '가계부/지출관리', '할일 관리(투두)', '독서 기록', '커뮤니티/게시판', '블로그/포트폴리오'] },
    { id: 'target_user', question: '누가 사용하는 앱인가요?', chips: ['나 혼자 (개인용)', '우리 팀/회사', '일반 사용자 (다수)', '관리자 + 사용자'] },
    { id: 'data_storage', question: '데이터를 어떻게 저장할까요?', chips: ['브라우저에만 (새로고침해도 유지)', '서버에 저장 (로그인+DB)', 'AI가 알아서 판단해줘'] },
    { id: 'features', question: '필요한 기능을 골라주세요!', chips: ['대시보드/통계', '로그인/회원가입', '검색/필터', '차트/그래프', '알림', '파일 업로드', 'CRUD (생성/수정/삭제)'], multi: true },
    { id: 'reference', question: '참고할 서비스가 있으면 알려주세요! (없으면 넘어가도 OK)', chips: ['없음, AI가 알아서', '노션 같은 메모앱', '배달의민족 같은 앱', '인스타그램 같은 피드'] },
  ],
};

// ── 테마 색상 맵 ──────────────────────────────────────
export const THEME_MAP: Record<string, { accent: string; grad: string }> = {
  'basic-light': { accent: '#3b82f6', grad: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' },
  'basic-dark': { accent: '#3b82f6', grad: 'linear-gradient(135deg,#1e293b,#334155)' },
  'ocean-blue': { accent: '#0ea5e9', grad: 'linear-gradient(135deg,#0ea5e9,#06b6d4)' },
  'forest-green': { accent: '#16a34a', grad: 'linear-gradient(135deg,#16a34a,#059669)' },
  'warm-amber': { accent: '#d97706', grad: 'linear-gradient(135deg,#d97706,#ea580c)' },
  'rose-pink': { accent: '#f43f5e', grad: 'linear-gradient(135deg,#f43f5e,#ec4899)' },
  'minimal-swiss': { accent: '#ef4444', grad: 'linear-gradient(135deg,#1e293b,#0f172a)' },
  'korean-naver': { accent: '#03C75A', grad: 'linear-gradient(135deg,#03C75A,#16a34a)' },
  'korean-kakao': { accent: '#FEE500', grad: 'linear-gradient(135deg,#3B1E1E,#5C3A2E)' },
  'luxury-marble': { accent: '#a78bfa', grad: 'linear-gradient(135deg,#1e1b2e,#312e4a)' },
  'neon-cyber': { accent: '#22d3ee', grad: 'linear-gradient(135deg,#0f172a,#1e1b4b)' },
};

// ── 업종별 기능 라벨 맵 생성 ────────────────────────────
export function getFeatLabel(templateId: string, industry: string): Record<string, string> {
  const isBeauty = templateId === 'beauty-salon';
  const isCommerce = templateId === 'ecommerce';
  const isO2O = templateId === 'o2o-matching';
  const isEdutech = templateId === 'edutech';
  const isFacility = templateId === 'facility-mgmt';
  const isClinic = industry.includes('병원') || industry.includes('클리닉');
  const isFitness = industry.includes('피트니스') || industry.includes('요가') || industry.includes('헬스');
  const isEdu = isEdutech || industry.includes('학원') || industry.includes('교육');
  const isFood = industry.includes('식당') || industry.includes('카페');
  const isLodging = industry.includes('펜션') || industry.includes('숙박');

  return {
    'dashboard': '📊 대시보드',
    'reservation': isBeauty ? '💇 예약' : isClinic ? '🏥 진료예약' : isFitness ? '🏋️ 수업예약' : isEdu ? '📚 수강예약' : isFood ? '🍽 테이블예약' : isLodging ? '🛏 객실예약' : '📅 예약',
    'booking': isBeauty ? '💇 예약' : isClinic ? '🏥 진료예약' : isFitness ? '🏋️ 수업예약' : isEdu ? '📚 수강예약' : isFood ? '🍽 테이블예약' : isLodging ? '🛏 객실예약' : '📅 예약',
    'sales': isCommerce ? '💰 판매' : '💰 매출',
    'customer': isEdu ? '🎓 학생관리' : isClinic ? '🏥 환자관리' : isFitness ? '💪 회원관리' : '👥 고객',
    'staff': isBeauty ? '💇 디자이너' : isClinic ? '👨‍⚕️ 의료진' : isEdu ? '👨‍🏫 강사' : isFitness ? '🏃 트레이너' : isFood ? '👨‍🍳 직원' : '👤 스태프',
    'service-menu': isBeauty ? '✂️ 시술메뉴' : isClinic ? '💊 진료과목' : isEdu ? '📖 수업과목' : isFitness ? '🏋️ 프로그램' : isFood ? '📋 메뉴판' : '📋 서비스',
    'online-booking': '🌐 온라인예약',
    'alimtalk': '💬 알림톡', 'notification': '🔔 알림',
    'settlement': '📋 정산', 'payment': '💳 결제',
    'prepaid': isEdu ? '🎫 수강권' : isFitness ? '🎫 이용권' : '🎫 정액권',
    'membership': isEdu ? '🎓 수강권' : isFitness ? '💪 회원권' : '🎫 회원권',
    'admin-dashboard': '📊 관리', 'attendance': '✅ 출석', 'coupon': '🎟 쿠폰',
    'review': '⭐ 리뷰', 'wishlist': '❤️ 찜', 'inventory': '📦 재고',
    'product': '🛍 상품', 'cart': '🛒 장바구니', 'order': '📋 주문', 'shipping': '🚚 배송',
    'seo': '🔍 SEO',
    // O2O 매칭
    'matching': '🔗 매칭', 'provider-mgmt': '👤 제공자', 'order-status': '📍 상태추적',
    'map': '🗺 지도', 'chat': '💬 채팅',
    // 에듀테크
    'course': '📹 강의', 'student': '🎓 수강생', 'progress': '📊 진도율',
    'quiz': '📝 퀴즈', 'certificate': '🏅 수료증', 'community': '💬 Q&A',
    // 관리업체
    'complaint': '📞 민원', 'tenant': '🏠 입주민', 'notice': '📢 공지',
    'maintenance': '🔧 보수', 'facility-booking': '🏢 시설예약',
    'billing': '💰 관리비', 'phone-log': '📞 전화기록', 'satisfaction': '😊 만족도',
    // 지역커머스
    'product-mgmt': '🛍 상품관리', 'producer': '👨‍🌾 생산자', 'subscription': '📦 정기구독',
    'experience': '🎪 체험예약', 'local-delivery': '🚛 배송관리',
    // 헬스케어
    'habit': '✅ 습관체크', 'medication': '💊 복약관리', 'health-stats': '📊 건강통계',
    'goal': '🎯 목표설정', 'streak': '🔥 스트릭', 'reminder': '⏰ 리마인더',
    // 전문가매칭
    'expert-profile': '👨‍💼 전문가프로필', 'request': '📝 견적요청',
    'estimate': '💰 견적비교', 'portfolio': '📁 포트폴리오',
    // 범용
    'custom-app': '🚀 홈', 'auth': '🔑 인증', 'crud': '📋 데이터',
    'search': '🔍 검색', 'chart': '📈 차트', 'file-upload': '📎 파일',
  };
}
