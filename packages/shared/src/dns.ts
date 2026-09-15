/**
 * DNS 指示預覽（與 DB generate_dns_instruction() 同一套規則，DOMAIN_DNS_SPEC.md）。
 * 前端用來即時提示；正式驗證碼與紀錄以資料庫函式回傳為準。
 */

export type DomainKind = 'platform_subdomain' | 'custom_subdomain' | 'custom_apex';
export type DnsRecordType = 'CNAME' | 'TXT' | 'A' | 'ALIAS';

export interface DnsRecord {
  type: DnsRecordType;
  /** DNS 後台「名稱 / 主機」欄位要填的值（@ 代表根網域） */
  name: string;
  /** 完整主機名稱 */
  fqdn: string;
  value: string;
  ttl: string;
  purpose: 'routing' | 'ownership_verification' | 'recommended_www' | 'apex_alias';
  required: boolean;
  note?: string;
}

export type DomainClassification =
  | { ok: true; domain: string; kind: DomainKind; apexDomain: string; subdomainLabel: string | null }
  | { ok: false; error: string };

export interface DnsInstruction {
  domain: string;
  kind: DomainKind;
  apexDomain: string;
  recommendedDomain: string;
  records: DnsRecord[];
  warnings: string[];
}

const SECOND_LEVEL_SUFFIXES = new Set([
  'com.tw', 'org.tw', 'net.tw', 'edu.tw', 'gov.tw', 'idv.tw', 'game.tw', 'ebiz.tw', 'club.tw',
  'com.hk', 'org.hk', 'net.hk', 'com.cn', 'net.cn', 'org.cn', 'com.sg', 'com.my', 'co.jp', 'ne.jp', 'or.jp',
  'co.kr', 'co.uk', 'org.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.mo',
]);

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const APEX_DOMAIN_NOTICE = '根網域設定會因 DNS 服務商不同而不同，建議先使用 www 開頭的網址。';

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#:].*$/, '')
    .replace(/\.$/, '');
}

export function classifyDomain(input: string, platformRoot?: string | null): DomainClassification {
  const domain = normalizeDomain(input);
  if (!domain || domain.length > 253 || !DOMAIN_PATTERN.test(domain)) {
    return { ok: false, error: '網域格式不正確，請輸入像 www.yourdomain.com 的網址。' };
  }
  const labels = domain.split('.');
  const lastTwo = labels.slice(-2).join('.');
  const registrableLabels = SECOND_LEVEL_SUFFIXES.has(lastTwo) ? 3 : 2;
  if (labels.length < registrableLabels) {
    return { ok: false, error: '請輸入完整網域，例如 www.yourdomain.com.tw。' };
  }

  const root = platformRoot ? normalizeDomain(platformRoot) : '';
  if (root && domain.endsWith(`.${root}`)) {
    return { ok: true, domain, kind: 'platform_subdomain', apexDomain: root, subdomainLabel: domain.slice(0, -(root.length + 1)) };
  }

  const apexDomain = labels.slice(-registrableLabels).join('.');
  if (labels.length === registrableLabels) {
    return { ok: true, domain, kind: 'custom_apex', apexDomain, subdomainLabel: null };
  }
  return { ok: true, domain, kind: 'custom_subdomain', apexDomain, subdomainLabel: labels.slice(0, -registrableLabels).join('.') };
}

export interface DnsInstructionOptions {
  /** 平台 CNAME 目標，來自 PLATFORM_SUBDOMAIN_ROOT；未設定時顯示占位文字 */
  cnameTarget?: string | null;
  verificationToken?: string | null;
  txtPrefix?: string;
  platformRoot?: string | null;
}

export function buildDnsInstruction(input: string, options: DnsInstructionOptions = {}): DnsInstruction | { error: string } {
  const classified = classifyDomain(input, options.platformRoot);
  if (!classified.ok) {
    return { error: classified.error };
  }
  const target = options.cnameTarget || '（平台 CNAME 目標尚未設定）';
  const token = options.verificationToken || '（新增網域後產生驗證碼）';
  const txtPrefix = options.txtPrefix ?? '_syt-verify';
  const { domain, kind, apexDomain, subdomainLabel } = classified;

  if (kind === 'platform_subdomain') {
    return { domain, kind, apexDomain, recommendedDomain: domain, records: [], warnings: ['這是森映平台子網域，不需要設定 DNS。'] };
  }

  if (kind === 'custom_subdomain' && subdomainLabel) {
    return {
      domain,
      kind,
      apexDomain,
      recommendedDomain: domain,
      records: [
        { type: 'CNAME', name: subdomainLabel, fqdn: domain, value: target, ttl: 'Auto', purpose: 'routing', required: true },
        {
          type: 'TXT',
          name: `${txtPrefix}.${subdomainLabel}`,
          fqdn: `${txtPrefix}.${domain}`,
          value: token,
          ttl: 'Auto',
          purpose: 'ownership_verification',
          required: true,
        },
      ],
      warnings: ['請勿刪除既有的 MX 記錄，否則 Email 可能收不到信。'],
    };
  }

  return {
    domain,
    kind,
    apexDomain,
    recommendedDomain: `www.${apexDomain}`,
    records: [
      { type: 'CNAME', name: 'www', fqdn: `www.${apexDomain}`, value: target, ttl: 'Auto', purpose: 'recommended_www', required: false, note: '建議使用 www 網址' },
      {
        type: 'ALIAS',
        name: '@',
        fqdn: apexDomain,
        value: target,
        ttl: 'Auto',
        purpose: 'apex_alias',
        required: false,
        note: 'DNS 服務商支援 ALIAS / ANAME / CNAME Flattening 時才使用',
      },
      { type: 'TXT', name: txtPrefix, fqdn: `${txtPrefix}.${apexDomain}`, value: token, ttl: 'Auto', purpose: 'ownership_verification', required: true },
    ],
    warnings: [APEX_DOMAIN_NOTICE, '根網域不可設定一般 CNAME，會與 MX、NS 記錄衝突。', '請勿刪除既有的 MX 記錄，否則 Email 可能收不到信。'],
  };
}
