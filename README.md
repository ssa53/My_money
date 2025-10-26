# 간단 가계부 애플리케이션

Vercel과 MongoDB Atlas를 사용한 가계부 웹 애플리케이션입니다.

## 🚀 배포 방법

### 1. MongoDB Atlas 설정

1. [MongoDB Atlas](https://www.mongodb.com/atlas)에 가입
2. 새로운 클러스터 생성
3. 데이터베이스 사용자 생성
4. 네트워크 액세스 설정 (0.0.0.0/0으로 모든 IP 허용)
5. 연결 문자열 복사

### 2. Vercel 배포

1. [Vercel](https://vercel.com)에 가입
2. GitHub에 이 프로젝트 업로드
3. Vercel에서 프로젝트 import
4. 환경변수 설정:
   - `MONGODB_URI`: MongoDB Atlas 연결 문자열
   - `MONGODB_DB`: 데이터베이스 이름 (기본값: budget-app)

### 3. 환경변수 설정

Vercel 대시보드에서 다음 환경변수를 설정하세요:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/budget-app?retryWrites=true&w=majority
MONGODB_DB=budget-app
```

## 📁 프로젝트 구조

```
├── api/                 # API 라우트
│   ├── user.js         # 사용자 관리
│   ├── transactions.js # 거래내역 관리
│   ├── assets.js       # 자산 관리
│   └── data.js         # 데이터 초기화
├── lib/
│   └── mongodb.js      # MongoDB 연결 유틸리티
├── index.html          # 메인 페이지
├── login.html          # 로그인 페이지
├── script.js           # 프론트엔드 JavaScript
├── style.css           # 스타일시트
├── package.json        # 의존성 관리
└── vercel.json         # Vercel 설정
```

## 🔧 기능

- **자산 관리**: 자산 추가, 수정, 삭제
- **거래내역**: 소득/지출 추가, 수정, 삭제
- **통계 보기**: 월별/주별/연별 통계
- **지출 내역**: 캘린더 형태로 월별 지출 확인
- **환경설정**: 다크모드, 데이터 초기화
- **오프라인 지원**: 로컬 스토리지 백업

## 🌐 사용 방법

1. 배포된 URL에 접속
2. 사용자명 입력 후 로그인
3. 가계부 기능 사용

## 📱 반응형 디자인

모바일과 데스크톱 모두 지원하는 반응형 디자인입니다.
