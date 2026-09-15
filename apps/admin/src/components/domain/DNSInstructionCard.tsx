import type { DnsInstruction, DnsRecord } from '@syt/shared';
import { badgeClass, cardClass } from '@syt/ui';
import { CopyButton } from '@/components/ui/CopyButton';

const PURPOSE_LABELS: Record<DnsRecord['purpose'], string> = {
  routing: '把網址指向森映平台',
  ownership_verification: '驗證你擁有這個網域',
  recommended_www: '建議使用的 www 網址',
  apex_alias: '根網域（依 DNS 服務商支援度）',
};

function RecordField({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const isPlaceholder = value.startsWith('（');
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-gray">{label}</dt>
      <dd className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
        <code className="break-all font-mono text-sm text-ink">{value}</code>
        {copy && <CopyButton value={value} label="複製" disabled={isPlaceholder} />}
      </dd>
    </div>
  );
}

export function DNSInstructionCard({ instruction }: { instruction: DnsInstruction }) {
  return (
    <section className={`${cardClass} min-w-0`} aria-labelledby="dns-instruction-heading">
      <h2 id="dns-instruction-heading" className="text-lg font-bold text-ink">
        請到你的網域 DNS 後台新增以下紀錄
      </h2>
      <p className="mt-1 break-words text-sm text-slate-gray">
        網域：<span className="font-mono text-ink">{instruction.domain}</span>
        <span className="mx-2" aria-hidden="true">
          ・
        </span>
        建議使用：<span className="font-mono text-ink">{instruction.recommendedDomain}</span>
      </p>

      {instruction.records.length === 0 ? (
        <p className="mt-4 rounded-xl bg-mist-white px-4 py-3 text-sm text-ink">這是森映平台子網域，不需要設定 DNS。</p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {instruction.records.map((record) => (
            <li key={`${record.type}-${record.name}`} className="rounded-xl border border-border-gray p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={badgeClass('dark')}>{record.type}</span>
                <span className={badgeClass(record.required ? 'teal' : 'neutral')}>{record.required ? '必填' : '選用'}</span>
                <span className="text-sm text-slate-gray">{PURPOSE_LABELS[record.purpose]}</span>
              </div>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,0.4fr)]">
                <RecordField label="Type" value={record.type} />
                <RecordField label="Name" value={record.name} copy />
                <RecordField label="Target / Value" value={record.value} copy />
                <RecordField label="TTL" value={record.ttl} />
              </dl>
              {record.note && <p className="mt-2 text-xs text-slate-gray">{record.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {instruction.warnings.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {instruction.warnings.map((warning) => (
            <li key={warning} className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-ink">
              {warning}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
