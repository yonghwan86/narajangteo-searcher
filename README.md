# 나라장터 검색기 (나라장터 IT 입찰공고 검색기)

> 조달청 나라장터 IT 입찰공고를 **검색**하고, 마감된 공고의 **개찰결과(전체 투찰자 명단)** 까지 분석하는 도구입니다.
> 더블클릭으로 쓰는 **독립 실행 앱**과, Claude에 붙여 대화로 쓰는 **MCP 서버** 두 가지로 제공됩니다.

조달청 **나라장터 입찰공고정보서비스**(공공데이터포털 데이터번호 15129394, `BidPublicInfoService`)를 이용해
**IT 소기업이 입찰공고를 빠르게 찾고, 참여 여부를 판단하고, 수주 가능성 높은 공공 IT 사업을 선별**하도록 돕습니다.
단순 API 래퍼가 아니라 **검색 → IT 필터링 → 적합도 점수 → 검토 메모**까지 수행합니다.

---

## ⬇️ 다운로드 (Windows 64bit)

### 👉 [**최신 버전 EXE 내려받기**](https://github.com/yonghwan86/narajangteo-searcher/releases/latest/download/narajangteo-searcher.exe)

받은 **`narajangteo-searcher.exe`** 를 더블클릭하면 끝입니다. **설치 불필요 · Node.js 불필요.**

