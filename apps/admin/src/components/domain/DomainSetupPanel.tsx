'use client';

import { APEX_DOMAIN_NOTICE, buildDnsInstruction, DOMAIN_STATUS_LABELS, SSL_STATUS_LABELS, type DomainStatus, type SslStatus } from '@syt/shared';
import { buttonClass, cardClass } from '@syt/ui';
import { useState } from 'react';
import { Notice } from '@/components/ui/Notice';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TextInput } from '@/components/ui/fields';
import { domainTone, sslTone } from '@/lib/status';
import { DNSInstructionCard } from './DNSInstructionCard';

export interface DomainSetupPanelProps {
  platformRoot: string | null;
  lineHref: string;
  currentStatus: DomainStatus;
  currentSslStatus: SslStatus;
  lastCheckedLabel: string;
}

const EXAMPLE_DOMAIN = 'www.yourdomain.com';

export function DomainSetupPanel({ platformRoot, lineHref, currentStatus, currentSslStatus, lastCheckedLabel }: DomainSetupPanelProps) {
  const [value, setValue] = useState('');
  const instruction = buildDnsInstruction(value || EXAMPLE_DOMAIN, { cnameTarget: platformRoot, platformRoot });
  const lineIsExternal = /^https?:\/\//.test(lineHref);

  return (
    <div className="grid min-w-0 gap-6">
      <section className={`${cardClass} min-w-0`} aria-labelledby="add-domain-heading">
        <h2 id="add-domain-heading" className="text-lg font-bold text-ink">
          新增自訂網域
        </h2>
        <p className="mt-1 text-sm text-slate-gray">建議使用 www.yourdomain.com 這類 www 開頭的網址，設定最單純。</p>
        <form className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end" onSubmit={(event) => event.preventDefault()}>
          <TextInput
            label="網域"
            name="domain"
            id="custom-domain"
            placeholder={EXAMPLE_DOMAIN}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoComplete="off"
            inputMode="url"
            hint="輸入後下方會即時產生 DNS 設定指示"
          />
          <button type="submit" className={buttonClass('primary', 'md', 'w-full md:w-auto md:mb-6')} disabled title="自訂網域將於第三版開放">
            新增網域（第三版開放）
          </button>
        </form>
        {'error' in instruction && (
          <p role="alert" className="mt-2 text-sm text-danger-strong">
            {instruction.error}
          </p>
        )}
        {'kind' in instruction && instruction.kind === 'custom_apex' && (
          <div className="mt-3">
            <Notice tone="warning">{APEX_DOMAIN_NOTICE}</Notice>
          </div>
        )}
        {!value && <p className="mt-3 text-xs text-slate-gray">下方為 {EXAMPLE_DOMAIN} 的示範設定。</p>}
      </section>

      {'records' in instruction && <DNSInstructionCard instruction={instruction} />}

      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${cardClass} min-w-0`}>
          <p className="text-sm text-slate-gray">驗證狀態</p>
          <div className="mt-2">
            <StatusBadge tone={domainTone[currentStatus]}>{DOMAIN_STATUS_LABELS[currentStatus]}</StatusBadge>
          </div>
          <button type="button" className={buttonClass('secondary', 'sm', 'mt-4')} disabled>
            檢查 DNS（尚未串接）
          </button>
        </div>
        <div className={`${cardClass} min-w-0`}>
          <p className="text-sm text-slate-gray">SSL 憑證</p>
          <div className="mt-2">
            <StatusBadge tone={sslTone[currentSslStatus]}>{SSL_STATUS_LABELS[currentSslStatus]}</StatusBadge>
          </div>
          <p className="mt-4 text-xs text-slate-gray">驗證通過後會自動申請 SSL。最後檢查：{lastCheckedLabel}</p>
        </div>
        <div className={`${cardClass} min-w-0`}>
          <p className="text-sm text-slate-gray">設定遇到問題？</p>
          <p className="mt-2 text-sm text-ink">把網域商名稱與畫面截圖傳給客服，我們協助你設定。</p>
          <a
            href={lineHref}
            className={buttonClass('primary', 'sm', 'mt-4')}
            target={lineIsExternal ? '_blank' : undefined}
            rel={lineIsExternal ? 'noopener noreferrer' : undefined}
          >
            LINE@ 協助設定
          </a>
        </div>
      </div>
    </div>
  );
}
