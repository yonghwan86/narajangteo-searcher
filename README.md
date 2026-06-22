# 나라장터 검색기 (나라장터 IT 입찰공고 검색기)

> 조달청 나라장터 IT 입찰공고 검색 + 개찰결과(전체 투찰자 명단) 분석 **독립 실행 앱 / MCP 서버**

## ⬇️ 다운로드 (Windows 64bit)

### 👉 [**최신 버전 EXE 내려받기**](https://github.com/yonghwan86/narajangteo-searcher/releases/latest/download/narajangteo-searcher.exe)

받은 **`narajangteo-searcher.exe`** 를 더블클릭하면 끝입니다. **설치 불필요 · Node.js 불필요.**

- 실행하면 브라우저가 자동으로 열립니다(`http://localhost:7777`).
- Windows 보안경고(SmartScreen)가 뜨면 **추가 정보 → 실행** (서명 안 된 자체 빌드라 그렇습니다).
- 사용법·모든 버전: **[Releases 페이지 →](https://github.com/yonghwan86/narajangteo-searcher/releases)**

---

조달청 **나라장터 입찰공고정보서비스**(공공데이터포털 데이터번호 15129394, `BidPublicInfoService`)를
이용해 **IT 소기업이 입찰공고를 빠르게 찾고, 참여 여부를 판단하고, 수주 가능성 높은 공공 IT 사업을
선별**하도록 돕습니다.

**두 가지 형태로 제공됩니다 (핵심코드 공유):**
1. **독립 실행 앱** — 더블클릭하면 브라우저에 검색 UI가 뜨는 일반 프로그램. Claude 불필요.
2. **MCP 서버** — Claude(Desktop/Code)에 연결해 대화로 검색·분석·검토메모를 시키는 형태.

단순 API 래퍼가 아니라 **검색 → IT 필터링 → 적합도 점수 → 검토 메모**까지 수행합니다.

---

# 🖥️ A. 독립 실행 앱 (가장 쉬움 — 비개발자/팀원용)

## 단일 EXE로 쓰기 (Node 설치 불필요)
1. `나라장터-IT입찰공고-검색기.exe` 를 더블클릭
   - (Windows 보안경고가 뜨면 "추가 정보 → 실행"을 누르세요. 서명 안 된 자체 빌드라 그렇습니다.)
2. 브라우저가 자동으로 열립니다 (`http://localhost:7777`)
3. 우측 상단 **[인증키 설정]** → 공공데이터포털에서 발급받은 **일반 인증키**를 붙여넣고 저장
   (Decoding 키면 그대로, Encoding 키(% 포함)면 체크박스 선택)
4. 검색 조건(업무구분·기간·키워드·예산·지역) 입력 → **[검색]**
5. 결과 표에서 점수순 정렬, 판단(✅바로검토/🟡조건확인/⛔비추천) 색상, 공고명 클릭 → 원문
6. 상단 **[📊 개찰결과 분석]** 탭 → 마감된 공고를 키워드로 검색(업무구분 기본 전체) → 공고 행 클릭 시
   그 자리에서 **전체 투찰자 명단**(순위·사업자등록번호·업체명·투찰금액·투찰률·비고)이 펼쳐짐 + CSV 내려받기

> 인증키는 이 PC의 `%APPDATA%\g2b-it-bid\config.json` 에만 저장됩니다(한 번만 입력).

## EXE 직접 빌드하기 (개발자용)
```bash
npm install
npm run build:exe      # → dist-exe/나라장터-IT입찰공고-검색기.exe (약 88MB, Node 내장)
```

## EXE 없이 폴더로 실행 (Node 필요)
- 폴더의 **`run.bat`** 더블클릭 → 의존성 자동 설치 후 실행
- 또는 `npm install && npm run build && npm run app`

---

# 🤖 B. MCP 서버 (Claude 사용자용)

단순 API 래퍼가 아니라 검색·필터·점수·검토메모를 Claude가 대화로 처리합니다.

## 1. 이 MCP 서버가 하는 일

- 오늘/최근 올라온 IT 관련 입찰공고 검색 (용역 기본, 물품/공사/외자 확장)
- IT 키워드 자동 필터링 및 카테고리 분류(SI/웹/앱/유지보수/클라우드/AI/데이터/보안/ERP 등)
- IT 소기업 기준 100점 적합도 점수 + "바로 검토 / 조건 확인 후 검토 / 비추천" 분류
- 특정 공고 통합 상세조회(목록+기초금액+면허제한+참가지역+변경이력)
- 대표 의사결정용 입찰 검토 메모 자동 작성
- 마감 임박 공고 탐색, 키워드 감시

> ⚠️ **읽기 전용**입니다. 투찰/계약 체결/전자서명/로그인 대행/투찰 자동화는 **구현하지 않습니다.**
> 공고 탐색·분석·검토 메모 작성까지만 수행합니다.

## 2. 설치 방법

```bash
cd g2b-it-bid-mcp
npm install
npm run build
```

요구사항: Node.js 20.19 이상.

## 3. 인증키 등록 방법

1. [공공데이터포털 서비스 페이지](https://www.data.go.kr/data/15129394/openapi.do)에서 **활용신청**
2. 승인 후 발급되는 **일반 인증키**를 확인 (Encoding / Decoding 두 형태 제공)
3. 아래 방법 중 하나로 키를 주입 (코드에 하드코딩하지 마세요)

> 🧾 **개찰결과 — 전체 투찰자 명단은 나라장터 화면 데이터로 가져옵니다(인증키 불필요).**
> 공식 OpenAPI(낙찰정보서비스 15129397)는 공고당 **개찰 1순위(낙찰예정자) 1개사**만 제공하므로,
> `get_bid_opening_result`와 웹앱 "개찰결과 분석" 탭은 **나라장터 통합검색 상세화면이 쓰는 내부 엔드포인트**를
> 재현해 **투찰자 전원**(2·3순위 포함)을 가져옵니다. 로그인 없이 동작하며 인증키도 필요 없습니다.
>
> ⚠️ 이 전체명단 기능은 **공식 OpenAPI가 아니라 나라장터 내부 호출 재현**입니다(상용 입찰정보 서비스들과 동일 방식).
> 나라장터 개편 시 엔드포인트/식별값이 바뀌면 깨질 수 있으며(수정 용이), 과도한 반복 호출은 피하도록 쿠키·결과를 캐시합니다.
> 폴백용 공식 OpenAPI(낙찰예정자)를 쓰려면 [낙찰정보서비스 활용신청](https://www.data.go.kr/data/15129397/openapi.do)이 별도로 필요합니다(같은 인증키).

### `.env` 파일 사용

`.env.example`을 복사해 `.env`를 만들고 키를 입력합니다.

```
NARAJANGTEO_SERVICE_KEY=발급받은_인증키
# Decoding 키(원본)면 false, Encoding 키(% 포함)면 true. 미지정 시 자동 판별.
NARAJANGTEO_SERVICE_KEY_IS_ENCODED=false
```

> 💡 **이중 인코딩 주의**: 본 서버는 `serviceKey`를 자동으로 1회만 인코딩합니다.
> `%`가 포함된 **Encoding 키**를 넣었다면 `NARAJANGTEO_SERVICE_KEY_IS_ENCODED=true`,
> `%`가 없는 **Decoding 키(원본)**를 넣었다면 `false`로 설정하세요. (미지정 시 `%` 포함 여부로 자동 판별)

- 인증키가 없으면 도구 실행 시 명확한 한국어 오류를 반환합니다(빌드/도구목록은 키 없이도 동작).
- 인증키는 로그·응답·에러 메시지에 **절대 출력되지 않습니다**(URL 마스킹 적용).

## 4. `.env.example`

```
NARAJANGTEO_SERVICE_KEY=여기에_발급받은_인증키_입력
# NARAJANGTEO_SERVICE_KEY_IS_ENCODED=true
# G2B_API_PROTOCOL=https
```

## 5. MCP 클라이언트 연결 예시

### Claude Desktop (Windows)

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "g2b-it-bid": {
      "command": "node",
      "args": ["C:/Blue/g2b-it-bid-mcp/build/index.js"],
      "env": {
        "NARAJANGTEO_SERVICE_KEY": "사용자_인증키",
        "NARAJANGTEO_SERVICE_KEY_IS_ENCODED": "true"
      }
    }
  }
}
```

### macOS / Linux

`~/Library/Application Support/Claude/claude_desktop_config.json` (mac) 또는 해당 설정 파일:

```json
{
  "mcpServers": {
    "g2b-it-bid": {
      "command": "node",
      "args": ["/path/to/g2b-it-bid-mcp/build/index.js"],
      "env": {
        "NARAJANGTEO_SERVICE_KEY": "사용자_인증키",
        "NARAJANGTEO_SERVICE_KEY_IS_ENCODED": "true"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add g2b-it-bid -- node C:/Blue/g2b-it-bid-mcp/build/index.js
```

(환경변수는 셸 또는 `.env`로 주입)

## 6. 사용 가능한 도구

| 도구 | 설명 |
|---|---|
| `search_it_bids` | IT 관련 입찰공고 검색 (기간/지역/예산/키워드 필터 + 추천순) |
| `get_bid_detail` | 특정 공고 통합 상세조회 (기초금액·면허제한·참가지역·변경이력 포함) |
| `get_bid_opening_result` | **개찰결과 조회** — 투찰 마감·개찰 완료된 공고의 **투찰 업체 전원**(순위·사업자등록번호·업체명·대표자명·투찰금액·투찰률·비고·투찰일시)을 나라장터에서 조회. 실패 시 공식 OpenAPI(낙찰예정자)로 자동 폴백 |
| `recommend_bids_for_small_it_company` | IT 소기업 적합도 점수 추천 + 분류 |
| `create_bid_review_memo` | 대표 의사결정용 9섹션 입찰 검토 메모 작성 |
| `find_deadline_urgent_bids` | 마감 임박(기본 72h) IT 공고 탐색 |
| `watch_keywords` | 키워드별 최근 공고 감시 + 중복 제거 |
| `call_raw_operation` | 25개 오퍼레이션 원시 호출 (검증/확장) |

## 7. 예시 질문

- "오늘 올라온 IT 관련 용역 공고 찾아줘"
- "이번 주 마감되는 소프트웨어 개발 사업 찾아줘"
- "우리 같은 IT 소기업이 들어갈 만한 공고만 골라줘"
- "기초금액 5천만 원 이상 2억 원 이하 공고만 찾아줘"
- "지역제한이 없는 전국 공고만 찾아줘"
- "마감이 3일 이내인 공고 중 참여 가능성이 높은 순서로 정리해줘"
- "R25BK00932003 공고 상세정보로 입찰 검토 메모 작성해줘"
- "20240516360 공고 개찰결과 보여줘 (낙찰예정자 사업자번호·업체명)"

## 8. 보안 주의사항

- 인증키는 환경변수로만 주입하며 코드/저장소에 포함하지 않습니다(`.env`는 `.gitignore` 대상).
- 인증키는 로그·응답·에러에 마스킹되어 노출되지 않습니다.
- 본 서버는 **읽기 전용**입니다. 투찰/계약/전자서명/자동화 기능은 제공하지 않습니다.

## 9. 나라장터 API 트래픽 주의사항

- **개발계정은 일 1,000 요청** 제한입니다. (운영계정은 활용사례 등록 시 증가 가능)
- 동일 요청은 10분 메모리 캐시로 호출을 절약합니다.
- `get_bid_detail` / `create_bid_review_memo`는 공고 1건당 보조 오퍼레이션까지 호출하므로
  (최대 4~5콜) 트래픽 소모가 큽니다. 캐시로 재호출은 절약되지만 과도한 반복 호출은 피하세요.

## 10. 개발 / 테스트

```bash
npm run dev     # tsx로 소스 직접 실행
npm test        # 단위 테스트 (scoring, normalizer) — 인증키 불필요
npm run build   # dist 빌드

# 키 없이 도구 목록 확인
npx @modelcontextprotocol/inspector node build/index.js
```

## 향후 확장 계획

- 물품/외자/공사 검색 고도화 및 세부품명번호 기반 필터
- 공고 변경 알림(주기적 폴링) 및 즐겨찾기
- 적합도 점수 가중치 사용자 설정
