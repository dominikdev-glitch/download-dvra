import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, KeyRound, AlertCircle, X, Ban, ShieldX } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Generate / get permanent persistent device fingerprint in localStorage
function getPersistentDeviceId(): string {
  let devId = localStorage.getItem('dvra_admin_device_id');
  if (!devId) {
    devId = `device_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    localStorage.setItem('dvra_admin_device_id', devId);
  }
  return devId;
}

export function AdminPasswordModal({ isOpen, onClose, onSuccess }: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check ban state immediately when opened
  useEffect(() => {
    if (isOpen) {
      const localBan = localStorage.getItem('dvra_admin_device_banned') === 'true';
      if (localBan) {
        setIsBanned(true);
        setBanReason('This device was permanently banned after 5 consecutive incorrect Admin PIN attempts.');
        return;
      }

      const deviceId = getPersistentDeviceId();
      fetch(`/api/admin/check-ban?deviceId=${encodeURIComponent(deviceId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.isBanned) {
            setIsBanned(true);
            localStorage.setItem('dvra_admin_device_banned', 'true');
            setBanReason(data.message || 'This device is permanently banned from accessing the Admin PIN page.');
          } else if (data.attemptsRemaining !== undefined) {
            setAttemptsLeft(data.attemptsRemaining);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isBanned) return;

    setIsLoading(true);
    setError(null);
    const deviceId = getPersistentDeviceId();

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password.trim(),
          deviceId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }
        setPassword('');
        setError(null);
        onSuccess();
        onClose();
      } else {
        if (data.isBanned || data.banned || res.status === 403) {
          setIsBanned(true);
          localStorage.setItem('dvra_admin_device_banned', 'true');
          setBanReason(
            data.error || 'ACCESS PERMANENTLY DENIED: You exceeded 5 failed PIN attempts. This device has been banned.'
          );
          setError(null);
        } else {
          setAttemptsLeft(data.attemptsLeft ?? null);
          setError(
            data.error ||
              `Invalid PIN. ${data.attemptsLeft !== undefined ? `${data.attemptsLeft} of 5 attempts remaining before device ban.` : ''}`
          );
        }
      }
    } catch {
      setError('Failed to reach server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-slate-900">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isBanned ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              {isBanned ? <ShieldX className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isBanned ? 'Device Banned' : 'Admin Security'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBanned ? 'Access Denied' : 'Restricted Access'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banned Screen (Permanent Block after 5 wrong tries) */}
        {isBanned ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-16 h-16 bg-red-100 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Ban className="w-8 h-8 text-red-600" />
            </div>
            <div className="space-y-1.5 px-2">
              <h4 className="text-sm font-black text-red-700 uppercase tracking-wide">
                Device Banned (5/5 Failed Attempts)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {banReason ||
                  'Your device and IP address have been permanently banned from the Admin Access Portal due to 5 consecutive wrong PIN attempts.'}
              </p>
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 font-mono mt-2">
                Status: BANNED_HARD_LOCKOUT
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-tight font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Enter Admin PIN</label>
                <div className="relative">
                  <input
                    type="password"
                    id="input-admin-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••"
                    autoFocus
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Limit: 5 attempts</span>
                  {attemptsLeft !== null && (
                    <span
                      className={`font-bold ${
                        attemptsLeft <= 2 ? 'text-red-600 animate-pulse' : 'text-amber-600'
                      }`}
                    >
                      {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left before ban
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-admin-password"
                  disabled={isLoading || !password.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1 cursor-pointer"
                >
                  {isLoading ? <span>Verifying...</span> : <span>Unlock Admin</span>}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
