import { useState, useEffect } from 'react'
import { Field, inputClass } from '../components/form'
import { Toggle } from '../components/Toggle'
import { GuardsSection, CRYPTO_GUARD_TYPES, SECURITIES_GUARD_TYPES } from '../components/guards'
import { SDKSelector, PLATFORM_TYPE_OPTIONS } from '../components/SDKSelector'
import { ReconnectButton } from '../components/ReconnectButton'
import { useTradingConfig } from '../hooks/useTradingConfig'
import type { PlatformConfig, CcxtPlatformConfig, AlpacaPlatformConfig, AccountConfig } from '../api/types'

// ==================== Panel state ====================

type PanelState =
  | { kind: 'account'; accountId: string; tab: 'account' | 'platform' }
  | { kind: 'add-platform' }
  | { kind: 'add-account' }
  | null

// ==================== Page ====================

export function TradingPage() {
  const tc = useTradingConfig()
  const [panel, setPanel] = useState<PanelState>(null)

  // Close panel if the selected item was deleted
  useEffect(() => {
    if (panel?.kind === 'account') {
      if (!tc.accounts.some((a) => a.id === panel.accountId)) setPanel(null)
    }
  }, [tc.accounts, panel])

  if (tc.loading) return <PageShell subtitle="Loading..." />
  if (tc.error) {
    return (
      <PageShell subtitle="Failed to load trading configuration.">
        <p className="text-[13px] text-red">{tc.error}</p>
        <button onClick={tc.refresh} className="mt-2 px-3 py-1.5 text-[13px] font-medium rounded-md border border-border hover:bg-bg-tertiary transition-colors">
          Retry
        </button>
      </PageShell>
    )
  }

  const getPlatform = (platformId: string) => tc.platforms.find((p) => p.id === platformId)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="shrink-0 border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <h2 className="text-base font-semibold text-text">Trading</h2>
          <p className="text-[12px] text-text-muted mt-1">Configure platforms and trading accounts.</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="max-w-[720px] space-y-6">
          {/* Platforms bar */}
          <PlatformsBar
            platforms={tc.platforms}
            onClickPlatform={(id) => {
              // Find first account on this platform to open its panel
              const acct = tc.accounts.find((a) => a.platformId === id)
              if (acct) setPanel({ kind: 'account', accountId: acct.id, tab: 'platform' })
            }}
            onAdd={() => setPanel({ kind: 'add-platform' })}
          />

          {/* Accounts table */}
          <AccountsTable
            accounts={tc.accounts}
            platforms={tc.platforms}
            selectedId={panel?.kind === 'account' ? panel.accountId : null}
            onSelect={(id) => setPanel({ kind: 'account', accountId: id, tab: 'account' })}
          />

          {/* Add Account button */}
          {tc.platforms.length > 0 && (
            <button
              onClick={() => setPanel({ kind: 'add-account' })}
              className="text-[12px] text-text-muted hover:text-text transition-colors"
            >
              + Add Account
            </button>
          )}
        </div>
      </div>

      {/* Slide panel */}
      <SlidePanel open={panel !== null} onClose={() => setPanel(null)}>
        {panel?.kind === 'account' && (() => {
          const account = tc.accounts.find((a) => a.id === panel.accountId)
          const platform = account ? getPlatform(account.platformId) : undefined
          if (!account || !platform) return null
          return (
            <PanelAccountView
              account={account}
              platform={platform}
              tab={panel.tab}
              onTabChange={(tab) => setPanel({ ...panel, tab })}
              onSaveAccount={tc.saveAccount}
              onDeleteAccount={async (id) => { await tc.deleteAccount(id); setPanel(null) }}
              onSavePlatform={tc.savePlatform}
              onDeletePlatform={async (id) => { await tc.deletePlatform(id); setPanel(null) }}
              onClose={() => setPanel(null)}
            />
          )
        })()}

        {panel?.kind === 'add-platform' && (
          <PanelAddPlatform
            existingIds={tc.platforms.map((p) => p.id)}
            onSave={async (p) => { await tc.savePlatform(p); setPanel(null) }}
            onClose={() => setPanel(null)}
          />
        )}

        {panel?.kind === 'add-account' && (
          <PanelAddAccount
            platforms={tc.platforms}
            existingIds={tc.accounts.map((a) => a.id)}
            onSave={async (a) => { await tc.saveAccount(a); setPanel(null) }}
            onClose={() => setPanel(null)}
          />
        )}
      </SlidePanel>
    </div>
  )
}

// ==================== Page Shell (loading/error) ====================

function PageShell({ subtitle, children }: { subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <h2 className="text-base font-semibold text-text">Trading</h2>
          <p className="text-[12px] text-text-muted mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">{children}</div>
    </div>
  )
}

// ==================== Platforms Bar ====================

