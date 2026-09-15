'use client';

import type { PaymentProviderCardConfig } from '@syt/database';
import type { ProviderEnvironment } from '@syt/shared';
import { badgeClass, buttonClass, cardClass } from '@syt/ui';
import { useState } from 'react';
import { TextInput, ToggleField } from '@/components/ui/fields';

export function PaymentProviderCard({ config }: { config: PaymentProviderCardConfig }) {
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [environment, setEnvironment] = useState<ProviderEnvironment>(config.environment);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className={`${cardClass} flex min-w-0 flex-col`} aria-labelledby={`provider-${config.key}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`provider-${config.key}`} className="text-lg font-bold text-ink">
            {config.title}
          </h2>
          <p className="mt-1 text-sm text-slate-gray">{config.description}</p>
        </div>
        <span className={badgeClass(enabled ? 'success' : 'neutral')}>{enabled ? '已勾選啟用' : '未啟用'}</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${config.title} 付款方式`}>
        {config.methods.map((method) => (
          <li key={method} className={badgeClass('neutral')}>
            {method}
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-border-gray pt-4">
        <ToggleField
          label="啟用這個金流方式"
          description="勾選後才會顯示設定欄位；結帳頁只顯示已啟用的付款方式"
          name={`${config.key}-enabled`}
          id={`${config.key}-enabled`}
          checked={enabled}
          onChange={setEnabled}
        />
      </div>

      {enabled ? (
        <div className="mt-5 grid gap-4">
          {config.supportsEnvironment && (
            <fieldset className="min-w-0">
              <legend className="text-sm font-medium text-ink">環境</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['sandbox', 'production'] as const).map((env) => (
                  <label
                    key={env}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-button border px-3 text-sm ${
                      environment === env ? 'border-teal-strong bg-teal-soft text-teal-strong' : 'border-border-gray text-ink'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${config.key}-environment`}
                      value={env}
                      checked={environment === env}
                      onChange={() => setEnvironment(env)}
                      className="sr-only"
                    />
                    {env === 'sandbox' ? '測試（sandbox）' : '正式（production）'}
                  </label>
                ))}
              </div>
              {environment === 'production' && <p className="mt-2 text-xs text-warning-strong">正式環境需完成 sandbox 測試後，由 owner 在 staging 驗證再切換。</p>}
            </fieldset>
          )}

          {config.fields.map((field) => (
            <TextInput
              key={field.key}
              id={`${config.key}-${field.key}`}
              name={field.key}
              label={field.label}
              required={field.required}
              type={field.type === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder}
              hint={field.type === 'secret_ref' ? `${field.help ?? '只填參照名稱'}；格式：vault:名稱 或 env:名稱` : field.help}
              pattern={field.type === 'secret_ref' ? '^(vault|env):[A-Za-z0-9_./-]+$' : undefined}
              autoComplete="off"
              spellCheck={false}
            />
          ))}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" className={buttonClass('secondary', 'md', 'w-full sm:w-auto')} disabled title="Phase 1 尚未串接金流商">
              測試連線（尚未串接）
            </button>
            <button
              type="button"
              className={buttonClass('dark', 'md', 'w-full sm:w-auto')}
              onClick={() => setMessage('Phase 1 尚未連線資料庫，設定不會被儲存。')}
            >
              儲存設定
            </button>
          </div>
          {message && (
            <p role="status" className="text-sm text-warning-strong">
              {message}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-mist-white px-4 py-3 text-sm text-slate-gray">勾選啟用後顯示設定欄位。</p>
      )}
    </section>
  );
}
