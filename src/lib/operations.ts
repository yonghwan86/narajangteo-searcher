/**
 * 나라장터 입찰공고정보서비스(BidPublicInfoService) 오퍼레이션 스펙 테이블
 * 참고문서: 조달청_OpenAPI참고자료_나라장터_입찰공고정보서비스_1.2.docx
 *
 * paramSet:
 *  - 'list'    : inqryDiv(1:등록/2:공고번호/3:변경일시) + 기간 + bidNtceNo
 *  - 'ppsSrch' : 나라장터 검색조건 (지역/예산/업종 등 서버측 필터)
 *  - 'aux'     : 보조정보 (목록 패턴과 동일하나 의미만 다름)
 */

import type { ServiceId } from "../config.js"

export type ParamSet = "list" | "ppsSrch" | "aux"

export interface OperationSpec {
  /** 오퍼레이션 영문명 (URL path segment) */
  name: string
  /** 국문 설명 */
  korNm: string
  /** 요청 파라미터 패턴 */
  paramSet: ParamSet
  /** 업무구분 (해당되는 경우) */
  business?: "물품" | "용역" | "공사" | "외자" | "기타"
  /** inqryDiv 의미 설명 (도구/문서용) */
  inqryDivDesc?: string
  /** 소속 API 서비스 (미지정 시 입찰공고정보서비스 'bid') */
  service?: ServiceId
}