function PlatformsBar({ platforms, onClickPlatform, onAdd }: {
  platforms: PlatformConfig[]
  onClickPlatform: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[12px] text-text-muted mr-1">Platforms</span>
      {platforms.map((p) => {
        const badge = p.type === 'ccxt'
          ? { text: 'CC', color: 'text-accent bg-accent/10 border-accent/20' }
          : { text: 'AL', color: 'text-green bg-green/10 border-green/20' }
        return (
          <button
            key={p.id}
            onClick={() => onClickPlatform(p.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[12px] hover:bg-bg-tertiary/50 transition-colors ${badge.color}`}
          >
            <span className="font-bold">{badge.text}</span>
            <span className="text-text">{p.id}</span>
          </button>
        )
      })}
      <button
        onClick={onAdd}
        className="px-2.5 py-1 rounded-md border border-dashed border-border text-[12px] text-text-muted hover:text-text hover:border-text-muted/40 transition-colors"
      >
        + Add
      </button>
    </div>
  )
}

// ==================== Accounts Table ====================

function AccountsTable({ accounts, platforms, selectedId, onSelect }: {
  accounts: AccountConfig[]
  platforms: PlatformConfig[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const getPlatform = (platformId: string) => platforms.find((p) => p.id === platformId)

  const getDetail = (account: AccountConfig) => {
    const p = getPlatform(account.platformId)
    if (!p) return '?'
    if (p.type === 'ccxt') return p.exchange
    return p.paper ? 'paper' : 'live'
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-[13px] text-text-muted">No accounts configured.</p>
        <p className="text-[11px] text-text-muted/60 mt-1">Add a platform first, then create accounts.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-bg-secondary/50 text-text-muted text-[11px] uppercase tracking-wider">
            <th className="text-left px-4 py-2.5 font-medium">Account</th>
            <th className="text-left px-4 py-2.5 font-medium">Platform</th>
            <th className="text-left px-4 py-2.5 font-medium">Detail</th>
            <th className="text-left px-4 py-2.5 font-medium">Guards</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((account) => {
            const p = getPlatform(account.platformId)
            const isSelected = account.id === selectedId
            const badge = p?.type === 'ccxt'
              ? { text: 'CC', color: 'text-accent bg-accent/10' }
              : { text: 'AL', color: 'text-green bg-green/10' }

            return (
              <tr
                key={account.id}
                onClick={() => onSelect(account.id)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-accent/5'
                    : 'hover:bg-bg-tertiary/30'
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-text">{account.id}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}>
                    {badge.text}
                  </span>
                  <span className="text-text-muted ml-1.5">{p?.type === 'ccxt' ? 'CCXT' : 'Alpaca'}</span>
                </td>
                <td className="px-4 py-2.5 text-text-muted">{getDetail(account)}</td>
                <td className="px-4 py-2.5 text-text-muted">
                  {account.guards.length > 0 ? `${account.guards.length} guard${account.guards.length > 1 ? 's' : ''}` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ==================== Slide Panel ====================

function SlidePanel({ open, onClose, children }: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-bg border-l border-border z-50 flex flex-col
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {children}
      </div>
    </>
  )
}

// ==================== Panel: Account View (tabs) ====================

interface PanelAccountViewProps {
  account: AccountConfig
  platform: PlatformConfig
  tab: 'account' | 'platform'
  onTabChange: (tab: 'account' | 'platform') => void
  onSaveAccount: (a: AccountConfig) => Promise<void>
  onDeleteAccount: (id: string) => Promise<void>
  onSavePlatform: (p: PlatformConfig) => Promise<void>
  onDeletePlatform: (id: string) => Promise<void>
  onClose: () => void
}

function PanelAccountView({
  account, platform, tab, onTabChange,
  onSaveAccount, onDeleteAccount,
  onSavePlatform, onDeletePlatform,
  onClose,
}: PanelAccountViewProps) {
  return (
    <>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-[14px] font-semibold text-text truncate">{account.id}</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text p-1 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-border">
        {(['account', 'platform'] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex-1 py-2 text-[12px] font-medium transition-colors ${
              tab === t
                ? 'text-text border-b-2 border-accent'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {t === 'account' ? 'Account' : 'Platform'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'account' ? (
          <PanelAccountTab
            account={account}
            platformType={platform.type}
            onSave={onSaveAccount}
            onDelete={onDeleteAccount}
          />
        ) : (
          <PanelPlatformTab
            platform={platform}
            onSave={onSavePlatform}
            onDelete={onDeletePlatform}
          />
        )}
      </div>
    </>
  )
}

// ==================== Panel: Account Tab ====================

function PanelAccountTab({ account, platformType, onSave, onDelete }: {
  account: AccountConfig
  platformType: 'ccxt' | 'alpaca'
  onSave: (a: AccountConfig) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(account)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [guardsOpen, setGuardsOpen] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(account)

  // Sync draft when account changes externally
  useEffect(() => { setDraft(account) }, [account])

  const patchField = (field: keyof AccountConfig, value: unknown) => {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      await onSave(draft)
      setMsg('Saved')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const guardTypes = platformType === 'ccxt' ? CRYPTO_GUARD_TYPES : SECURITIES_GUARD_TYPES

  return (
    <div className="space-y-4">
      {/* Credentials */}
      <Field label="API Key">
        <input
          className={inputClass}
          type="password"
          value={draft.apiKey || ''}
          onChange={(e) => patchField('apiKey', e.target.value)}
          placeholder="Not configured"
        />
      </Field>
      <Field label={platformType === 'alpaca' ? 'Secret Key' : 'API Secret'}>
        <input
          className={inputClass}
          type="password"
          value={draft.apiSecret || ''}
          onChange={(e) => patchField('apiSecret', e.target.value)}
          placeholder="Not configured"
        />
      </Field>
      {platformType === 'ccxt' && (
        <Field label="Password (optional)">
          <input
            className={inputClass}
            type="password"
            value={draft.password || ''}
            onChange={(e) => patchField('password', e.target.value)}
            placeholder="Required by some exchanges (e.g. OKX)"
          />
        </Field>
      )}

      {/* Guards */}
      <div className="border-t border-border pt-3">
        <button
          onClick={() => setGuardsOpen(!guardsOpen)}
          className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text transition-colors"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-150 ${guardsOpen ? 'rotate-90' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Guards ({draft.guards.length})
        </button>
        {guardsOpen && (
          <div className="mt-2">
            <GuardsSection
              guards={draft.guards}
              guardTypes={guardTypes}
              description="Guards validate operations before execution. Order matters."
              onChange={(guards) => patchField('guards', guards)}
              onChangeImmediate={(guards) => patchField('guards', guards)}
            />
          </div>
        )}
      </div>

      {/* Save + Reconnect */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center gap-3">
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {msg && <span className="text-[12px] text-text-muted">{msg}</span>}
        </div>
        <ReconnectButton accountId={account.id} />
      </div>

      {/* Delete */}
      <div className="border-t border-border pt-3">
        <DeleteButton label="Delete Account" onConfirm={() => onDelete(account.id)} />
      </div>
    </div>
  )
}

// ==================== Panel: Platform Tab ====================

function PanelPlatformTab({ platform, onSave, onDelete }: {
  platform: PlatformConfig
  onSave: (p: PlatformConfig) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-text-muted">
        Platform: <span className="text-text font-medium">{platform.id}</span>
      </p>

      {platform.type === 'ccxt' ? (
        <CcxtPlatformFields platform={platform} onSave={onSave} />
      ) : (
        <AlpacaPlatformFields platform={platform} onSave={onSave} />
      )}

      <div className="border-t border-border pt-3">
        <DeleteButton label="Delete Platform" onConfirm={() => onDelete(platform.id)} />
      </div>
    </div>
  )
}

// ==================== CCXT Platform Fields ====================

function CcxtPlatformFields({ platform, onSave }: { platform: CcxtPlatformConfig; onSave: (p: PlatformConfig) => Promise<void> }) {
  const [draft, setDraft] = useState(platform)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(platform)

  useEffect(() => { setDraft(platform) }, [platform])

  const patch = (field: string, value: unknown) => {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      await onSave(draft)
      setMsg('Saved')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Exchange">
        <input className={inputClass} value={draft.exchange} onChange={(e) => patch('exchange', e.target.value.trim())} placeholder="binance" />
      </Field>
      <Field label="Market Type">
        <select className={inputClass} value={draft.defaultMarketType} onChange={(e) => patch('defaultMarketType', e.target.value)}>
          <option value="swap">Perpetual Swap</option>
          <option value="spot">Spot</option>
        </select>
      </Field>
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Toggle checked={draft.sandbox} onChange={(v) => patch('sandbox', v)} />
          <span className="text-[13px] text-text">Sandbox Mode</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Toggle checked={draft.demoTrading} onChange={(v) => patch('demoTrading', v)} />
          <span className="text-[13px] text-text">Demo Trading</span>
        </label>
      </div>
      {dirty && (
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Platform'}
          </button>
          {msg && <span className="text-[12px] text-text-muted">{msg}</span>}
        </div>
      )}
    </div>
  )
}

// ==================== Alpaca Platform Fields ====================

function AlpacaPlatformFields({ platform, onSave }: { platform: AlpacaPlatformConfig; onSave: (p: PlatformConfig) => Promise<void> }) {
  const [draft, setDraft] = useState(platform)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(platform)

  useEffect(() => { setDraft(platform) }, [platform])

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      await onSave(draft)
      setMsg('Saved')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <Toggle checked={draft.paper} onChange={(v) => setDraft((d) => ({ ...d, paper: v }))} />
        <span className="text-[13px] text-text">Paper Trading</span>
      </label>
      <p className="text-[11px] text-text-muted/60">When enabled, orders are routed to Alpaca's paper trading environment.</p>
      {dirty && (
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Platform'}
          </button>
          {msg && <span className="text-[12px] text-text-muted">{msg}</span>}
        </div>
      )}
    </div>
  )
}

// ==================== Panel: Add Platform ====================

function PanelAddPlatform({ existingIds, onSave, onClose }: {
  existingIds: string[]
  onSave: (p: PlatformConfig) => Promise<void>
  onClose: () => void
}) {
  const [type, setType] = useState<'ccxt' | 'alpaca' | null>(null)
  const [id, setId] = useState('')
  const [exchange, setExchange] = useState('binance')
  const [paper, setPaper] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!type) return
    const finalId = id.trim() || (type === 'ccxt' ? `${exchange}-platform` : 'alpaca-platform')
    if (existingIds.includes(finalId)) {
      setError(`Platform "${finalId}" already exists`)
      return
    }
    setSaving(true); setError('')
    try {
      if (type === 'ccxt') {
        await onSave({ id: finalId, type: 'ccxt', exchange, sandbox: false, demoTrading: false, defaultMarketType: 'swap' })
      } else {
        await onSave({ id: finalId, type: 'alpaca', paper })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create platform')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-[14px] font-semibold text-text">New Platform</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text p-1 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!type ? (
          <>
            <p className="text-[12px] text-text-muted">Choose a platform type.</p>
            <SDKSelector options={PLATFORM_TYPE_OPTIONS} selected="" onSelect={(sel) => setType(sel as 'ccxt' | 'alpaca')} />
          </>
        ) : (
          <div className="space-y-3">
            <Field label="Platform ID">
              <input className={inputClass} value={id} onChange={(e) => setId(e.target.value.trim())} placeholder={type === 'ccxt' ? `${exchange}-platform` : 'alpaca-platform'} />
            </Field>
            {type === 'ccxt' && (
              <Field label="Exchange">
                <input className={inputClass} value={exchange} onChange={(e) => setExchange(e.target.value.trim())} placeholder="binance" />
              </Field>
            )}
            {type === 'alpaca' && (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Toggle checked={paper} onChange={setPaper} />
                <span className="text-[13px] text-text">Paper Trading</span>
              </label>
            )}
            {error && <p className="text-[12px] text-red">{error}</p>}
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
                {saving ? 'Creating...' : 'Create Platform'}
              </button>
              <button onClick={() => setType(null)} className="px-3 py-1.5 text-[13px] font-medium rounded-md border border-border hover:bg-bg-tertiary transition-colors">
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ==================== Panel: Add Account ====================

function PanelAddAccount({ platforms, existingIds, onSave, onClose }: {
  platforms: PlatformConfig[]
  existingIds: string[]
  onSave: (a: AccountConfig) => Promise<void>
  onClose: () => void
}) {
  const [platformId, setPlatformId] = useState(platforms[0]?.id || '')
  const [id, setId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const platform = platforms.find((p) => p.id === platformId)
  const defaultId = platform?.type === 'ccxt'
    ? `${platformId.replace('-platform', '')}-main`
    : 'alpaca-paper'

  const handleSave = async () => {
    const finalId = id.trim() || defaultId
    if (existingIds.includes(finalId)) {
      setError(`Account "${finalId}" already exists`)
      return
    }
    setSaving(true); setError('')
    try {
      await onSave({ id: finalId, platformId, apiKey, apiSecret, guards: [] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-[14px] font-semibold text-text">New Account</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text p-1 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <Field label="Platform">
          <select className={inputClass} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.type === 'ccxt' ? `CCXT — ${p.id}` : `Alpaca — ${p.id}`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Account ID">
          <input className={inputClass} value={id} onChange={(e) => setId(e.target.value.trim())} placeholder={defaultId} />
        </Field>
        <Field label="API Key">
          <input className={inputClass} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Not configured" />
        </Field>
        <Field label={platform?.type === 'alpaca' ? 'Secret Key' : 'API Secret'}>
          <input className={inputClass} type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="Not configured" />
        </Field>
        {error && <p className="text-[12px] text-red">{error}</p>}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
            {saving ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </>
  )
}

// ==================== Delete Button ====================

function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => { onConfirm(); setConfirming(false) }} className="text-[11px] text-red hover:text-red/80 font-medium transition-colors">
          Confirm
        </button>
        <button onClick={() => setConfirming(false)} className="text-[11px] text-text-muted hover:text-text transition-colors">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-[11px] text-text-muted hover:text-red transition-colors">
      {label}
    </button>
  )
}
