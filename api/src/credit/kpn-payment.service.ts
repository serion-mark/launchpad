import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface KpnPrepareResult {
  mxId: string;
  mxIssueNo: string;
  mxIssueDate: string;
  callHash: string;
  amount: number;
  orderName: string;
}

export interface KpnApprovalResponse {
  replyCode: string;
  replyMessage: string;
  tid?: string;
  amount?: string;
  [key: string]: any;
}

export interface KpnCancelResponse {
  replyCode: string;
  replyMessage: string;
  [key: string]: any;
}

@Injectable()
export class KpnPaymentService {
  private readonly logger = new Logger(KpnPaymentService.name);
  private readonly mxId: string;
  private readonly passKey: string;
  private readonly endpoint: string;

  constructor() {
    this.mxId = process.env.KPN_MX_ID || 'testcorp';
    this.passKey = process.env.KPN_PASS_KEY || '';
    this.endpoint = process.env.KPN_ENDPOINT || 'https://dev.firstpay.co.kr';
  }

  /** SHA256 해시 생성 */
  private sha256(message: string): string {
    return createHash('sha256').update(message, 'utf8').digest('hex');
  }

  /** 결제창 호출용 callHash: SHA256(mxId + mxIssueNo + amount + passKey) */
  generatePaymentCallHash(mxIssueNo: string, amount: number): string {
    return this.sha256(`${this.mxId}${mxIssueNo}${amount}${this.passKey}`);
  }

  /** 승인 요청용 callHash: SHA256(mxId + mxIssueNo + passKey) — amount 없음! */
  generateApprovalCallHash(mxIssueNo: string): string {
    return this.sha256(`${this.mxId}${mxIssueNo}${this.passKey}`);
  }

  /** 취소 요청용 callHash: SHA256(mxId + mxIssueNo + amount + passKey) */
  generateCancelCallHash(mxIssueNo: string, amount: number): string {
    return this.sha256(`${this.mxId}${mxIssueNo}${amount}${this.passKey}`);
  }

  /** 주문번호 + callHash 생성 (프론트에서 SDK 호출에 사용) */
  prepare(packageId: string, amount: number, orderName: string): KpnPrepareResult {
    const now = new Date();
    const mxIssueDate = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const mxIssueNo = `credit-${packageId}-${Date.now()}`;
    const callHash = this.generatePaymentCallHash(mxIssueNo, amount);

    this.logger.log(`KPN prepare: mxIssueNo=${mxIssueNo}, amount=${amount}`);

    return {
      mxId: this.mxId,
      mxIssueNo,
      mxIssueDate,
      callHash,
      amount,
      orderName,
    };
  }

  /** KPN 승인 API 호출 */
  async confirmPayment(params: {
    mxIssueNo: string;
    fdTid: string;
    approvalUrl: string;
  }): Promise<KpnApprovalResponse> {
    const { mxIssueNo, fdTid, approvalUrl } = params;
    const callHash = this.generateApprovalCallHash(mxIssueNo);

    this.logger.log(`KPN 승인 요청: mxIssueNo=${mxIssueNo}, fdTid=${fdTid}, url=${approvalUrl}`);

    const res = await fetch(approvalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mxId: this.mxId,
        mxIssueNo,
        fdTid,
        callHash,
      }),
    });

    const data = await res.json();
    this.logger.log(`KPN 승인 응답: ${JSON.stringify(data)}`);

    return data;
  }

  /** KPN 취소 API 호출 */
  async cancelPayment(params: {
    payMethod: string;
    mxIssueNo: string;
    mxIssueDate: string;
    amount: number;
  }): Promise<KpnCancelResponse> {
    const { payMethod, mxIssueNo, mxIssueDate, amount } = params;
    const callHash = this.generateCancelCallHash(mxIssueNo, amount);

    this.logger.log(`KPN 취소 요청: mxIssueNo=${mxIssueNo}, amount=${amount}`);

    const res = await fetch(`${this.endpoint}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payMethod,
        mxId: this.mxId,
        mxIssueNo,
        mxIssueDate,
        amount,
        callHash,
      }),
    });

    const data = await res.json();
    this.logger.log(`KPN 취소 응답: ${JSON.stringify(data)}`);

    return data;
  }
}