export const OPERATIONS: OperationSpec[] = [
  // === 목록 조회 (업무구분별) ===
  { name: "getBidPblancListInfoCnstwk", korNm: "입찰공고목록 정보에 대한 공사조회", paramSet: "list", business: "공사", inqryDivDesc: "1:등록일시, 2:입찰공고번호, 3:변경일시" },
  { name: "getBidPblancListInfoServc", korNm: "입찰공고목록 정보에 대한 용역조회", paramSet: "list", business: "용역", inqryDivDesc: "1:등록일시, 2:입찰공고번호, 3:변경일시" },
  { name: "getBidPblancListInfoFrgcpt", korNm: "입찰공고목록 정보에 대한 외자조회", paramSet: "list", business: "외자", inqryDivDesc: "1:등록일시, 2:입찰공고번호, 3:변경일시" },
  { name: "getBidPblancListInfoThng", korNm: "입찰공고목록 정보에 대한 물품조회", paramSet: "list", business: "물품", inqryDivDesc: "1:등록일시, 2:입찰공고번호, 3:변경일시" },

  // === 기초금액 조회 ===
  { name: "getBidPblancListInfoThngBsisAmount", korNm: "입찰공고목록 정보에 대한 물품기초금액조회", paramSet: "aux", business: "물품", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoCnstwkBsisAmount", korNm: "입찰공고목록 정보에 대한 공사기초금액조회", paramSet: "aux", business: "공사", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoServcBsisAmount", korNm: "입찰공고목록 정보에 대한 용역기초금액조회", paramSet: "aux", business: "용역", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },

  // === 변경이력 조회 ===
  { name: "getBidPblancListInfoChgHstryThng", korNm: "입찰공고목록 정보에 대한 물품변경이력조회", paramSet: "aux", business: "물품", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoChgHstryCnstwk", korNm: "입찰공고목록 정보에 대한 공사변경이력조회", paramSet: "aux", business: "공사", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoChgHstryServc", korNm: "입찰공고목록 정보에 대한 용역변경이력조회", paramSet: "aux", business: "용역", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },

  // === 나라장터 검색조건 조회 (PPSSrch) ===
  { name: "getBidPblancListInfoCnstwkPPSSrch", korNm: "나라장터검색조건에 의한 입찰공고공사조회", paramSet: "ppsSrch", business: "공사", inqryDivDesc: "1:공고게시일시, 2:개찰일시" },
  { name: "getBidPblancListInfoServcPPSSrch", korNm: "나라장터검색조건에 의한 입찰공고용역조회", paramSet: "ppsSrch", business: "용역", inqryDivDesc: "1:공고게시일시, 2:개찰일시" },
  { name: "getBidPblancListInfoFrgcptPPSSrch", korNm: "나라장터검색조건에 의한 입찰공고외자조회", paramSet: "ppsSrch", business: "외자", inqryDivDesc: "1:공고게시일시, 2:개찰일시" },
  { name: "getBidPblancListInfoThngPPSSrch", korNm: "나라장터검색조건에 의한 입찰공고물품조회", paramSet: "ppsSrch", business: "물품", inqryDivDesc: "1:공고게시일시, 2:개찰일시" },

  // === 부가 정보 조회 ===
  { name: "getBidPblancListInfoLicenseLimit", korNm: "입찰공고목록 정보에 대한 면허제한정보조회", paramSet: "aux", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoPrtcptPsblRgn", korNm: "입찰공고목록 정보에 대한 참가가능지역정보조회", paramSet: "aux", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoThngPurchsObjPrdct", korNm: "입찰공고목록 정보에 대한 물품 구매대상물품조회", paramSet: "aux", business: "물품", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoServcPurchsObjPrdct", korNm: "입찰공고목록 정보에 대한 용역 구매대상물품조회", paramSet: "aux", business: "용역", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoFrgcptPurchsObjPrdct", korNm: "입찰공고목록 정보에 대한 외자 구매대상물품조회", paramSet: "aux", business: "외자", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoEorderAtchFileInfo", korNm: "입찰공고목록 정보에 대한 e발주 첨부파일정보조회", paramSet: "aux", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListInfoEtc", korNm: "입찰공고목록 정보에 대한 기타공고조회", paramSet: "list", business: "기타", inqryDivDesc: "1:등록일시, 2:입찰공고번호, 3:변경일시" },
  { name: "getBidPblancListInfoEtcPPSSrch", korNm: "나라장터검색조건에 의한 입찰공고기타조회", paramSet: "ppsSrch", business: "기타", inqryDivDesc: "1:공고게시일시, 2:개찰일시" },
  { name: "getBidPblancListPPIFnlRfpIssAtchFileInfo", korNm: "입찰공고목록 정보에 대한 혁신장터 최종제안요청서 교부 첨부파일정보조회", paramSet: "aux", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListBidPrceCalclAInfo", korNm: "입찰공고목록 정보에 대한 입찰가격산식A정보조회", paramSet: "aux", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },
  { name: "getBidPblancListEvaluationIndstrytyMfrcInfo", korNm: "입찰공고목록 정보에 대한 평가대상주력분야 조회", paramSet: "aux", inqryDivDesc: "1:입력일시, 2:입찰공고번호" },

  // === 낙찰정보서비스 (ScsbidInfoService, 15129397) — 개찰결과 목록 (투찰자 전원: 사업자번호·업체명·투찰금액·투찰률) ===
  { name: "getOpengResultListInfoServc", korNm: "개찰결과 목록 정보에 대한 용역조회", paramSet: "aux", business: "용역", service: "scsbid", inqryDivDesc: "1:개찰일시, 2:입찰공고번호" },
  { name: "getOpengResultListInfoThng", korNm: "개찰결과 목록 정보에 대한 물품조회", paramSet: "aux", business: "물품", service: "scsbid", inqryDivDesc: "1:개찰일시, 2:입찰공고번호" },
  { name: "getOpengResultListInfoCnstwk", korNm: "개찰결과 목록 정보에 대한 공사조회", paramSet: "aux", business: "공사", service: "scsbid", inqryDivDesc: "1:개찰일시, 2:입찰공고번호" },
  { name: "getOpengResultListInfoFrgcpt", korNm: "개찰결과 목록 정보에 대한 외자조회", paramSet: "aux", business: "외자", service: "scsbid", inqryDivDesc: "1:개찰일시, 2:입찰공고번호" },

  // === 낙찰정보서비스 — 낙찰자 현황 (최종 낙찰자만) ===
  { name: "getScsbidListSttusServc", korNm: "낙찰자 정보에 대한 용역조회", paramSet: "aux", business: "용역", service: "scsbid", inqryDivDesc: "1:개찰일시, 2:입찰공고번호" },
  { name: "getScsbidListSttusThng", korNm: "낙찰자 정보에 대한 물품조회", paramSet: "aux", business: "물품", service: "scsbid", inqryDivDesc: "1:개찰일시, 2:입찰공고번호" },
  { name: "getScsbidListSttusCnstwk", korNm: "낙찰자 정보에 대한 공사조회", paramSet: "aux", business: "공사", service: "scsbid", inqryDivDesc: "1:개찰일시, 2:입찰공고번호" },
  { name: "getScsbidListSttusFrgcpt", korNm: "낙찰자 정보에 대한 외자조회", paramSet: "aux", business: "외자", service: "scsbid", inqryDivDesc: "1:개찰일시, 2:입찰공고번호" },
]

/** 오퍼레이션명 → 스펙 조회용 Map */
export const OPERATION_MAP = new Map<string, OperationSpec>(OPERATIONS.map((op) => [op.name, op]))

/** 업무구분별 목록 조회 오퍼레이션 (search_it_bids 기본 = 용역) */
export const LIST_OP_BY_BUSINESS: Record<string, string> = {
  용역: "getBidPblancListInfoServc",
  물품: "getBidPblancListInfoThng",
  공사: "getBidPblancListInfoCnstwk",
  외자: "getBidPblancListInfoFrgcpt",
  기타: "getBidPblancListInfoEtc",
}

/** 업무구분별 PPSSrch(검색조건) 오퍼레이션 */
export const PPSSRCH_OP_BY_BUSINESS: Record<string, string> = {
  용역: "getBidPblancListInfoServcPPSSrch",
  물품: "getBidPblancListInfoThngPPSSrch",
  공사: "getBidPblancListInfoCnstwkPPSSrch",
  외자: "getBidPblancListInfoFrgcptPPSSrch",
  기타: "getBidPblancListInfoEtcPPSSrch",
}

/** 업무구분별 기초금액 오퍼레이션 (외자/기타는 없음) */
export const BSIS_AMOUNT_OP_BY_BUSINESS: Record<string, string | undefined> = {
  용역: "getBidPblancListInfoServcBsisAmount",
  물품: "getBidPblancListInfoThngBsisAmount",
  공사: "getBidPblancListInfoCnstwkBsisAmount",
}

/** 업무구분별 변경이력 오퍼레이션 */
export const CHG_HSTRY_OP_BY_BUSINESS: Record<string, string | undefined> = {
  용역: "getBidPblancListInfoChgHstryServc",
  물품: "getBidPblancListInfoChgHstryThng",
  공사: "getBidPblancListInfoChgHstryCnstwk",
}

/** 업무구분별 개찰결과 목록 오퍼레이션 (낙찰정보서비스, 투찰자 전원) */
export const OPENG_RESULT_OP_BY_BUSINESS: Record<string, string | undefined> = {
  용역: "getOpengResultListInfoServc",
  물품: "getOpengResultListInfoThng",
  공사: "getOpengResultListInfoCnstwk",
  외자: "getOpengResultListInfoFrgcpt",
}

/** 업무구분별 낙찰자 현황 오퍼레이션 (낙찰정보서비스, 최종 낙찰자) */
export const SCSBID_STTUS_OP_BY_BUSINESS: Record<string, string | undefined> = {
  용역: "getScsbidListSttusServc",
  물품: "getScsbidListSttusThng",
  공사: "getScsbidListSttusCnstwk",
  외자: "getScsbidListSttusFrgcpt",
}
