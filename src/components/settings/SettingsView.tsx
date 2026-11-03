import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Cpu,
  Info,
  Smartphone,
  Check,
} from 'lucide-react';
import { AppSettings, DEFAULT_SETTINGS } from '../../types/settings';
import { getSettings, saveSettings } from '../../db/settings';
import { exportLocalData, importLocalData, clearAllLocalData } from '../../db/database';
import { GeminiClient } from '../../core/ai/geminiClient';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { isInstalled, isIOS } = usePWAInstall();

  useEffect(() => {
    loadSettings();
    checkHealth();
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
  };

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await GeminiClient.checkHealth();
      setHealthStatus(res);
    } catch (err: any) {
      setHealthStatus({
        status: 'error',
        error: err?.message || 'Could not reach server health endpoint.',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleToggle = async (key: keyof AppSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await saveSettings(updated);
    showMessage('Preferences updated successfully.');
  };

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await exportLocalData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-agent-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('Local-first database backup exported successfully.');
    } catch (err: any) {
      showMessage(`Export failed: ${err?.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await importLocalData(parsed);
      if (res.success) {
        showMessage(`Restored ${res.count} records into IndexedDB.`);
        await loadSettings();
      } else {
        showMessage(`Import failed: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showMessage(`File parsing failed: ${err?.message}`, 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleClearData = async () => {
    if (
      window.confirm(
        'WARNING: This will permanently erase all local conversations, memories, approval history, and settings from this browser/device. Are you sure?'
      )
    ) {
      await clearAllLocalData();
      await loadSettings();
      showMessage('Local database wiped clean.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">System Settings & Privacy</h1>
        <p className="mt-1 text-xs text-slate-400">
          Configure AI server parameters, security approval enforcement, and manage local data backups.
        </p>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Section 1: AI Provider & Server Health */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Server & Gemini AI Integration</h2>
              <p className="text-xs text-slate-400">Vercel Serverless Function & SDK Endpoint</p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            disabled={isCheckingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            <span>Test Endpoint</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Status</span>
            <span className="font-semibold text-slate-200">
              {healthStatus?.status === 'ok' ? (
                <span className="text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                </span>
              ) : (
                <span className="text-amber-400 mt-0.5 block">Pending / Unknown</span>
              )}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Gemini Key</span>
            <span className="font-semibold text-slate-200 mt-0.5 block">
              {healthStatus?.aiConfigured ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Server-side Injected
                </span>
              ) : (
                <span className="text-amber-400">Not configured</span>
              )}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Model</span>
            <span className="font-mono text-slate-300 mt-0.5 block truncate">
              {healthStatus?.model || 'gemini-3.8-flash'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: PWA Installation */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Progressive Web App (PWA)</h2>
              <p className="text-xs text-slate-400">Install as standalone app on iPhone or Desktop</p>
            </div>
          </div>

          <PWAInstallButton />
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-300 space-y-1">
          <div className="flex items-center justify-between">
            <span>Install Mode:</span>
            <span className="font-mono text-blue-400">
              {isInstalled ? 'Installed Standalone' : 'Browser Web App'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Offline Shell Cache:</span>
            <span className="text-emerald-400">ServiceWorker Active</span>
          </div>
          {isIOS && (
            <div className="text-[11px] text-slate-400 pt-1">
              On iPhone Safari: Tap Share → Add to Home Screen for native experience.
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Privacy & Security Policies */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Privacy & Security Policies</h2>
            <p className="text-xs text-slate-400">Strict local-first privacy boundary</p>
          </div>
        </div>

        <div className="divide-y divide-slate-800/60 text-xs">
          {/* Share memory toggle */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-200">Inject Approved Memories into AI Context</div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                When enabled, relevant approved local memories are passed to Gemini so it knows your preferences.
              </div>
            </div>
            <button
              onClick={() => handleToggle('shareMemoriesWithAI')}
              className={`w-11 h-6 rounded-full transition relative shrink-0 ${
                settings.shareMemoriesWithAI ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.shareMemoriesWithAI ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Strict approval mode */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-200">Strict Approval Mode</div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Requires manual confirmation for all operations, including read-only status tools.
              </div>
            </div>
            <button
              onClick={() => handleToggle('strictApprovalMode')}
              className={`w-11 h-6 rounded-full transition relative shrink-0 ${
                settings.strictApprovalMode ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.strictApprovalMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Local Storage Backup & Recovery */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <HardDrive className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Local-First Storage & Data Ownership</h2>
            <p className="text-xs text-slate-400">Export, restore, or wipe your local IndexedDB storage</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>{isExporting ? 'Exporting...' : 'Export Local Backup (JSON)'}</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{isImporting ? 'Restoring...' : 'Restore from Backup'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Erase all conversations, memories, and approvals:
          </div>
          <button
            onClick={handleClearData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Data</span>
          </button>
        </div>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Security Architecture Notice</span>
        </div>
        <p className="leading-relaxed">
          MY AGENT operates on a strictly local-first basis. Your memories, approval history, and conversations reside inside your device&apos;s IndexedDB. The Gemini API key is strictly maintained on the Vercel server backend and never transmitted to the browser bundle. When taking actions, MY AGENT uses the Approval Engine to prevent any unauthorized modification.
        </p>
      </div>
    </div>
  );
};