- 실행하면 브라우저가 자동으로 열립니다 (`http://localhost:7777`).
- Windows 보안경고(SmartScreen)가 뜨면 **추가 정보 → 실행** (서명 안 된 자체 빌드라 그렇습니다).
- 이전 버전·사용방법 파일: **[Releases 페이지 →](https://github.com/yonghwan86/narajangteo-searcher/releases)**

---

# 🖥️ A. 독립 실행 앱 (가장 쉬움 — 비개발자/팀원용)

## 사용법

앱을 실행(또는 위에서 받은 EXE 더블클릭)하면 브라우저가 열립니다. 그다음:

1. 우측 상단 **[인증키 설정]** → 공공데이터포털에서 발급받은 **일반 인증키**를 붙여넣고 저장
   - `%`가 없는 **Decoding 키(원본)** 면 그대로, `%`가 포함된 **Encoding 키** 면 체크박스를 선택하세요.
2. **[입찰공고 검색]** 탭 — 검색 조건(업무구분·기간·키워드·예산·지역) 입력 후 **[검색]** (입력칸에서 Enter도 가능)
   - 결과는 적합도 점수순 정렬 + 판단 색상(✅바로검토 / 🟡조건확인 / ⛔비추천), 공고명 클릭 시 원문으로 이동
3. **[📊 개찰결과 분석]** 탭 — 마감된 공고를 키워드로 검색 → 공고 행 클릭 시 그 자리에서
   **전체 투찰자 명단**(순위·사업자등록번호·업체명·투찰금액·투찰률·비고)이 펼쳐짐 + CSV 내려받기
   - **[투찰자 있는 공고만 보기]** 를 켜면 개찰 전·유찰·미공개 공고를 자동으로 걸러줍니다.

> 💡 인증키는 한 번만 입력하면 이 PC의 `%APPDATA%\g2b-it-bid\config.json` 에만 저장됩니다.
> 개찰결과(전체 투찰자 명단) 조회는 인증키가 없어도 동작합니다. ([개찰결과 데이터 출처](#개찰결과--전체-투찰자-명단-데이터-출처) 참고)

## 소스로 직접 실행 / 빌드 (개발자용)

```bash
npm install
npm run build:exe   # 단일 EXE 빌드 → dist-exe/나라장터-IT입찰공고-검색기.exe (약 88MB, Node 내장)
                    # (배포 시 Releases 에는 narajangteo-searcher.exe 이름으로 업로드)
```

EXE 없이 폴더에서 바로 실행하려면(Node 20.19+ 필요):

```bash
npm install && npm run build && npm run app
```

- 또는 **`run.bat`** 더블클릭 → 의존성 자동 설치 후 실행

---

# 🤖 B. MCP 서버 (Claude 사용자용)

검색·필터·점수·검토메모를 Claude(Desktop/Code)가 대화로 처리합니다.

> ⚠️ **읽기 전용입니다.** 공고 탐색·분석·검토 메모 작성까지만 수행하며,
> 투찰 / 계약 체결 / 전자서명 / 로그인 대행 / 투찰 자동화는 **구현하지 않습니다.**

## 1. 이 MCP 서버가 하는 일

- 오늘/최근 올라온 IT 관련 입찰공고 검색 (용역 기본, 물품/공사/외자 확장)
- IT 키워드 자동 필터링 및 카테고리 분류(SI/웹/앱/유지보수/클라우드/AI/데이터/보안/ERP 등)
- IT 소기업 기준 100점 적합도 점수 + "바로 검토 / 조건 확인 후 검토 / 비추천" 분류
- 특정 공고 통합 상세조회(목록 + 기초금액 + 면허제한 + 참가지역 + 변경이력)
- 대표 의사결정용 입찰 검토 메모 자동 작성
- 마감 임박 공고 탐색, 키워드 감시

## 2. 설치

```bash
npm install
npm run build
```

요구사항: Node.js 20.19 이상.

## 3. 인증키 등록

1. [공공데이터포털 서비스 페이지](https://www.data.go.kr/data/15129394/openapi.do)에서 **활용신청**
2. 승인 후 발급되는 **일반 인증키** 확인 (Encoding / Decoding 두 형태 제공)
3. `.env.example` 을 복사해 `.env` 를 만들고 키 입력 (코드에 하드코딩 금지):

```
NARAJANGTEO_SERVICE_KEY=여기에_발급받은_인증키_입력
# Decoding 키(원본, % 없음)면 false, Encoding 키(% 포함)면 true. 미지정 시 % 포함 여부로 자동 판별.
NARAJANGTEO_SERVICE_KEY_IS_ENCODED=false
# G2B_API_PROTOCOL=https
```

> 💡 **이중 인코딩 주의**: 본 서버는 `serviceKey` 를 자동으로 1회만 인코딩합니다.
> `%` 가 포함된 **Encoding 키** 를 넣었다면 `NARAJANGTEO_SERVICE_KEY_IS_ENCODED=true`,
> `%` 가 없는 **Decoding 키(원본)** 를 넣었다면 `false` 로 설정하세요.

인증키가 없으면 도구 실행 시 명확한 한국어 오류를 반환합니다(빌드/도구목록은 키 없이도 동작).

### 개찰결과 — 전체 투찰자 명단 데이터 출처

> 🧾 **개찰결과의 전체 투찰자 명단은 나라장터 화면 데이터로 가져오며 인증키가 필요 없습니다.**
> 공식 OpenAPI(낙찰정보서비스 15129397)는 공고당 **개찰 1순위(낙찰예정자) 1개사**만 제공하므로,
> `get_bid_opening_result` 와 앱의 "개찰결과 분석" 탭은 **나라장터 통합검색 상세화면이 쓰는 내부 엔드포인트**를
> 재현해 **투찰자 전원**(2·3순위 포함)을 로그인 없이 가져옵니다.
>
> ⚠️ 이는 **공식 OpenAPI가 아니라 나라장터 내부 호출 재현**입니다(상용 입찰정보 서비스들과 동일 방식).
> 나라장터 개편 시 식별값이 바뀌면 깨질 수 있어(수정 용이) 쿠키·결과를 캐시하며 과도한 반복 호출은 피합니다.
> 폴백용 공식 OpenAPI(낙찰예정자)를 쓰려면 [낙찰정보서비스 활용신청](https://www.data.go.kr/data/15129397/openapi.do)이 별도로 필요합니다(같은 인증키).

## 4. MCP 클라이언트 연결 예시

### Claude Desktop (Windows)

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "g2b-it-bid": {
      "command": "node",
      "args": ["C:/path/to/narajangteo-searcher/build/index.js"],
      "env": {
        "NARAJANGTEO_SERVICE_KEY": "사용자_인증키",
        "NARAJANGTEO_SERVICE_KEY_IS_ENCODED": "true"
      }
    }
  }
}
```

### macOS / Linux

`~/Library/Application Support/Claude/claude_desktop_config.json` (mac) 또는 해당 설정 파일에 위와 동일한
형식으로 등록하되 `args` 경로만 `/path/to/narajangteo-searcher/build/index.js` 로 바꿉니다.

### Claude Code (CLI)

```bash
claude mcp add g2b-it-bid -- node /path/to/narajangteo-searcher/build/index.js
```

(환경변수는 셸 또는 `.env` 로 주입)

## 5. 사용 가능한 도구

| 도구 | 설명 |
|---|---|
| `search_it_bids` | IT 관련 입찰공고 검색 (기간/지역/예산/키워드 필터 + 추천순) |
| `get_bid_detail` | 특정 공고 통합 상세조회 (기초금액·면허제한·참가지역·변경이력 포함) |
| `get_bid_opening_result` | **개찰결과 조회** — 마감·개찰 완료된 공고의 **투찰 업체 전원**(순위·사업자등록번호·업체명·대표자명·투찰금액·투찰률·비고·투찰일시)을 나라장터에서 조회. 실패 시 공식 OpenAPI(낙찰예정자)로 자동 폴백 |
| `recommend_bids_for_small_it_company` | IT 소기업 적합도 점수 추천 + 분류 |
| `create_bid_review_memo` | 대표 의사결정용 9섹션 입찰 검토 메모 작성 |
| `find_deadline_urgent_bids` | 마감 임박(기본 72h) IT 공고 탐색 |
| `watch_keywords` | 키워드별 최근 공고 감시 + 중복 제거 |
| `call_raw_operation` | 25개 오퍼레이션 원시 호출 (검증/확장) |

## 6. 예시 질문

- "오늘 올라온 IT 관련 용역 공고 찾아줘"
- "이번 주 마감되는 소프트웨어 개발 사업 찾아줘"
- "우리 같은 IT 소기업이 들어갈 만한 공고만 골라줘"
- "기초금액 5천만 원 이상 2억 원 이하 공고만 찾아줘"
- "지역제한이 없는 전국 공고만 찾아줘"
- "마감이 3일 이내인 공고 중 참여 가능성이 높은 순서로 정리해줘"
- "R25BK00932003 공고 상세정보로 입찰 검토 메모 작성해줘"
- "20240516360 공고 개찰결과 보여줘"

---

## 보안 주의사항

- 인증키는 환경변수(또는 앱의 로컬 `config.json`)로만 주입하며 **코드/저장소에 포함하지 않습니다**(`.env` 는 `.gitignore` 대상).
- 인증키는 로그·응답·에러 메시지에 **마스킹되어 노출되지 않습니다**(URL 마스킹 적용).
- 본 도구는 **읽기 전용**입니다. 투찰/계약/전자서명/자동화 기능은 제공하지 않습니다.

## 나라장터 API 트래픽 주의

- **개발계정은 일 1,000 요청** 제한입니다(운영계정은 활용사례 등록 시 증가 가능).
- 동일 요청은 10분 메모리 캐시로 호출을 절약합니다.
- `get_bid_detail` / `create_bid_review_memo` 는 공고 1건당 보조 오퍼레이션까지 호출하므로(최대 4~5콜)
  트래픽 소모가 큽니다. 과도한 반복 호출은 피하세요.

## 개발 / 테스트

```bash
npm run dev     # tsx로 소스 직접 실행
npm test        # 단위 테스트 (scoring, normalizer) — 인증키 불필요
npm run build   # 빌드

npx @modelcontextprotocol/inspector node build/index.js   # 키 없이 도구 목록 확인
```

## 향후 확장 계획

- 물품/외자/공사 검색 고도화 및 세부품명번호 기반 필터
- 공고 변경 알림(주기적 폴링) 및 즐겨찾기
- 적합도 점수 가중치 사용자 설정
```
