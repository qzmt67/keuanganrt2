import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, AlertCircle, Printer, 
  Plus, ArrowUpRight, ArrowDownRight,
  Building, X, Search, Filter, MessageCircle, 
  Lock, LogOut, KeyRound, Smartphone, Radio,
  PieChart as PieIcon, RefreshCw, Activity,
  CreditCard, Calendar, User, Database, Check,
  Settings, Sliders, ShieldCheck, TrendingUp, TrendingDown, DollarSign
} from 'lucide-react';
import { MONTHS, parseResidents, Resident } from './initialData';
import { supabase } from './supabaseClient';

export default function App() {
  // --- JAM DINAMIS REAL-TIME ---
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- KEAMANAN & SESI SERVER ---
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('rt2_session_token'));
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string } | null>(() => {
    const saved = localStorage.getItem('rt2_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Database Passwords (Tersimpan di LocalStorage & Dapat Diubah Admin)
  const [passwords, setPasswords] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('rt2_passwords');
    return saved ? JSON.parse(saved) : {
      admin: 'Bismillah#123',
      bendahara: 'Bismillah#123',
      ketua_rt: 'Bismillah#123',
    };
  });

  // Konfigurasi Lingkungan RT 02 (Dapat Diubah Admin)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('rt2_settings');
    return saved ? JSON.parse(saved) : {
      rtName: 'RT 02 Tembalang Pesona Asri',
      leader: 'Bpk. Bambang Sutrisno',
      treasurer: 'Bpk. Hendro Pratama',
      initialCash: 12500000,
      defaultDues: 100000,
      currentMonth: 'Okt',
      year: 2026,
    };
  });

  // Status Database
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Login State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<'bendahara' | 'ketua_rt' | 'admin'>('bendahara');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Navigasi Tampilan
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matriks' | 'kas' | 'warga' | 'laporan' | 'pengaturan'>('dashboard');
  const [viewModeMobile, setViewModeMobile] = useState<'card' | 'table'>('card');

  // Form Pengaturan Admin State
  const [adminForm, setAdminForm] = useState({
    leader: settings.leader,
    treasurer: settings.treasurer,
    defaultDues: String(settings.defaultDues),
    targetRoleToChange: 'bendahara',
    newPassword: '',
  });

  // Data 88 Warga & Transaksi Kas
  const [residents, setResidents] = useState<Resident[]>(parseResidents());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDawis, setSelectedDawis] = useState('Semua');

  // Transaksi Kas Live dari Database
  const [transactions, setTransactions] = useState<any[]>([
    { id: 'trx-1', date: '2026-10-02', type: 'OUT', category: 'Keamanan & Kebersihan', amount: 3500000, desc: 'Honor Penjaga Malam & Sampah' },
    { id: 'trx-2', date: '2026-10-15', type: 'OUT', category: 'Perawatan Lingkungan', amount: 850000, desc: 'Perbaikan Lampu Jalan Portal' }
  ]);

  // Modal Catat Kas
  const [showAddTrx, setShowAddTrx] = useState(false);
  const [newTrx, setNewTrx] = useState({ type: 'OUT', category: 'Keamanan & Kebersihan', amount: '', description: '' });
  const [submittingTrx, setSubmittingTrx] = useState(false);

  // Toast Notifikasi
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone === '0') return '-';
    if (!sessionToken) return phone.slice(0, 4) + '****' + phone.slice(-3);
    return phone;
  };

  // --- AMBIL DATA KAS TERBARU DARI DATABASE ---
  const fetchUpdatedDataFromDb = useCallback(async (isManualTrigger = false) => {
    setIsSyncingData(true);
    setDbStatus('syncing');
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted = data.map(item => ({
          id: item.id,
          date: item.date || item.created_at?.split('T')[0],
          type: item.type,
          category: item.category,
          amount: Number(item.amount),
          desc: item.description,
          recorded_by: item.recorded_by
        }));
        setTransactions(formatted);
      }
      setDbStatus('connected');
      if (isManualTrigger) {
        showToast('Data berhasil diperbarui dari database!');
      }
    } catch (err: any) {
      console.warn('Kendala koneksi database:', err.message);
      setDbStatus('offline');
      if (isManualTrigger) {
        alert(`Gagal mengambil data terbaru: ${err.message}`);
      }
    } finally {
      setIsSyncingData(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdatedDataFromDb(false);
  }, [fetchUpdatedDataFromDb]);

  // --- AUTENTIKASI LOGIN ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');

    setTimeout(() => {
      const expectedPassword = passwords[loginRole];
      if (loginPassword.trim() === expectedPassword) {
        const generatedToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const userData = {
          role: loginRole,
          name: loginRole === 'bendahara' ? settings.treasurer : loginRole === 'ketua_rt' ? settings.leader : 'Administrator RT'
        };

        localStorage.setItem('rt2_session_token', generatedToken);
        localStorage.setItem('rt2_user_session', JSON.stringify(userData));
        setSessionToken(generatedToken);
        setCurrentUser(userData);
        setLoginPassword('');
        setShowLoginModal(false);
        setActiveTab('dashboard');
        showToast(`Login berhasil sebagai ${userData.name}!`);
      } else {
        setLoginError('Password tidak sesuai. Periksa kembali kata sandi Anda.');
      }
      setIsAuthenticating(false);
    }, 350);
  };

  const handleLogout = () => {
    localStorage.removeItem('rt2_session_token');
    localStorage.removeItem('rt2_user_session');
    setSessionToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
    showToast('Berhasil keluar. Kembali ke Mode Warga.');
  };

  // --- SIMPAN PENGATURAN SUPERADMIN ---
  const handleSaveAdminSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin') {
      alert('Hanya Admin dengan privilege tinggi yang dapat mengubah konfigurasi ini!');
      return;
    }

    const updatedSettings = {
      ...settings,
      leader: adminForm.leader.trim() || settings.leader,
      treasurer: adminForm.treasurer.trim() || settings.treasurer,
      defaultDues: Number(adminForm.defaultDues) || settings.defaultDues,
    };

    setSettings(updatedSettings);
    localStorage.setItem('rt2_settings', JSON.stringify(updatedSettings));

    // Update password jika diisi
    if (adminForm.newPassword.trim()) {
      const updatedPasswords = {
        ...passwords,
        [adminForm.targetRoleToChange]: adminForm.newPassword.trim(),
      };
      setPasswords(updatedPasswords);
      localStorage.setItem('rt2_passwords', JSON.stringify(updatedPasswords));
      setAdminForm(prev => ({ ...prev, newPassword: '' }));
      showToast(`Pengaturan & Password baru untuk ${adminForm.targetRoleToChange} berhasil disimpan!`);
    } else {
      showToast('Konfigurasi Pengurus & Iuran berhasil diperbarui!');
    }
  };

  // --- SIMPAN TRANSAKSI KAS KE DATABASE ---
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrx.amount || !newTrx.description) return;
    setSubmittingTrx(true);

    const nominal = Number(newTrx.amount);
    const dateToday = new Date().toISOString().split('T')[0];
    const trxNumber = `KAS-${newTrx.type}-${Date.now().toString().slice(-6)}`;

    try {
      const { data, error } = await supabase.from('transactions').insert([{
        transaction_number: trxNumber,
        date: dateToday,
        type: newTrx.type,
        category: newTrx.category,
        amount: nominal,
        description: newTrx.description,
        recorded_by: currentUser?.name || 'Pengurus',
        status: 'VALID'
      }]).select();

      if (error) throw error;

      const newEntry = {
        id: data ? data[0].id : `trx-${Date.now()}`,
        date: dateToday,
        type: newTrx.type,
        category: newTrx.category,
        amount: nominal,
        desc: newTrx.description,
        recorded_by: currentUser?.name || 'Pengurus'
      };

      setTransactions(prev => [newEntry, ...prev]);
      setShowAddTrx(false);
      setNewTrx({ type: 'OUT', category: 'Keamanan & Kebersihan', amount: '', description: '' });
      showToast('Transaksi kas berhasil disimpan!');
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}.`);
    } finally {
      setSubmittingTrx(false);
    }
  };

  // --- CATAT PEMBAYARAN IURAN ---
  const handleQuickPay = async (resId: string, month: string) => {
    if (!sessionToken) {
      alert('Akses Ditolak: Anda wajib login sebagai Pengurus untuk mencatat iuran!');
      return;
    }
    const target = residents.find(r => r.id === resId);
    if (!target) return;
    const currentPaid = target.payments[month] || 0;
    const remaining = target.rate - currentPaid;

    if (remaining <= 0) {
      alert(`Iuran ${target.name} bulan ${month} sudah lunas!`);
      return;
    }

    const input = window.prompt(`Catat pembayaran iuran ${month} untuk ${target.name} (${target.house}):`, String(remaining));
    if (!input || isNaN(Number(input)) || Number(input) <= 0) return;

    const nominal = Math.min(Number(input), remaining);
    const dateToday = new Date().toISOString().split('T')[0];

    try {
      const descText = `Iuran ${month} an. ${target.name} (${target.house})`;
      const { data, error } = await supabase.from('transactions').insert([{
        transaction_number: `IURAN-${Date.now().toString().slice(-6)}`,
        date: dateToday,
        type: 'IN',
        category: 'Iuran Bulanan',
        amount: nominal,
        description: descText,
        recorded_by: currentUser?.name || 'Bendahara',
        status: 'VALID'
      }]).select();

      if (error) console.warn('Supabase log:', error.message);

      const newKasEntry = {
        id: data ? data[0].id : `trx-${Date.now()}`,
        date: dateToday,
        type: 'IN',
        category: 'Iuran Bulanan',
        amount: nominal,
        desc: descText,
        recorded_by: currentUser?.name || 'Bendahara'
      };
      setTransactions(prev => [newKasEntry, ...prev]);

      setResidents(prev => prev.map(r => {
        if (r.id === resId) {
          return {
            ...r,
            payments: {
              ...r.payments,
              [month]: currentPaid + nominal
            }
          };
        }
        return r;
      }));

      showToast(`Iuran ${target.name} Rp${nominal.toLocaleString('id-ID')} berhasil dicatat!`);
    } catch (err: any) {
      alert(`Peringatan: ${err.message}`);
    }
  };

  const handleSendWA = (r: Resident) => {
    if (!r.phone || r.phone === '0') {
      alert('Nomor telepon warga ini belum tersedia.');
      return;
    }
    const cleanPhone = r.phone.startsWith('0') ? '62' + r.phone.slice(1) : r.phone;
    const msg = `Assalamu'alaikum Bpk/Ibu ${r.name}. Mengingatkan tagihan iuran ${settings.rtName} (${r.house}) periode ${settings.currentMonth} ${settings.year} sebesar ${formatRupiah(r.rate)}. Terima kasih.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- STATISTIK & KALKULASI ARUS KAS LENGKAP ---
  const stats = useMemo(() => {
    let totalIuranTerkumpul = 0;
    let iuranBulanIni = 0;
    let targetBulanIni = 0;
    let kkLunasBulanIni = 0;
    let kkTotalAktif = 0;

    const dawisStats: { [key: string]: { target: number; paid: number; lunasKK: number; totalKK: number } } = {
      'Dawis 1': { target: 0, paid: 0, lunasKK: 0, totalKK: 0 },
      'Dawis 2': { target: 0, paid: 0, lunasKK: 0, totalKK: 0 },
      'Dawis 3': { target: 0, paid: 0, lunasKK: 0, totalKK: 0 },
    };

    residents.forEach(r => {
      if (r.rate > 0) {
        kkTotalAktif += 1;
        targetBulanIni += r.rate;
        const paidThisMonth = r.payments[settings.currentMonth] || 0;
        iuranBulanIni += paidThisMonth;
        if (paidThisMonth >= r.rate) kkLunasBulanIni += 1;

        if (dawisStats[r.dawis]) {
          dawisStats[r.dawis].totalKK += 1;
          dawisStats[r.dawis].target += r.rate;
          dawisStats[r.dawis].paid += paidThisMonth;
          if (paidThisMonth >= r.rate) dawisStats[r.dawis].lunasKK += 1;
        }
      }
      MONTHS.forEach(m => {
        totalIuranTerkumpul += (r.payments[m] || 0);
      });
    });

    const totalPengeluaran = transactions
      .filter(t => t.type === 'OUT')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const saldoAkhir = settings.initialCash + totalIuranTerkumpul - totalPengeluaran;
    const piutangBulanIni = targetBulanIni - iuranBulanIni;
    const kepatuhanPercent = kkTotalAktif > 0 ? Math.round((kkLunasBulanIni / kkTotalAktif) * 100) : 0;

    // Hitung Arus Kas Masuk & Keluar Sebulan Terakhir (Bulan Berjalan)
    const extraKasMasukBulanIni = transactions
      .filter(t => t.type === 'IN' && t.category !== 'Iuran Bulanan')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const kasMasukSebulan = iuranBulanIni + extraKasMasukBulanIni;
    const kasKeluarSebulan = totalPengeluaran; // Beban sebulan
    const netArusKasSebulan = kasMasukSebulan - kasKeluarSebulan;

    return { 
      totalIuranTerkumpul, iuranBulanIni, targetBulanIni, piutangBulanIni, 
      kkLunasBulanIni, kkTotalAktif, kepatuhanPercent, totalPengeluaran, 
      saldoAkhir, dawisStats, kasMasukSebulan, kasKeluarSebulan, netArusKasSebulan 
    };
  }, [residents, transactions, settings]);

  const filteredResidents = useMemo(() => {
    return residents.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.house.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDawis = selectedDawis === 'Semua' || r.dawis === selectedDawis;
      return matchSearch && matchDawis;
    });
  }, [residents, searchQuery, selectedDawis]);

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 font-sans selection:bg-[#30D158] selection:text-black pb-28 sm:pb-20">
      
      {/* TOAST NOTIFIKASI */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E]/95 border border-[#30D158]/50 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-xl">
          <Check className="w-4 h-4 text-[#30D158]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. STATUS BAR DENGAN JAM REAL-TIME */}
      <div className="sticky top-0 z-40 bg-[#000000]/90 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 font-semibold tracking-tight text-white">
            <span className="text-sm font-bold font-mono">{currentTime}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse"></div>
          </div>

          <div className="bg-[#1C1C1E] border border-white/10 px-3.5 py-1 rounded-full flex items-center gap-2 shadow-2xl">
            <Building className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">RT 02 TPA</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <Database className={`w-3.5 h-3.5 ${dbStatus === 'connected' ? 'text-[#30D158]' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">{dbStatus === 'connected' ? 'Cloud Sync' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* 2. HEADER APLIKASI */}
      <header className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {settings.rtName}
            </h1>
            <p className="text-[11px] text-slate-400">
              {sessionToken ? `Akses ${currentUser?.role.replace('_', ' ').toUpperCase()} • Pengurus Aktif` : 'Mode Warga • Dashboard Terbuka & Transparan'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sessionToken ? (
              <div className="flex items-center gap-2 bg-[#1C1C1E] border border-white/10 p-1.5 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#34C759] to-[#30D158] flex items-center justify-center text-black font-black text-xs">
                  {currentUser?.role[0].toUpperCase()}
                </div>
                <div className="pr-1 text-left hidden sm:block">
                  <p className="text-[11px] font-bold text-white capitalize leading-tight">{currentUser?.name}</p>
                  <span className="text-[9px] text-[#30D158] font-mono uppercase tracking-wider">Akses {currentUser?.role.replace('_', ' ')}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-black px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition"
              >
                <KeyRound className="w-3.5 h-3.5" /> Login Pengurus
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. MENU NAVIGASI DESKTOP */}
      <nav className="max-w-6xl mx-auto px-4 my-2 hidden sm:block">
        <div className="bg-[#1C1C1E]/80 border border-white/10 p-1.5 rounded-[22px] backdrop-blur-xl flex gap-1.5 overflow-x-auto shadow-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-[#2C2C2E] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
          >
            Dashboard
          </button>
          
          {sessionToken && (
            <>
              <button
                onClick={() => setActiveTab('matriks')}
                className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap ${activeTab === 'matriks' ? 'bg-[#2C2C2E] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
              >
                Iuran 12 Bulan
              </button>
              <button
                onClick={() => setActiveTab('kas')}
                className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap ${activeTab === 'kas' ? 'bg-[#2C2C2E] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
              >
                Buku Kas
              </button>
              <button
                onClick={() => setActiveTab('warga')}
                className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap ${activeTab === 'warga' ? 'bg-[#2C2C2E] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
              >
                Master 88 KK
              </button>
              <button
                onClick={() => setActiveTab('laporan')}
                className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap ${activeTab === 'laporan' ? 'bg-[#2C2C2E] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
              >
                Cetak Lembar A4
              </button>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('pengaturan')}
                  className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'pengaturan' ? 'bg-[#30D158] text-black shadow-lg font-black' : 'text-[#30D158] hover:bg-[#30D158]/10'}`}
                >
                  <Settings className="w-3.5 h-3.5" /> Pengaturan RT
                </button>
              )}
            </>
          )}
        </div>
      </nav>

      {/* 4. KONTEN UTAMA */}
      <main className="max-w-6xl mx-auto px-4 mt-3 space-y-4">

        {/* --- TAB 1: DASHBOARD (SEKARANG TAMPIL DI MODE WARGA & PENGURUS) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            
            {/* HERO SALDO KAS DENGAN SINKRON DATABASE AKTIF */}
            <div className="bg-[#1C1C1E]/95 border border-white/10 rounded-[30px] p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  
                  {/* BADGE SINKRON DATABASE (MEMPERBARUI DARI DATABASE) */}
                  <button
                    onClick={() => fetchUpdatedDataFromDb(true)}
                    disabled={isSyncingData}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[#30D158] text-[11px] font-bold hover:bg-emerald-900/60 active:scale-95 transition cursor-pointer"
                    title="Klik untuk mengambil data kas terupdate dari database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingData ? 'animate-spin' : ''}`} />
                    <span>{isSyncingData ? 'Memperbarui Data...' : 'Sinkron Database'}</span>
                  </button>

                  <p className="text-xs text-slate-400 font-medium">Saldo Kas Riil Saat Ini</p>
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {formatRupiah(stats.saldoAkhir)}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Saldo Awal ({formatRupiah(settings.initialCash)}) + Iuran Masuk ({formatRupiah(stats.totalIuranTerkumpul)}) - Beban Kas ({formatRupiah(stats.totalPengeluaran)})
                  </p>
                </div>

                {/* CIRCULAR GAUGES KEPATUHAN & IURAN BULANAN */}
                <div className="w-full sm:w-auto bg-[#000000]/60 border border-white/10 rounded-[24px] p-3 flex items-center justify-around gap-4 shadow-inner">
                  <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-[#2C2C2E]" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-[#30D158]" strokeDasharray={`${stats.kepatuhanPercent}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <Smartphone className="w-4 h-4 text-white absolute" />
                    </div>
                    <span className="text-xs font-black text-white mt-1">{stats.kepatuhanPercent}%</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Kepatuhan</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-[#2C2C2E]" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-[#0A84FF]" strokeDasharray={`${Math.min(100, Math.round((stats.iuranBulanIni / (stats.targetBulanIni || 1)) * 100))}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <Radio className="w-4 h-4 text-white absolute" />
                    </div>
                    <span className="text-xs font-black text-white mt-1">
                      {Math.round((stats.iuranBulanIni / (stats.targetBulanIni || 1)) * 100)}%
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Bulan Ini</span>
                  </div>
                </div>
              </div>
            </div>

            {/* --- KARTU BARU: ARUS KAS MASUK & KELUAR SEBULAN TERAKHIR --- */}
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-5 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-950/70 border border-emerald-500/30 rounded-xl text-[#30D158]">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Arus Kas Sebulan Terakhir ({settings.currentMonth} {settings.year})</h3>
                    <p className="text-[10px] text-slate-400">Ringkasan pergerakan kas masuk vs kas keluar operasional</p>
                  </div>
                </div>
                <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${
                  stats.netArusKasSebulan >= 0 ? 'bg-emerald-950/60 border-emerald-500/30 text-[#30D158]' : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
                }`}>
                  {stats.netArusKasSebulan >= 0 ? 'Surplus +' : 'Defisit -'} {formatRupiah(Math.abs(stats.netArusKasSebulan))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-[#2C2C2E]/60 border border-white/5 p-3.5 rounded-[20px] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Kas Masuk (Bulan Ini)</span>
                    <span className="text-base sm:text-lg font-black text-[#30D158]">{formatRupiah(stats.kasMasukSebulan)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950 text-[#30D158]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-[#2C2C2E]/60 border border-white/5 p-3.5 rounded-[20px] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Kas Keluar (Operasional)</span>
                    <span className="text-base sm:text-lg font-black text-rose-400">{formatRupiah(stats.kasKeluarSebulan)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-950 text-rose-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-[#2C2C2E]/60 border border-white/5 p-3.5 rounded-[20px] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Selisih Kas Bersih</span>
                    <span className={`text-base sm:text-lg font-black ${stats.netArusKasSebulan >= 0 ? 'text-white' : 'text-amber-400'}`}>
                      {formatRupiah(stats.netArusKasSebulan)}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4 BENTO KARTU FINANSIAL */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Iuran ({settings.currentMonth})</span>
                <h4 className="text-lg sm:text-xl font-black text-white mt-1">{formatRupiah(stats.iuranBulanIni)}</h4>
                <p className="text-[10px] text-[#30D158] mt-1">{stats.kkLunasBulanIni} KK Lunas</p>
              </div>

              <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Piutang ({settings.currentMonth})</span>
                <h4 className="text-lg sm:text-xl font-black text-amber-400 mt-1">{formatRupiah(stats.piutangBulanIni)}</h4>
                <p className="text-[10px] text-slate-400 mt-1">Sisa belum bayar</p>
              </div>

              <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Iuran Jan-Des</span>
                <h4 className="text-lg sm:text-xl font-black text-blue-400 mt-1">{formatRupiah(stats.totalIuranTerkumpul)}</h4>
                <p className="text-[10px] text-slate-400 mt-1">88 Kepala Keluarga</p>
              </div>

              <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Beban</span>
                <h4 className="text-lg sm:text-xl font-black text-rose-400 mt-1">{formatRupiah(stats.totalPengeluaran)}</h4>
                <p className="text-[10px] text-slate-400 mt-1">Operasional RT</p>
              </div>
            </div>

            {/* DAWIS CARDS */}
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-5 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-[#30D158]" /> Kepatuhan Kelompok Dawis ({settings.currentMonth})
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Dawis 1', 'Dawis 2', 'Dawis 3'].map((d, idx) => {
                  const item = stats.dawisStats[d];
                  const colors = ['#30D158', '#0A84FF', '#FF9F0A'];
                  return (
                    <div key={d} className="bg-[#2C2C2E]/60 border border-white/5 p-3 rounded-[20px] text-center">
                      <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ backgroundColor: colors[idx] }}></div>
                      <p className="text-xs font-bold text-white">{d}</p>
                      <p className="text-sm font-black mt-1" style={{ color: colors[idx] }}>
                        {item.lunasKK}/{item.totalKK} KK
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DAFTAR PENGELUARAN KAS TERBUKA (TERLIHAT OLEH WARGA) */}
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-5 shadow-xl space-y-3">
              <h3 className="font-extrabold text-sm text-white">Rincian Pengeluaran Operasional Kas Lingkungan</h3>
              <div className="divide-y divide-white/5 text-xs">
                {transactions.filter(t => t.type === 'OUT').map((t) => (
                  <div key={t.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white text-xs sm:text-sm">{t.desc}</p>
                      <p className="text-[10px] text-slate-400">{t.date} • {t.category}</p>
                    </div>
                    <span className="font-black text-rose-400 text-xs sm:text-sm">-{formatRupiah(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: IURAN 12 BULAN (PENGURUS) --- */}
        {activeTab === 'matriks' && sessionToken && (
          <div className="space-y-3">
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] p-3.5 space-y-3 shadow-xl">
              <div className="flex items-center gap-2 bg-[#2C2C2E] border border-white/10 rounded-[16px] px-3.5 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama warga / blok..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-white text-xs focus:outline-none w-full"
                />
              </div>

              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {['Semua', 'Dawis 1', 'Dawis 2', 'Dawis 3'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDawis(d)}
                      className={`min-h-[36px] px-3 py-1 rounded-[12px] text-xs font-bold transition whitespace-nowrap ${selectedDawis === d ? 'bg-[#30D158] text-black shadow-md' : 'bg-[#2C2C2E] text-slate-300'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <div className="flex sm:hidden bg-[#2C2C2E] p-1 rounded-xl">
                  <button
                    onClick={() => setViewModeMobile('card')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${viewModeMobile === 'card' ? 'bg-[#30D158] text-black' : 'text-slate-400'}`}
                  >
                    Kartu
                  </button>
                  <button
                    onClick={() => setViewModeMobile('table')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${viewModeMobile === 'table' ? 'bg-[#30D158] text-black' : 'text-slate-400'}`}
                  >
                    Tabel
                  </button>
                </div>
              </div>
            </div>

            {/* KARTU MOBILE */}
            <div className={`${viewModeMobile === 'card' ? 'block sm:hidden' : 'hidden'} space-y-2.5`}>
              {filteredResidents.map((r) => {
                const paidThisMonth = r.payments[settings.currentMonth] || 0;
                const isPaid = r.rate > 0 && paidThisMonth >= r.rate;

                return (
                  <div key={r.id} className="bg-[#1C1C1E] border border-white/10 rounded-[22px] p-4 shadow-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#30D158] font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">{r.code}</span>
                          <span className="text-[10px] text-slate-400">{r.dawis}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mt-1">{r.name}</h4>
                        <p className="text-xs text-slate-300">{r.house} • Tarif: {formatRupiah(r.rate)}</p>
                      </div>
                      <button
                        onClick={() => handleSendWA(r)}
                        className="p-2.5 bg-[#2C2C2E] text-[#30D158] rounded-xl active:bg-[#30D158] active:text-black transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <div className="text-xs">
                        <span className="text-slate-400">Status {settings.currentMonth}: </span>
                        <span className={`font-bold ${isPaid ? 'text-[#30D158]' : 'text-rose-400'}`}>
                          {isPaid ? 'LUNAS' : formatRupiah(paidThisMonth)}
                        </span>
                      </div>
                      {r.rate > 0 && !isPaid && (
                        <button
                          onClick={() => handleQuickPay(r.id, settings.currentMonth)}
                          className="min-h-[38px] px-4 py-1.5 bg-[#30D158] text-black font-extrabold text-xs rounded-xl active:scale-95 transition"
                        >
                          Catat Bayar Okt
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-1 pt-1">
                      {MONTHS.map(m => {
                        const p = r.payments[m] || 0;
                        const lunas = r.rate > 0 && p >= r.rate;
                        return (
                          <div
                            key={m}
                            onClick={() => r.rate > 0 && handleQuickPay(r.id, m)}
                            className={`h-5 rounded-md flex items-center justify-center text-[8px] font-bold cursor-pointer ${
                              lunas ? 'bg-[#30D158]/30 text-[#30D158] border border-[#30D158]/40' :
                              p > 0 ? 'bg-amber-500/30 text-amber-400' : 'bg-[#2C2C2E] text-slate-500'
                            }`}
                          >
                            {m[0]}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TABEL MATRIKS DESKTOP */}
            <div className={`${viewModeMobile === 'table' ? 'block' : 'hidden sm:block'} bg-[#1C1C1E] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#2C2C2E] text-slate-300 uppercase font-black text-[10px]">
                    <tr>
                      <th className="p-3 border-r border-b border-white/10">Warga</th>
                      <th className="p-3 border-r border-b border-white/10">Blok</th>
                      <th className="p-3 border-r border-b border-white/10 text-right">Tarif</th>
                      {MONTHS.map(m => (
                        <th key={m} className={`p-3 border-r border-b border-white/10 text-center min-w-[50px] ${m === settings.currentMonth ? 'bg-[#30D158]/20 text-[#30D158]' : ''}`}>
                          {m}
                        </th>
                      ))}
                      <th className="p-3 border-b border-white/10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredResidents.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.03]">
                        <td className="p-2.5 border-r border-white/5 font-semibold text-white whitespace-nowrap">
                          <span className="font-mono text-[9px] text-[#30D158] block leading-none">{r.code}</span>
                          {r.name}
                        </td>
                        <td className="p-2.5 border-r border-white/5 whitespace-nowrap font-bold text-slate-300">{r.house}</td>
                        <td className="p-2.5 border-r border-white/5 text-right font-mono text-slate-300">{r.rate > 0 ? (r.rate / 1000) + 'k' : '-'}</td>
                        {MONTHS.map(m => {
                          const paid = r.payments[m] || 0;
                          const isPaid = r.rate > 0 && paid >= r.rate;
                          const isPartial = r.rate > 0 && paid > 0 && paid < r.rate;
                          const isUnpaid = r.rate > 0 && paid === 0;

                          return (
                            <td
                              key={m}
                              onClick={() => r.rate > 0 && handleQuickPay(r.id, m)}
                              className={`p-1.5 border-r border-white/5 text-center cursor-pointer text-[11px] font-bold ${
                                isPaid ? 'bg-[#30D158]/15 text-[#30D158]' :
                                isPartial ? 'bg-amber-500/15 text-amber-400' :
                                isUnpaid ? 'text-rose-500/60' : 'text-slate-600'
                              }`}
                            >
                              {isPaid ? (paid / 1000) + 'k' : isPartial ? `${paid/1000}k` : isUnpaid ? '0' : '-'}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleSendWA(r)}
                            className="p-1.5 bg-[#2C2C2E] hover:bg-[#30D158] hover:text-black text-[#30D158] rounded-xl"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 3: BUKU KAS OPERASIONAL (PENGURUS) --- */}
        {activeTab === 'kas' && sessionToken && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">Buku Kas Operasional RT</h2>
                <p className="text-xs text-slate-400">Seluruh arus masuk dan keluar tercatat otomatis</p>
              </div>
              <button
                onClick={() => setShowAddTrx(true)}
                className="min-h-[44px] bg-gradient-to-r from-emerald-600 to-[#30D158] text-black font-extrabold px-4 py-2 rounded-[18px] text-xs flex items-center gap-1.5 shadow-xl"
              >
                <Plus className="w-4 h-4" /> Catat Kas
              </button>
            </div>

            <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl">
              <div className="divide-y divide-white/5">
                {transactions.map((t) => (
                  <div key={t.id} className="p-4 flex justify-between items-center hover:bg-white/[0.02]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${t.type === 'IN' ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-rose-500/20 text-rose-400'}`}>
                          {t.type === 'IN' ? 'Masuk' : 'Keluar'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{t.date}</span>
                      </div>
                      <p className="font-bold text-white text-xs sm:text-sm">{t.desc}</p>
                      <span className="text-[10px] text-slate-400">{t.category}</span>
                    </div>
                    <span className={`text-sm sm:text-base font-black ${t.type === 'IN' ? 'text-[#30D158]' : 'text-rose-400'}`}>
                      {t.type === 'IN' ? '+' : '-'}{formatRupiah(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: DATA 88 KK (PENGURUS) --- */}
        {activeTab === 'warga' && sessionToken && (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-white">Master Data 88 Kepala Keluarga</h2>
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl">
              <div className="divide-y divide-white/5">
                {filteredResidents.map((r) => (
                  <div key={r.id} className="p-3.5 flex justify-between items-center hover:bg-white/[0.02]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-[#30D158] font-bold">{r.code}</span>
                        <span className="text-[10px] text-slate-400">{r.dawis}</span>
                      </div>
                      <p className="font-bold text-white text-xs sm:text-sm">{r.name}</p>
                      <p className="text-[11px] text-slate-400">{r.house} • {maskPhone(r.phone)}</p>
                    </div>
                    <span className="text-xs font-black text-white">{formatRupiah(r.rate)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: CETAK LAPORAN RESMI A4 --- */}
        {activeTab === 'laporan' && sessionToken && (
          <div className="space-y-4">
            <div className="flex justify-between items-center no-print">
              <p className="text-xs text-slate-400">Lembar Rekapitulasi Kas A4:</p>
              <button
                onClick={() => window.print()}
                className="min-h-[44px] bg-white text-black font-extrabold px-4 py-2 rounded-[18px] text-xs flex items-center gap-1.5 shadow-xl"
              >
                <Printer className="w-4 h-4" /> Cetak A4
              </button>
            </div>

            <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-[28px] max-w-2xl mx-auto shadow-2xl border border-slate-300">
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
                <h2 className="text-lg sm:text-xl font-black uppercase">PENGURUS {settings.rtName}</h2>
                <p className="text-xs text-slate-600">Tembalang, Kota Semarang, Jawa Tengah</p>
                <h3 className="text-xs sm:text-sm font-bold mt-2 underline">LAPORAN KEUANGAN KAS BULANAN</h3>
                <p className="text-[10px] text-slate-500">Tahun Pembukuan: {settings.year}</p>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span>Saldo Awal Kas:</span>
                  <span className="font-mono font-bold">{formatRupiah(settings.initialCash)}</span>
                </div>
                <div className="flex justify-between py-1 border-b text-emerald-800 font-semibold">
                  <span>Penerimaan Iuran Warga (88 KK):</span>
                  <span className="font-mono">+{formatRupiah(stats.totalIuranTerkumpul)}</span>
                </div>
                <div className="flex justify-between py-1 border-b text-rose-800 font-semibold">
                  <span>Total Pengeluaran Kas:</span>
                  <span className="font-mono">-{formatRupiah(stats.totalPengeluaran)}</span>
                </div>
                <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm sm:text-base font-black bg-slate-100 px-2 rounded">
                  <span>SALDO AKHIR KAS RT:</span>
                  <span className="font-mono text-emerald-800">{formatRupiah(stats.saldoAkhir)}</span>
                </div>
              </div>

              {/* Tanda tangan dinamis sesuai pengaturan superadmin */}
              <div className="mt-8 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Ketua RT 02</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline">{settings.leader}</p>
                </div>
                <div>
                  <p>Bendahara RT 02</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline">{settings.treasurer}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 6: PENGATURAN SUPERADMIN (PRIVILEGE TINGGI ADMIN) --- */}
        {activeTab === 'pengaturan' && currentUser?.role === 'admin' && (
          <div className="bg-[#1C1C1E] border border-white/10 rounded-[30px] p-6 max-w-xl mx-auto shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 rounded-2xl bg-[#30D158] text-black">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Panel Pengaturan Superadmin</h2>
                <p className="text-xs text-slate-400">Hak Akses Tertinggi Pengurus RT 02 Tembalang</p>
              </div>
            </div>

            <form onSubmit={handleSaveAdminSettings} className="space-y-4 text-xs">
              <div className="bg-[#2C2C2E]/60 p-4 rounded-[22px] border border-white/5 space-y-3">
                <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#30D158]" /> Identitas Pengurus & Lembar Cetak A4
                </h3>
                
                <div>
                  <label className="block text-slate-400 mb-1">Nama Ketua RT (Tercetak di Lembar A4)</label>
                  <input
                    type="text"
                    value={adminForm.leader}
                    onChange={(e) => setAdminForm({ ...adminForm, leader: e.target.value })}
                    className="w-full min-h-[42px] bg-[#1C1C1E] border border-white/10 rounded-[14px] px-3.5 text-white text-xs focus:border-[#30D158] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nama Bendahara (Tercetak di Lembar A4)</label>
                  <input
                    type="text"
                    value={adminForm.treasurer}
                    onChange={(e) => setAdminForm({ ...adminForm, treasurer: e.target.value })}
                    className="w-full min-h-[42px] bg-[#1C1C1E] border border-white/10 rounded-[14px] px-3.5 text-white text-xs focus:border-[#30D158] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Besaran Iuran Bulanan Standar (Rp)</label>
                  <input
                    type="number"
                    value={adminForm.defaultDues}
                    onChange={(e) => setAdminForm({ ...adminForm, defaultDues: e.target.value })}
                    className="w-full min-h-[42px] bg-[#1C1C1E] border border-white/10 rounded-[14px] px-3.5 text-white text-xs focus:border-[#30D158] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Ganti Password Pengurus */}
              <div className="bg-[#2C2C2E]/60 p-4 rounded-[22px] border border-white/5 space-y-3">
                <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" /> Ganti Password Akun Pengurus
                </h3>

                <div>
                  <label className="block text-slate-400 mb-1">Pilih Jabatan yang Ingin Diganti Password-nya</label>
                  <select
                    value={adminForm.targetRoleToChange}
                    onChange={(e) => setAdminForm({ ...adminForm, targetRoleToChange: e.target.value })}
                    className="w-full min-h-[42px] bg-[#1C1C1E] border border-white/10 rounded-[14px] px-3 text-white text-xs capitalize"
                  >
                    <option value="bendahara">Bendahara</option>
                    <option value="ketua_rt">Ketua RT</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Password Baru (Kosongkan jika tidak ingin mengubah)</label>
                  <input
                    type="text"
                    placeholder="Masukkan password baru..."
                    value={adminForm.newPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, newPassword: e.target.value })}
                    className="w-full min-h-[42px] bg-[#1C1C1E] border border-white/10 rounded-[14px] px-3.5 text-white text-xs focus:border-[#30D158] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[46px] bg-gradient-to-r from-emerald-600 to-[#30D158] text-black font-extrabold rounded-[18px] text-xs shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Simpan Konfigurasi Superadmin
              </button>
            </form>
          </div>
        )}

      </main>

      {/* 5. BOTTOM NAVIGATION BAR (MOBILE) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1C1C1E]/95 border-t border-white/10 backdrop-blur-2xl px-2 py-2 sm:hidden flex justify-around items-center">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 ${activeTab === 'dashboard' ? 'text-[#30D158]' : 'text-slate-400'}`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-[9px] font-bold">Dashboard</span>
        </button>

        {sessionToken ? (
          <>
            <button
              onClick={() => setActiveTab('matriks')}
              className={`flex flex-col items-center gap-1 p-1.5 ${activeTab === 'matriks' ? 'text-[#30D158]' : 'text-slate-400'}`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-[9px] font-bold">Iuran</span>
            </button>
            <button
              onClick={() => setActiveTab('kas')}
              className={`flex flex-col items-center gap-1 p-1.5 ${activeTab === 'kas' ? 'text-[#30D158]' : 'text-slate-400'}`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-[9px] font-bold">Buku Kas</span>
            </button>
            <button
              onClick={() => setActiveTab('warga')}
              className={`flex flex-col items-center gap-1 p-1.5 ${activeTab === 'warga' ? 'text-[#30D158]' : 'text-slate-400'}`}
            >
              <User className="w-4 h-4" />
              <span className="text-[9px] font-bold">Warga</span>
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('pengaturan')}
                className={`flex flex-col items-center gap-1 p-1.5 ${activeTab === 'pengaturan' ? 'text-[#30D158]' : 'text-slate-400'}`}
              >
                <Settings className="w-4 h-4" />
                <span className="text-[9px] font-bold">Admin</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#30D158] py-1 bg-emerald-950/70 border border-emerald-500/30 px-3 rounded-full"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Login Pengurus</span>
          </button>
        )}
      </div>

      {/* MODAL LOGIN PENGURUS */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-[#30D158] rounded-[22px] mx-auto flex items-center justify-center text-black mb-4 shadow-xl">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">Login Pengurus RT 02</h2>
            <p className="text-xs text-slate-400 mt-1 mb-6">Pilih jabatan dan masukkan password Anda</p>

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jabatan Akses</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bendahara', 'ketua_rt', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setLoginRole(r)}
                      className={`min-h-[44px] py-2 rounded-[16px] text-xs font-bold capitalize transition border ${loginRole === r ? 'bg-[#30D158] text-black border-[#30D158]' : 'bg-[#2C2C2E] text-slate-300 border-white/10'}`}
                    >
                      {r === 'ketua_rt' ? 'Ketua RT' : r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="Masukkan Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full min-h-[44px] bg-[#2C2C2E] border border-white/10 rounded-[18px] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#30D158] transition"
                  required
                />
              </div>

              {loginError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-[16px] text-rose-300 text-xs font-semibold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full min-h-[46px] bg-gradient-to-r from-[#34C759] to-[#30D158] text-black font-extrabold py-3.5 rounded-[18px] text-sm shadow-xl hover:opacity-95 transition flex items-center justify-center gap-2 mt-2"
              >
                {isAuthenticating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Masuk Sistem
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATAT KAS */}
      {showAddTrx && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 max-w-md w-full shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-white">Catat Kas</h3>
              <button onClick={() => setShowAddTrx(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Jenis Kas</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTrx({ ...newTrx, type: 'IN' })}
                    className={`min-h-[44px] rounded-[16px] font-bold border ${newTrx.type === 'IN' ? 'bg-[#30D158] text-black border-[#30D158]' : 'bg-[#2C2C2E] text-slate-300 border-white/10'}`}
                  >
                    Pemasukan (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTrx({ ...newTrx, type: 'OUT' })}
                    className={`min-h-[44px] rounded-[16px] font-bold border ${newTrx.type === 'OUT' ? 'bg-rose-600 text-white border-rose-600' : 'bg-[#2C2C2E] text-slate-300 border-white/10'}`}
                  >
                    Pengeluaran (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Kategori</label>
                <select
                  value={newTrx.category}
                  onChange={(e) => setNewTrx({ ...newTrx, category: e.target.value })}
                  className="w-full min-h-[44px] bg-[#2C2C2E] border border-white/10 rounded-[16px] p-2.5 text-white"
                >
                  <option value="Keamanan & Kebersihan">Keamanan & Kebersihan</option>
                  <option value="Perawatan Lingkungan">Perawatan Lingkungan</option>
                  <option value="Sosial Kemasyarakatan">Sosial Kemasyarakatan</option>
                  <option value="Iuran Bulanan">Iuran Bulanan</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 150000"
                  value={newTrx.amount}
                  onChange={(e) => setNewTrx({ ...newTrx, amount: e.target.value })}
                  className="w-full min-h-[44px] bg-[#2C2C2E] border border-white/10 rounded-[16px] px-3.5 py-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Uraian / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Beli lampu portal gang"
                  value={newTrx.description}
                  onChange={(e) => setNewTrx({ ...newTrx, description: e.target.value })}
                  className="w-full min-h-[44px] bg-[#2C2C2E] border border-white/10 rounded-[16px] px-3.5 py-2.5 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTrx(false)}
                  className="w-1/2 min-h-[44px] border border-white/10 rounded-[16px] text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingTrx}
                  className="w-1/2 min-h-[44px] bg-gradient-to-r from-emerald-600 to-[#30D158] text-black font-extrabold rounded-[16px] shadow-lg flex items-center justify-center gap-1.5"
                >
                  {submittingTrx ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}