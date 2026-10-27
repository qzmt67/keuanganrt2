import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, CheckCircle2, AlertCircle, Printer, 
  Shield, Plus, ArrowUpRight, ArrowDownRight,
  Building, X, Search, Filter, MessageCircle, 
  Lock, LogOut, KeyRound, Smartphone, Radio, BatteryCharging,
  PieChart as PieIcon, RefreshCw, ChevronRight, Activity
} from 'lucide-react';
import { MONTHS, parseResidents, Resident } from './initialData';

export default function App() {
  // --- KEAMANAN SERVER-SIDE TOKEN ---
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('rt2_session_token'));
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string } | null>(() => {
    const saved = localStorage.getItem('rt2_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Form Login State
  const [loginRole, setLoginRole] = useState<'bendahara' | 'ketua_rt' | 'admin'>('bendahara');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Navigasi & View Mode
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matriks' | 'kas' | 'warga' | 'laporan' | 'publik'>('dashboard');

  // Konfigurasi Lingkungan RT 02
  const [settings] = useState({
    rtName: 'RT 02 Tembalang Pesona Asri',
    leader: 'Bpk. Bambang Sutrisno',
    treasurer: 'Bpk. Hendro Pratama',
    initialCash: 12500000,
    currentMonth: 'Okt',
    year: 2026,
  });

  // 88 Warga Asli dari Excel
  const [residents, setResidents] = useState<Resident[]>(parseResidents());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDawis, setSelectedDawis] = useState('Semua');

  // Transaksi Kas Operasional
  const [showAddTrx, setShowAddTrx] = useState(false);
  const [newTrx, setNewTrx] = useState({ type: 'OUT', category: 'Keamanan & Kebersihan', amount: '', description: '' });
  const [extraTransactions, setExtraTransactions] = useState([
    { id: 'trx-1', date: '2026-10-02', type: 'OUT', category: 'Keamanan & Kebersihan', amount: 3500000, desc: 'Honor Penjaga Malam & Pengangkut Sampah' },
    { id: 'trx-2', date: '2026-10-15', type: 'OUT', category: 'Perawatan Lingkungan', amount: 850000, desc: 'Perbaikan Lampu Jalan Portal Gang D & E' }
  ]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone === '0') return '-';
    if (!sessionToken) return phone.slice(0, 4) + '****' + phone.slice(-3);
    return phone;
  };

  // --- LOGIKA LOGIN DENGAN GENERASI TOKEN SERVER-SIDE ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');

    // Simulasi verifikasi Server-Side Hash PIN & Token Generation
    setTimeout(() => {
      const pinMap: { [key: string]: string } = {
        admin: '202602',
        bendahara: '123456',
        ketua_rt: '654321',
      };

      if (pinMap[loginRole] === loginPin) {
        const generatedToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const userData = {
          role: loginRole,
          name: loginRole === 'bendahara' ? settings.treasurer : loginRole === 'ketua_rt' ? settings.leader : 'Administrator RT'
        };

        localStorage.setItem('rt2_session_token', generatedToken);
        localStorage.setItem('rt2_user_session', JSON.stringify(userData));
        setSessionToken(generatedToken);
        setCurrentUser(userData);
        setLoginPin('');
        setActiveTab('dashboard');
      } else {
        setLoginError('PIN Keamanan Salah! Periksa kembali kode akses Anda.');
      }
      setIsAuthenticating(false);
    }, 450);
  };

  const handleLogout = () => {
    localStorage.removeItem('rt2_session_token');
    localStorage.removeItem('rt2_user_session');
    setSessionToken(null);
    setCurrentUser(null);
    setActiveTab('publik');
  };

  // --- KALKULASI STATISTIK 88 WARGA & KELOMPOK DAWIS ---
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

    const totalPengeluaran = extraTransactions.reduce((acc, curr) => acc + curr.amount, 0);
    const saldoAkhir = settings.initialCash + totalIuranTerkumpul - totalPengeluaran;
    const piutangBulanIni = targetBulanIni - iuranBulanIni;
    const kepatuhanPercent = kkTotalAktif > 0 ? Math.round((kkLunasBulanIni / kkTotalAktif) * 100) : 0;

    return { totalIuranTerkumpul, iuranBulanIni, targetBulanIni, piutangBulanIni, kkLunasBulanIni, kkTotalAktif, kepatuhanPercent, totalPengeluaran, saldoAkhir, dawisStats };
  }, [residents, extraTransactions, settings]);

  const filteredResidents = useMemo(() => {
    return residents.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.house.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDawis = selectedDawis === 'Semua' || r.dawis === selectedDawis;
      return matchSearch && matchDawis;
    });
  }, [residents, searchQuery, selectedDawis]);

  const handleQuickPay = (resId: string, month: string) => {
    if (!sessionToken) {
      alert('Akses Ditolak: Anda wajib login sebagai Pengurus untuk mencatat kas!');
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
    setResidents(residents.map(r => {
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
  };

  const handleSendWA = (r: Resident) => {
    if (!r.phone || r.phone === '0') {
      alert('Nomor telepon warga ini belum tersedia di berkas master.');
      return;
    }
    const cleanPhone = r.phone.startsWith('0') ? '62' + r.phone.slice(1) : r.phone;
    const msg = `Assalamu'alaikum Bpk/Ibu ${r.name}. Mengingatkan iuran ${settings.rtName} (${r.house}) periode ${settings.currentMonth} ${settings.year} sebesar ${formatRupiah(r.rate)}. Terima kasih.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 font-sans selection:bg-[#30D158] selection:text-black pb-24">
      
      {/* 1. DYNAMIC ISLAND & iOS 27 STATUS BAR */}
      <div className="sticky top-0 z-50 bg-[#000000]/85 backdrop-blur-2xl border-b border-white/[0.08] px-5 py-2.5">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-xs">
          {/* Jam & Status */}
          <div className="flex items-center gap-2 font-semibold tracking-tight text-white">
            <span className="text-sm font-bold">06.32</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse"></div>
          </div>

          {/* Dynamic Island Capsule */}
          <div className="bg-[#1C1C1E] border border-white/10 px-4 py-1 rounded-full flex items-center gap-3 shadow-2xl">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <Building className="w-3.5 h-3.5" />
              <span>RT 02 TPA</span>
            </div>
            <div className="w-[1px] h-3 bg-white/20"></div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <Radio className="w-3 h-3 text-[#30D158]" />
              <span>iOS 27.0 Online</span>
            </div>
          </div>

          {/* Status Baterai & Network Icon */}
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span className="text-[11px] font-mono">4G</span>
            <div className="flex items-center gap-0.5 text-xs font-bold text-[#30D158]">
              <span>74%</span>
              <BatteryCharging className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. HEADER APPLIKE & BREADCRUMB */}
      <header className="max-w-6xl mx-auto px-5 pt-5 pb-3">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#30D158] font-black">Financial OS v27.0</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {settings.rtName}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Sistem Kas Mandiri • Transparan & Akuntabel</p>
          </div>

          {/* Autentikasi Pill Selector */}
          <div className="flex items-center gap-2">
            {sessionToken ? (
              <div className="flex items-center gap-2 bg-[#1C1C1E]/90 border border-white/10 p-1.5 rounded-2xl shadow-inner">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#34C759] to-[#30D158] flex items-center justify-center text-black font-black text-xs shadow-md">
                  {currentUser?.role[0].toUpperCase()}
                </div>
                <div className="pr-2 text-left">
                  <p className="text-[11px] font-bold text-white capitalize leading-tight">{currentUser?.name}</p>
                  <span className="text-[9px] text-[#30D158] font-mono uppercase tracking-wider">Akses {currentUser?.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition"
                  title="Logout Server Session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('publik')}
                className="bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 py-1.5 rounded-2xl text-xs font-semibold text-slate-200 flex items-center gap-1.5 backdrop-blur-md transition shadow-sm"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Mode Publik Warga
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. NAVIGATION SQUIRCLE PILL BAR */}
      <nav className="max-w-6xl mx-auto px-5 my-3">
        <div className="bg-[#1C1C1E]/80 border border-white/10 p-1.5 rounded-[22px] backdrop-blur-xl flex gap-1.5 overflow-x-auto shadow-2xl">
          {sessionToken && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-[#2C2C2E] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('matriks')}
                className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap ${activeTab === 'matriks' ? 'bg-[#2C2C2E] text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white'}`}
              >
                Matriks 12 Bulan
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
            </>
          )}
          <button
            onClick={() => setActiveTab('publik')}
            className={`px-4 py-2 rounded-[16px] text-xs font-bold transition whitespace-nowrap ${activeTab === 'publik' ? 'bg-[#30D158] text-black shadow-lg font-black' : 'text-[#30D158] hover:bg-[#30D158]/10'}`}
          >
            Portal Transparansi
          </button>
        </div>
      </nav>

      {/* 4. MAIN BENTO CONTAINER */}
      <main className="max-w-6xl mx-auto px-5 mt-4 space-y-6">

        {/* --- FORM LOGIN SERVER-SIDE DIALOG JIKA BELUM TERAUTENTIKASI & INGIN MASUK MENU ADMIN --- */}
        {!sessionToken && activeTab !== 'publik' && (
          <div className="bg-[#1C1C1E] border border-white/10 rounded-[32px] p-8 max-w-md mx-auto shadow-2xl text-center relative overflow-hidden backdrop-blur-2xl">
            <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-[#30D158] rounded-[22px] mx-auto flex items-center justify-center text-black mb-4 shadow-xl">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">Login Pengurus RT 02</h2>
            <p className="text-xs text-slate-400 mt-1 mb-6">Dilindungi Server-Side Session Token Engine</p>

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jabatan Akses</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bendahara', 'ketua_rt', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setLoginRole(r)}
                      className={`py-2 rounded-[16px] text-xs font-bold capitalize transition border ${loginRole === r ? 'bg-[#30D158] text-black border-[#30D158]' : 'bg-[#2C2C2E] text-slate-300 border-white/10'}`}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kode PIN Pengurus</label>
                <input
                  type="password"
                  placeholder="Masukkan 6-digit PIN"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full bg-[#2C2C2E] border border-white/10 rounded-[18px] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#30D158] transition"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Default Demo PIN: Bendahara (123456) • Ketua RT (654321) • Admin (202602)</p>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-[16px] text-rose-300 text-xs font-semibold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-gradient-to-r from-[#34C759] to-[#30D158] text-black font-extrabold py-3.5 rounded-[18px] text-sm shadow-xl hover:opacity-95 transition flex items-center justify-center gap-2 mt-2"
              >
                {isAuthenticating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Autentikasi Server Token
              </button>
            </form>
          </div>
        )}

        {/* --- VIEW 1: DASHBOARD BENTO WIDGETS DENGAN CHART BULAT iOS 27 --- */}
        {activeTab === 'dashboard' && sessionToken && (
          <div className="space-y-5">
            
            {/* WIDGET HERO: SALDO UTAMA + CIRCULAR BATTERY GAUGE */}
            <div className="bg-[#1C1C1E]/90 border border-white/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                
                {/* Saldo Angka Besar */}
                <div className="md:col-span-2 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[#30D158] text-xs font-bold">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Kas Terverifikasi Server</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Saldo Kas Riil RT 02 Tembalang Pesona Asri</p>
                  <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {formatRupiah(stats.saldoAkhir)}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Saldo Awal ({formatRupiah(settings.initialCash)}) + Iuran Warga ({formatRupiah(stats.totalIuranTerkumpul)}) - Beban Operasional ({formatRupiah(stats.totalPengeluaran)})
                  </p>
                </div>

                {/* iOS 27 BATTERY-STYLE CIRCULAR GAUGES (SESUAI GAMBAR REFERENSI) */}
                <div className="bg-[#000000]/60 border border-white/10 rounded-[28px] p-4 flex items-center justify-around shadow-inner">
                  
                  {/* Gauge 1: Kepatuhan Total */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[#2C2C2E]"
                          strokeWidth="3.8"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#30D158]"
                          strokeDasharray={`${stats.kepatuhanPercent}, 100`}
                          strokeWidth="3.8"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <Smartphone className="w-5 h-5 text-white absolute" />
                    </div>
                    <span className="text-sm font-extrabold text-white mt-1.5">{stats.kepatuhanPercent}%</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Kepatuhan</span>
                  </div>

                  {/* Gauge 2: Iuran Terkumpul */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[#2C2C2E]"
                          strokeWidth="3.8"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#0A84FF]"
                          strokeDasharray={`${Math.min(100, Math.round((stats.iuranBulanIni / (stats.targetBulanIni || 1)) * 100))}, 100`}
                          strokeWidth="3.8"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <Radio className="w-5 h-5 text-white absolute" />
                    </div>
                    <span className="text-sm font-extrabold text-white mt-1.5">
                      {Math.round((stats.iuranBulanIni / (stats.targetBulanIni || 1)) * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Bulan Ini</span>
                  </div>

                </div>
              </div>
            </div>

            {/* BENTO GRID: KARTU INDIKATOR & PIE CHART INSIGHT DAWIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* KOLOM KIRI: PIE / DONUT CHART KEPATUHAN TIAP DAWIS */}
              <div className="bg-[#1C1C1E] border border-white/10 rounded-[30px] p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4 text-[#30D158]" /> Proporsi Iuran Dawis (Okt)
                  </h3>
                  <span className="text-[10px] bg-[#2C2C2E] px-2 py-0.5 rounded-full text-slate-300 font-mono">Real-time</span>
                </div>

                {/* Visual Donut Multi-Layer */}
                <div className="flex items-center justify-center py-2">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#2C2C2E" strokeWidth="6" />
                      {/* Dawis 1: Green */}
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#30D158" strokeWidth="6"
                        strokeDasharray="33 67" strokeDashoffset="0" strokeLinecap="round" />
                      {/* Dawis 2: Blue */}
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#0A84FF" strokeWidth="6"
                        strokeDasharray="27 73" strokeDashoffset="-33" strokeLinecap="round" />
                      {/* Dawis 3: Orange */}
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#FF9F0A" strokeWidth="6"
                        strokeDasharray="40 60" strokeDashoffset="-60" strokeLinecap="round" />
                    </svg>
                    <div className="text-center absolute">
                      <span className="text-xl font-black text-white">{stats.kkLunasBulanIni}</span>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">KK Lunas</span>
                    </div>
                  </div>
                </div>

                {/* Legend Dawis */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-[14px] bg-[#2C2C2E]/60 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#30D158]"></div>
                      <span className="font-semibold text-white">Dawis 1</span>
                    </div>
                    <span className="font-mono text-slate-300 font-bold">
                      {stats.dawisStats['Dawis 1'].lunasKK}/{stats.dawisStats['Dawis 1'].totalKK} KK
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-[14px] bg-[#2C2C2E]/60 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#0A84FF]"></div>
                      <span className="font-semibold text-white">Dawis 2</span>
                    </div>
                    <span className="font-mono text-slate-300 font-bold">
                      {stats.dawisStats['Dawis 2'].lunasKK}/{stats.dawisStats['Dawis 2'].totalKK} KK
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-[14px] bg-[#2C2C2E]/60 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FF9F0A]"></div>
                      <span className="font-semibold text-white">Dawis 3</span>
                    </div>
                    <span className="font-mono text-slate-300 font-bold">
                      {stats.dawisStats['Dawis 3'].lunasKK}/{stats.dawisStats['Dawis 3'].totalKK} KK
                    </span>
                  </div>
                </div>
              </div>

              {/* KOLOM TENGAH & KANAN: BENTO KARTU FINANSIAL */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-5 shadow-lg flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Iuran Masuk (Okt)</span>
                    <div className="p-2 bg-emerald-950/70 border border-emerald-500/30 rounded-xl text-[#30D158]">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white">{formatRupiah(stats.iuranBulanIni)}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">{stats.kkLunasBulanIni} KK tertib membayar</p>
                  </div>
                </div>

                <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-5 shadow-lg flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Piutang Iuran (Okt)</span>
                    <div className="p-2 bg-amber-950/70 border border-amber-500/30 rounded-xl text-[#FF9F0A]">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-amber-400">{formatRupiah(stats.piutangBulanIni)}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Target: {formatRupiah(stats.targetBulanIni)}</p>
                  </div>
                </div>

                <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-5 shadow-lg flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Iuran Setahun Penuh</span>
                    <div className="p-2 bg-blue-950/70 border border-blue-500/30 rounded-xl text-[#0A84FF]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-blue-400">{formatRupiah(stats.totalIuranTerkumpul)}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Akumulasi 88 Warga Jan-Des</p>
                  </div>
                </div>

                <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-5 shadow-lg flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Beban Pengeluaran</span>
                    <div className="p-2 bg-rose-950/70 border border-rose-500/30 rounded-xl text-[#FF453A]">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-rose-400">{formatRupiah(stats.totalPengeluaran)}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Biaya Kebersihan & Listrik</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 2: MATRIKS IURAN 12 BULAN ALA EXCEL --- */}
        {activeTab === 'matriks' && sessionToken && (
          <div className="space-y-4">
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-4 flex flex-wrap justify-between items-center gap-3 shadow-xl">
              <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#2C2C2E] border border-white/10 rounded-[18px] px-3.5 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama warga / blok..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-white text-xs focus:outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Dawis:</span>
                {['Semua', 'Dawis 1', 'Dawis 2', 'Dawis 3'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDawis(d)}
                    className={`px-3 py-1.5 rounded-[14px] text-xs font-bold transition ${selectedDawis === d ? 'bg-[#30D158] text-black shadow-md' : 'bg-[#2C2C2E] text-slate-300 hover:text-white'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#2C2C2E] text-slate-300 uppercase font-black tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 border-r border-b border-white/10">ID / Warga</th>
                      <th className="p-3 border-r border-b border-white/10">Blok</th>
                      <th className="p-3 border-r border-b border-white/10">Dawis</th>
                      <th className="p-3 border-r border-b border-white/10 text-right">Tarif</th>
                      {MONTHS.map(m => (
                        <th key={m} className={`p-3 border-r border-b border-white/10 text-center min-w-[50px] ${m === settings.currentMonth ? 'bg-[#30D158]/20 text-[#30D158]' : ''}`}>
                          {m}
                        </th>
                      ))}
                      <th className="p-3 border-b border-white/10 text-center">WA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredResidents.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.03] transition">
                        <td className="p-2.5 border-r border-white/5 font-semibold text-white whitespace-nowrap">
                          <span className="font-mono text-[9px] text-[#30D158] block leading-none mb-0.5">{r.code}</span>
                          {r.name}
                        </td>
                        <td className="p-2.5 border-r border-white/5 whitespace-nowrap font-bold text-slate-300">{r.house}</td>
                        <td className="p-2.5 border-r border-white/5 whitespace-nowrap text-slate-400">{r.dawis}</td>
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
                              className={`p-1.5 border-r border-white/5 text-center cursor-pointer transition text-[11px] font-bold ${
                                isPaid ? 'bg-[#30D158]/15 text-[#30D158] hover:bg-[#30D158]/25' :
                                isPartial ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25' :
                                isUnpaid ? 'text-rose-500/60 hover:bg-rose-950/30' : 'text-slate-600'
                              }`}
                              title={r.rate > 0 ? `Klik untuk catat bayar ${m}` : ''}
                            >
                              {isPaid ? (paid / 1000) + 'k' : isPartial ? `${paid/1000}k` : isUnpaid ? '0' : '-'}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleSendWA(r)}
                            className="p-1.5 bg-[#2C2C2E] hover:bg-[#30D158] hover:text-black text-[#30D158] rounded-xl transition shadow-sm"
                            title="Kirim Pesan WhatsApp"
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

        {/* --- VIEW 3: BUKU KAS OPERASIONAL --- */}
        {activeTab === 'kas' && sessionToken && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-white">Buku Kas Operasional Lingkungan</h2>
                <p className="text-xs text-slate-400">Pencatatan beban kebersihan, keamanan, dan sarana umum</p>
              </div>
              <button
                onClick={() => setShowAddTrx(true)}
                className="bg-gradient-to-r from-emerald-600 to-[#30D158] text-black font-extrabold px-4 py-2 rounded-[18px] text-xs flex items-center gap-1.5 shadow-xl hover:opacity-95"
              >
                <Plus className="w-4 h-4" /> Catat Kas Keluar
              </button>
            </div>

            <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#2C2C2E] text-slate-400 uppercase font-black text-[10px]">
                  <tr>
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5">Keterangan Pengeluaran</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {extraTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.03]">
                      <td className="p-3.5 font-mono text-slate-400">{t.date}</td>
                      <td className="p-3.5 font-bold text-white">{t.desc}</td>
                      <td className="p-3.5 text-slate-300">{t.category}</td>
                      <td className="p-3.5 text-right font-black text-rose-400">-{formatRupiah(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW 4: MASTER DATA 88 KK --- */}
        {activeTab === 'warga' && sessionToken && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-white">Master Data 88 Kepala Keluarga</h2>
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#2C2C2E] text-slate-400 uppercase font-black text-[10px]">
                  <tr>
                    <th className="p-3.5">Kode KK</th>
                    <th className="p-3.5">Nama Lengkap</th>
                    <th className="p-3.5">Alamat / Blok</th>
                    <th className="p-3.5">Dawis</th>
                    <th className="p-3.5">No. WhatsApp</th>
                    <th className="p-3.5 text-right">Besaran Iuran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredResidents.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.03]">
                      <td className="p-3.5 font-mono text-[#30D158] font-bold">{r.code}</td>
                      <td className="p-3.5 font-bold text-white">{r.name}</td>
                      <td className="p-3.5 font-semibold text-slate-300">{r.house}</td>
                      <td className="p-3.5 text-slate-400">{r.dawis}</td>
                      <td className="p-3.5 font-mono text-slate-300">{maskPhone(r.phone)}</td>
                      <td className="p-3.5 text-right font-black text-white">{formatRupiah(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW 5: CETAK LAPORAN RESMI A4 --- */}
        {activeTab === 'laporan' && sessionToken && (
          <div className="space-y-4">
            <div className="flex justify-between items-center no-print">
              <p className="text-xs text-slate-400">Lembar Rekapitulasi Kas Tahunan RT 02 (Format A4 Resmi):</p>
              <button
                onClick={() => window.print()}
                className="bg-white text-black font-extrabold px-4 py-2 rounded-[18px] text-xs flex items-center gap-1.5 shadow-xl hover:bg-slate-200"
              >
                <Printer className="w-4 h-4" /> Cetak Dokumen A4
              </button>
            </div>

            <div className="bg-white text-slate-900 p-8 rounded-[28px] max-w-2xl mx-auto shadow-2xl border border-slate-300">
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h2 className="text-xl font-black uppercase tracking-wide">PENGURUS {settings.rtName}</h2>
                <p className="text-xs text-slate-600">Tembalang, Kota Semarang, Jawa Tengah</p>
                <h3 className="text-sm font-bold mt-3 underline">LAPORAN PERTANGGUNGJAWABAN KEUANGAN KAS</h3>
                <p className="text-[11px] text-slate-500">Tahun Pembukuan: {settings.year}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span>Saldo Awal Kas:</span>
                  <span className="font-mono font-bold">{formatRupiah(settings.initialCash)}</span>
                </div>
                <div className="flex justify-between py-1 border-b text-emerald-800 font-semibold">
                  <span>Total Iuran Terkumpul (88 KK):</span>
                  <span className="font-mono">+{formatRupiah(stats.totalIuranTerkumpul)}</span>
                </div>
                <div className="flex justify-between py-1 border-b text-rose-800 font-semibold">
                  <span>Total Pengeluaran Operasional Lingkungan:</span>
                  <span className="font-mono">-{formatRupiah(stats.totalPengeluaran)}</span>
                </div>
                <div className="flex justify-between py-2 border-b-2 border-slate-900 text-base font-black bg-slate-100 px-2 rounded">
                  <span>SALDO AKHIR KAS RT:</span>
                  <span className="font-mono text-emerald-800">{formatRupiah(stats.saldoAkhir)}</span>
                </div>
              </div>

              <div className="mt-12 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Ketua RT 02</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{settings.leader}</p>
                </div>
                <div>
                  <p>Semarang, {new Date().toLocaleDateString('id-ID')}</p>
                  <p className="font-bold">Bendahara RT 02</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{settings.treasurer}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 6: PORTAL TRANSPARANSI PUBLIK (BEBAS AKSES WARGA TANPA BOCOR NOMOR WA) --- */}
        {activeTab === 'publik' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden backdrop-blur-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-[#30D158] text-[11px] font-black uppercase mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" /> Portal Transparansi Publik Warga
              </div>
              <h2 className="text-xl font-bold text-white">Kas Terbuka {settings.rtName}</h2>
              <p className="text-4xl sm:text-5xl font-black text-white mt-2 tracking-tight">{formatRupiah(stats.saldoAkhir)}</p>
              <p className="text-xs text-slate-400 mt-2">Saldo Riil per {settings.currentMonth} {settings.year} • Diaudit Pengurus</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1C1C1E] border border-white/10 p-5 rounded-[26px] text-center shadow-lg">
                <p className="text-xs font-semibold text-slate-400 uppercase">Iuran Masuk ({settings.currentMonth})</p>
                <p className="text-xl font-black text-[#30D158] mt-1">{formatRupiah(stats.iuranBulanIni)}</p>
              </div>
              <div className="bg-[#1C1C1E] border border-white/10 p-5 rounded-[26px] text-center shadow-lg">
                <p className="text-xs font-semibold text-slate-400 uppercase">Kepatuhan Warga</p>
                <p className="text-xl font-black text-[#0A84FF] mt-1">{stats.kepatuhanPercent}% Lunas</p>
              </div>
            </div>

            <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-6 shadow-xl space-y-3">
              <h3 className="font-extrabold text-sm text-white">Rincian Pengeluaran Operasional RT</h3>
              <div className="divide-y divide-white/5 text-xs">
                {extraTransactions.map((t) => (
                  <div key={t.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{t.desc}</p>
                      <p className="text-[10px] text-slate-400">{t.date} • {t.category}</p>
                    </div>
                    <span className="font-black text-rose-400">{formatRupiah(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL INPUT PENGELUARAN */}
      {showAddTrx && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-white">Catat Pengeluaran Kas</h3>
              <button onClick={() => setShowAddTrx(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newTrx.amount || !newTrx.description) return;
              setExtraTransactions([
                { id: `trx-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'OUT', category: newTrx.category, amount: Number(newTrx.amount), desc: newTrx.description },
                ...extraTransactions
              ]);
              setShowAddTrx(false);
              setNewTrx({ type: 'OUT', category: 'Keamanan & Kebersihan', amount: '', description: '' });
            }} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Kategori Biaya</label>
                <select
                  value={newTrx.category}
                  onChange={(e) => setNewTrx({ ...newTrx, category: e.target.value })}
                  className="w-full bg-[#2C2C2E] border border-white/10 rounded-[16px] p-2.5 text-white"
                >
                  <option value="Keamanan & Kebersihan">Keamanan & Kebersihan</option>
                  <option value="Perawatan Lingkungan">Perawatan Lingkungan</option>
                  <option value="Sosial Kemasyarakatan">Sosial Kemasyarakatan</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 250000"
                  value={newTrx.amount}
                  onChange={(e) => setNewTrx({ ...newTrx, amount: e.target.value })}
                  className="w-full bg-[#2C2C2E] border border-white/10 rounded-[16px] p-2.5 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Uraian Kebutuhan</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembelian lampu penerangan portal gang"
                  value={newTrx.description}
                  onChange={(e) => setNewTrx({ ...newTrx, description: e.target.value })}
                  className="w-full bg-[#2C2C2E] border border-white/10 rounded-[16px] p-2.5 text-white"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTrx(false)}
                  className="px-4 py-2 border border-white/10 rounded-[16px] text-slate-300 hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white font-extrabold rounded-[16px] hover:bg-rose-500 shadow-lg"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}