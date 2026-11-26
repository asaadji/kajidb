import { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, LogIn, KeyRound } from 'lucide-react';
import { api, type BootstrapStatus } from '../lib/api';
import type { PublicUser } from '../types';

interface AuthPanelProps {
  defaultMode?: 'member-login' | 'member-register' | 'admin';
  onSuccess: (user: PublicUser, token: string) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function AuthPanel({
  defaultMode = 'member-login',
  onSuccess,
  onCancel,
  compact = false,
}: AuthPanelProps) {
  const [mode, setMode] = useState<'member-login' | 'member-register' | 'admin'>(defaultMode);
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    let active = true;
    api
      .getBootstrapStatus()
      .then((res) => {
        if (active) setBootstrap(res);
      })
      .catch(() => {
        if (active) {
          setBootstrap({ adminClaimed: false, envPasscodeConfigured: false, canClaimFirstAdmin: false });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'member-login') {
        const res = await api.login({ email, password });
        onSuccess(res.user, res.token);
      } else if (mode === 'member-register') {
        const res = await api.register({ name, email, password });
        onSuccess(res.user, res.token);
      } else {
        if (bootstrap?.envPasscodeConfigured) {
          const res = await api.loginWithAdminPasscode({ passcode, name, email });
          onSuccess(res.user, res.token);
        } else if (bootstrap?.canClaimFirstAdmin) {
          const res = await api.claimAdmin({ name, email, password });
          onSuccess(res.user, res.token);
        } else {
          const res = await api.login({ email, password });
          if (res.user.role !== 'admin') {
            throw new Error('Akun ini terdaftar sebagai anggota biasa, bukan administrator.');
          }
          onSuccess(res.user, res.token);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  const isClaimingFirstAdmin = mode === 'admin' && Boolean(bootstrap?.canClaimFirstAdmin);
  const isPasscodeAdmin = mode === 'admin' && Boolean(bootstrap?.envPasscodeConfigured);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white ${
        compact ? 'p-6' : 'p-6 sm:p-8'
      }`}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            {mode === 'member-login' && 'Masuk Anggota KAJILIB'}
            {mode === 'member-register' && 'Pendaftaran Anggota Baru'}
            {mode === 'admin' &&
              (isClaimingFirstAdmin
                ? 'Aktivasi Administrator Pertama'
                : 'Akses Konsol Administrator')}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {mode === 'member-login' &&
              'Masuk untuk meminjam buku, memantau jatuh tempo, dan melihat aktivitas real-time.'}
            {mode === 'member-register' &&
              'Buat kartu anggota digital untuk akses peminjaman dan antrean reservasi.'}
            {mode === 'admin' &&
              (isClaimingFirstAdmin
                ? 'Belum ada akun admin terdaftar. Tetapkan akun pengelola utama perpustakaan.'
                : isPasscodeAdmin
                  ? 'Masukkan kode akses administrator yang dikonfigurasi pada server.'
                  : 'Masuk dengan akun administrator untuk mengelola koleksi dan pelaporan otomatis.')}
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('member-login');
            setError(null);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            mode === 'member-login'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LogIn className="h-3.5 w-3.5" />
          Masuk
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('member-register');
            setError(null);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            mode === 'member-register'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Daftar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('admin');
            setError(null);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            mode === 'admin'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {(mode === 'member-register' || isClaimingFirstAdmin || isPasscodeAdmin) && (
          <div>
            <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isPasscodeAdmin ? 'Nama Pengelola (Opsional)' : 'Nama Lengkap'}
            </label>
            <input
              id="auth-name"
              type="text"
              required={!isPasscodeAdmin}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Nadia Kusuma"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
            {isPasscodeAdmin ? 'Email Pengelola (Opsional)' : 'Alamat Email'}
          </label>
          <input
            id="auth-email"
            type="email"
            required={!isPasscodeAdmin}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@institusi.id"
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
          />
        </div>

        {isPasscodeAdmin ? (
          <div>
            <label htmlFor="auth-passcode" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kode Akses Administrator
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="auth-passcode"
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Masukkan ADMIN_PASSCODE"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kata Sandi {isClaimingFirstAdmin || mode === 'member-register' ? '(Min. 8 karakter untuk admin / 6 untuk anggota)' : ''}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={isClaimingFirstAdmin ? 8 : 6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            {loading
              ? 'Memproses...'
              : mode === 'member-login'
                ? 'Masuk Sekarang'
                : mode === 'member-register'
                  ? 'Buat Kartu Anggota'
                  : isClaimingFirstAdmin
                    ? 'Aktifkan Admin Pertama'
                    : 'Masuk Konsol Admin'}
          </button>
        </div>
      </form>
    </div>
  );
}
