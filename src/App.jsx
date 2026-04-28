import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Upload, 
  FileSpreadsheet, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Settings,
  CreditCard,
  Plus,
  Sparkles,
  Newspaper
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Mock Initial Data
// Mock Initial Data - Set to empty for production use
const INITIAL_TRANSACTIONS = [];

const COLORS = ['#0145F2', '#6366F1', '#0EA5E9', '#3B82F6', '#1D4ED8'];

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('finance_flow_live');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  useEffect(() => {
    localStorage.setItem('finance_flow_live', JSON.stringify(transactions));
  }, [transactions]);

  // Calculations
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const expense = Math.abs(transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0));
    const balance = income - expense;
    return { income, expense, balance };
  }, [transactions]);

  const categoryData = useMemo(() => {
    const groups = transactions
      .filter(t => t.amount < 0)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
      }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const chartData = useMemo(() => {
    // Simplified daily trend
    const dates = [...new Set(transactions.map(t => t.date))].sort();
    return dates.map(date => ({
      date,
      amount: Math.abs(transactions.filter(t => t.date === date && t.amount < 0).reduce((acc, t) => acc + t.amount, 0))
    }));
  }, [transactions]);

  // Handlers
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Basic normalization logic
      const newTransactions = data.map((item, index) => ({
        id: Date.now() + index,
        date: item['거래일자'] || item['날짜'] || new Date().toISOString().split('T')[0],
        title: item['가맹점명'] || item['내용'] || '알 수 없는 지출',
        amount: parseFloat(item['금액'] || item['거래금액'] || 0),
        category: autoCategorize(item['가맹점명'] || item['내용'] || ''),
        provider: '파일 업로드'
      }));

      setTransactions(prev => [...newTransactions, ...prev]);
      alert(`${newTransactions.length}개의 거래 내역을 성공적으로 불러왔습니다.`);
    };
    reader.readAsBinaryString(file);
  };

  const autoCategorize = (title) => {
    if (title.includes('식당') || title.includes('카페') || title.includes('스타벅스')) return '식비';
    if (title.includes('쿠팡') || title.includes('마트')) return '쇼핑';
    if (title.includes('버스') || title.includes('택시') || title.includes('지하철')) return '교통';
    if (title.includes('월세') || title.includes('관리비')) return '주거';
    return '기타';
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    amount: '',
    category: '식비',
    type: '지출', // '수입' or '지출'
    provider: '수동 입력'
  });

  const [aiReport, setAiReport] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleManualAdd = (e) => {
    e.preventDefault();
    const amount = parseFloat(newTransaction.amount);
    const finalAmount = newTransaction.type === '지출' ? -Math.abs(amount) : Math.abs(amount);
    
    const transaction = {
      id: Date.now(),
      ...newTransaction,
      amount: finalAmount
    };

    setTransactions(prev => [transaction, ...prev]);
    setIsModalOpen(false);
    setNewTransaction({
      date: new Date().toISOString().split('T')[0],
      title: '',
      amount: '',
      category: '식비',
      type: '지출',
      provider: '수동 입력'
    });
  };

  const handleResetData = () => {
    if (window.confirm('모든 거래 데이터를 삭제하시겠습니까? (복구할 수 없습니다)')) {
      setTransactions([]);
      localStorage.removeItem('finance_flow_live');
      alert('데이터가 초기화되었습니다.');
    }
  };

  const generateAIReport = () => {
    setIsAiLoading(true);
    // Simulate AI analysis delay
    setTimeout(() => {
      const expenses = transactions.filter(t => t.amount < 0);
      const income = transactions.filter(t => t.amount > 0);
      const totalExpense = Math.abs(expenses.reduce((acc, t) => acc + t.amount, 0));
      const totalIncome = income.reduce((acc, t) => acc + t.amount, 0);
      
      const categorySpend = expenses.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
      }, {});

      const topCategory = Object.keys(categorySpend).reduce((a, b) => categorySpend[a] > categorySpend[b] ? a : b, '없음');

      setAiReport({
        summary: `사용자님의 이번 달 소비 패턴을 분석한 결과, 총 수입은 ${totalIncome.toLocaleString()}원이며 지출은 ${totalExpense.toLocaleString()}원입니다.`,
        insight: `${topCategory} 카테고리에서의 지출이 전체의 ${Math.round((categorySpend[topCategory]/totalExpense)*100)}%를 차지하고 있습니다.`,
        solution: `1. ${topCategory} 지출을 10% 줄이면 매달 ${(categorySpend[topCategory]*0.1).toLocaleString()}원을 더 저축할 수 있습니다.\n2. 수입의 ${(totalIncome > 0 ? Math.round((totalExpense/totalIncome)*100) : 0)}%를 소비하고 계십니다. 저축 비중을 20% 이상으로 높이는 것을 추천드립니다.\n3. 고정 지출 외에 소액 결제가 잦은 편입니다. 무지출 챌린지를 주 1회 시도해보는 건 어떨까요?`
      });
      setIsAiLoading(false);
    }, 2000);
  };

  const Sidebar = () => (
    <div className="sidebar">
      <div className="logo">FINANCE<span>FLOW</span></div>
      <nav className="nav-links">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={20} /> 대시보드
        </button>
        <button className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
          <PieChartIcon size={20} /> 소비 패턴 분석
        </button>
        <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Search size={20} /> 상세 내역
        </button>
        <button className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
          <Sparkles size={20} /> AI 인사이트
        </button>
        <button className={`nav-item ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>
          <Newspaper size={20} /> 경제 뉴스
        </button>
        <button className={`nav-item ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
          <Upload size={20} /> 데이터 연동
        </button>
      </nav>
      <div style={{ marginTop: 'auto' }}>
        <button className="nav-item" onClick={() => setIsModalOpen(true)} style={{ background: 'var(--primary)', color: 'white', marginBottom: '1rem' }}>
          <Plus size={20} /> 거래 추가
        </button>
        <button className="nav-item" onClick={handleResetData}><Settings size={20} /> 데이터 초기화</button>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="main-content animate-fade">
      <div className="dashboard-grid">
        <div className="glass-card hero-card">
          <div className="text-muted" style={{ color: 'rgba(255,255,255,0.7)' }}>총 잔액</div>
          <div className="text-huge">₩{stats.balance.toLocaleString()}</div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowUpRight size={16} /> ₩{stats.income.toLocaleString()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowDownLeft size={16} /> ₩{stats.expense.toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div className="font-bold">지출 추이</div>
            <TrendingUp size={20} className="text-primary" />
          </div>
          <div style={{ height: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0145F2" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0145F2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ background: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#0145F2' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#0145F2" fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="glass-card">
          <div className="font-bold" style={{ marginBottom: '1.5rem' }}>최근 거래 내역</div>
          <div className="transaction-list">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="transaction-item">
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--surface-container-highest)', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                    <CreditCard size={18} style={{ margin: 'auto' }} />
                  </div>
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{t.date} · {t.provider}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`font-bold ${t.amount > 0 ? 'text-primary' : ''}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}원
                  </div>
                  <span className="category-chip">{t.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="font-bold" style={{ marginBottom: '1.5rem' }}>카테고리 비율</div>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            {categoryData.map((c, i) => (
              <div key={c.name} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                {c.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const AnalysisView = () => (
    <div className="main-content animate-fade">
      <div className="glass-card">
        <h2 className="text-huge" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>상세 지출 분석</h2>
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip 
                contentStyle={{ background: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#0145F2" fill="#0145F2" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const [historyFilters, setHistoryFilters] = useState({
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0],
    category: '전체',
    search: '',
    sortBy: 'date-desc'
  });

  const filteredHistory = useMemo(() => {
    return transactions.filter(t => {
      const dateMatch = t.date >= historyFilters.startDate && t.date <= historyFilters.endDate;
      const categoryMatch = historyFilters.category === '전체' || t.category === historyFilters.category;
      const searchMatch = t.title.toLowerCase().includes(historyFilters.search.toLowerCase());
      return dateMatch && categoryMatch && searchMatch;
    }).sort((a, b) => {
      if (historyFilters.sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (historyFilters.sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (historyFilters.sortBy === 'amount-desc') return Math.abs(b.amount) - Math.abs(a.amount);
      if (historyFilters.sortBy === 'amount-asc') return Math.abs(a.amount) - Math.abs(b.amount);
      return 0;
    });
  }, [transactions, historyFilters]);

  const HistoryView = () => (
    <div className="main-content animate-fade">
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="filter-group">
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>기간 설정</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="date" 
                className="base-input" 
                value={historyFilters.startDate} 
                onChange={e => setHistoryFilters({...historyFilters, startDate: e.target.value})}
              />
              <span className="text-muted">~</span>
              <input 
                type="date" 
                className="base-input" 
                value={historyFilters.endDate}
                onChange={e => setHistoryFilters({...historyFilters, endDate: e.target.value})}
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>카테고리</label>
            <select 
              className="base-input" 
              value={historyFilters.category}
              onChange={e => setHistoryFilters({...historyFilters, category: e.target.value})}
            >
              <option>전체</option>
              <option>식비</option>
              <option>쇼핑</option>
              <option>교통</option>
              <option>생활</option>
              <option>수입</option>
              <option>기타</option>
            </select>
          </div>

          <div className="filter-group" style={{ flex: 1 }}>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>검색</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input 
                type="text" 
                className="base-input" 
                style={{ paddingLeft: '2.5rem', width: '100%' }} 
                placeholder="지출처 검색..."
                value={historyFilters.search}
                onChange={e => setHistoryFilters({...historyFilters, search: e.target.value})}
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>정렬</label>
            <select 
              className="base-input"
              value={historyFilters.sortBy}
              onChange={e => setHistoryFilters({...historyFilters, sortBy: e.target.value})}
            >
              <option value="date-desc">최신순</option>
              <option value="date-asc">오래된순</option>
              <option value="amount-desc">금액 높은순</option>
              <option value="amount-asc">금액 낮은순</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--outline-variant)', display: 'flex', gap: '3rem' }}>
          <div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>검색 결과 합계</div>
            <div className="font-bold" style={{ fontSize: '1.2rem' }}>
              {filteredHistory.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}원
            </div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>기간 내 수입</div>
            <div className="text-primary font-bold" style={{ fontSize: '1.2rem' }}>
              {filteredHistory.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0).toLocaleString()}원
            </div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>기간 내 지출</div>
            <div className="font-bold" style={{ fontSize: '1.2rem', color: '#ff4d4d' }}>
              {Math.abs(filteredHistory.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0)).toLocaleString()}원
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>지출처</th>
              <th>카테고리</th>
              <th>결제 수단</th>
              <th style={{ textAlign: 'right' }}>금액</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map(t => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td className="font-bold">{t.title}</td>
                <td><span className="category-chip">{t.category}</span></td>
                <td className="text-muted">{t.provider}</td>
                <td style={{ textAlign: 'right' }} className={`font-bold ${t.amount > 0 ? 'text-primary' : ''}`}>
                  {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredHistory.length === 0 && (
          <div style={{ padding: '5rem', textDelta: 'center', textAlign: 'center' }}>
            <div className="text-muted">내역이 없습니다.</div>
          </div>
        )}
      </div>
    </div>
  );

  const EconomyNewsView = () => {
    const newsList = [
      { id: 1, title: "3년간 프리미엄 리뉴얼 마친 롯데백화점 인천점, '1조 클럽 노린다'", desc: "롯데백화점 인천점이 3년간의 프리미엄 리뉴얼을 완료해 '연 매출 1조 클럽'에 입성할 준비를 마쳤습니다.", category: "유통", url: "https://n.news.naver.com/mnews/article/469/0000927969" },
      { id: 2, title: "자이언트네트워크그룹, ‘제28차 CPN 연례 컨퍼런스’ 개최", desc: "물류 기업 자이언트네트워크그룹은 내달 1~5일 서울 중구 롯데호텔 서울에서 '제28차 CPN 연례 컨퍼런스'를 공동 개최합니다.", category: "기업", url: "https://n.news.naver.com/mnews/article/020/0003715866" },
      { id: 3, title: "‘7연속 금리동결’ 금통위원들 “중동 변수 지켜봐야”", desc: "한국은행 금융통화위원들이 7연속 기준금리 동결을 결정하면서 중동 전쟁 영향을 더 지켜보고 대응할 필요가 있다고 판단했습니다.", category: "금융", url: "https://n.news.naver.com/mnews/article/056/0012171292" },
      { id: 4, title: "'예타 면제'로 공급 물꼬…도심 3.4만 가구 사업 앞당긴다", desc: "정부가 도심 내 주택 공급을 앞당기기 위해 총 3만4000가구 규모의 공공주택사업 기간을 단축하기로 했습니다.", category: "부동산", url: "https://n.news.naver.com/mnews/article/003/0013914416" },
      { id: 5, title: "삼성SDI, 1분기 영업손실 1556억원… 적자 폭 개선", desc: "삼성SDI가 올해 1분기 1556억원의 영업손실을 기록하며 지난해 같은 기간과 비교해 적자 폭을 크게 줄였습니다.", category: "기업", url: "https://n.news.naver.com/mnews/article/138/0002226103" },
      { id: 6, title: "주담대 금리 상승세…2년4개월 만에 최고", desc: "기준금리 동결 속에서도 은행권의 주택담보대출 금리는 오름세를 이어가며 2년4개월 만에 최고 수준을 기록했습니다.", category: "금융", url: "https://n.news.naver.com/mnews/article/028/0002802789" },
      { id: 7, title: "현대건설, 1Q 영업익 1809억원…전년比 15%↓", desc: "현대건설은 올해 1분기 연결 기준 영업이익이 1809억원으로 지난해 같은 기간보다 15.4% 줄었다고 공시했습니다.", category: "기업", url: "https://n.news.naver.com/mnews/article/277/0005755986" },
      { id: 8, title: "부정 수급 최대 5배 제재…중기부, 1530곳 정밀 점검", desc: "중소벤처기업부는 의심 징후가 포착된 1530개 사를 대상으로 부정수급 근절을 위한 현장 정밀 점검을 실시합니다.", category: "정책", url: "https://n.news.naver.com/mnews/article/421/0008916417" },
      { id: 9, title: "로이터 '삼성전자, 연내 중국 가전·TV 판매 사업 철수'", desc: "삼성전자가 중국 업체들의 저가 공세로 인한 가격 경쟁력 약화로 중국 내 가전·TV 판매 사업을 철수할 수 있다는 보도가 나왔습니다.", category: "기업", url: "https://n.news.naver.com/mnews/article/031/0001025089" },
      { id: 10, title: "SK에코플랜트 1조 FI 투자금 상환…IPO 부담 덜었다", desc: "SK에코플랜트가 보유 자금을 활용해 1조 500억원 규모의 투자금을 상환하며 IPO를 앞두고 재무 부담을 경감했습니다.", category: "기업", url: "https://n.news.naver.com/mnews/hotissue/article/011/0004615595?type=series&cid=2002346" }
    ];

    return (
      <div className="main-content animate-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 className="font-bold" style={{ fontSize: '1.75rem' }}>오늘의 경제 톱픽</h2>
            <p className="text-muted">2026년 4월 28일 기준 주요 경제 뉴스 20선을 전해드립니다.</p>
          </div>
          <button className="base-input" style={{ background: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} className="text-primary" /> 실시간 업데이트
          </button>
        </div>

        <div className="news-grid">
          {newsList.map(news => (
            <div key={news.id} className="news-card animate-fade-up" style={{ animationDelay: `${news.id * 0.05}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="category-chip" style={{ background: 'var(--primary-container)', color: 'var(--primary)' }}>{news.category}</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>{news.id}nd Pick</span>
              </div>
              <h3 className="font-bold" style={{ fontSize: '1.1rem', marginBottom: '0.75rem', lineHeight: '1.4' }}>{news.title}</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>{news.desc}</p>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <a 
                  href={news.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary font-bold" 
                  style={{ fontSize: '0.85rem', textDecoration: 'none' }}
                >
                  자세히 보기 →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const AIInsightsView = () => (
    <div className="main-content animate-fade">
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="ai-icon-pulse">
          <Sparkles size={48} className="text-primary" />
        </div>
        <h2 className="font-bold" style={{ fontSize: '2rem', marginTop: '2rem', marginBottom: '1rem' }}>AI 재무 리포트</h2>
        <p className="text-muted" style={{ marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
          사용자님의 지출 내역을 분석하여 맞춤형 재무 솔루션을 제안해 드립니다. <br/>
          빅데이터 기반의 인사이트를 지금 확인해 보세요.
        </p>
        
        {!aiReport && (
          <button 
            className="base-input" 
            style={{ background: 'var(--primary)', color: 'white', padding: '1rem 3rem', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={generateAIReport}
            disabled={isAiLoading}
          >
            {isAiLoading ? '분석 중...' : '리포트 생성하기'}
          </button>
        )}

        {aiReport && (
          <div className="animate-fade-up" style={{ textAlign: 'left', marginTop: '3rem' }}>
            <div className="glass-card" style={{ background: 'rgba(1, 69, 242, 0.05)', border: '1px solid rgba(1, 69, 242, 0.2)' }}>
              <h3 className="font-bold text-primary" style={{ marginBottom: '1rem' }}>💡 분석 요약</h3>
              <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>{aiReport.summary}</p>
              <div style={{ padding: '1rem', background: 'white', borderRadius: '0.75rem', marginBottom: '2rem' }}>
                <strong>핵심 인사이트:</strong> {aiReport.insight}
              </div>
              
              <h3 className="font-bold" style={{ marginBottom: '1rem' }}>🚀 추천 솔루션</h3>
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                {aiReport.solution}
              </div>
              
              <button 
                className="text-primary font-bold" 
                style={{ marginTop: '2rem', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setAiReport(null)}
              >
                다시 분석하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const Modal = () => isModalOpen && (
    <div className="modal-overlay">
      <div className="glass-card modal-content animate-fade-up">
        <h2 className="font-bold" style={{ marginBottom: '1.5rem' }}>거래 내역 수동 추가</h2>
        <form onSubmit={handleManualAdd}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button 
              type="button" 
              className={`base-input ${newTransaction.type === '지출' ? 'active-type' : ''}`}
              style={{ flex: 1, cursor: 'pointer' }}
              onClick={() => setNewTransaction({...newTransaction, type: '지출'})}
            >지출</button>
            <button 
              type="button" 
              className={`base-input ${newTransaction.type === '수입' ? 'active-type' : ''}`}
              style={{ flex: 1, cursor: 'pointer' }}
              onClick={() => setNewTransaction({...newTransaction, type: '수입'})}
            >수입</button>
          </div>
          
          <div className="filter-group" style={{ marginBottom: '1rem' }}>
            <label className="text-muted">날짜</label>
            <input 
              type="date" 
              className="base-input" 
              style={{ width: '100%' }} 
              value={newTransaction.date}
              onChange={e => setNewTransaction({...newTransaction, date: e.target.value})}
              required
            />
          </div>

          <div className="filter-group" style={{ marginBottom: '1rem' }}>
            <label className="text-muted">내용 (가맹점명)</label>
            <input 
              type="text" 
              className="base-input" 
              style={{ width: '100%' }} 
              placeholder="예: 급여, 스타벅스..."
              value={newTransaction.title}
              onChange={e => setNewTransaction({...newTransaction, title: e.target.value})}
              required
            />
          </div>

          <div className="filter-group" style={{ marginBottom: '1rem' }}>
            <label className="text-muted">금액</label>
            <input 
              type="number" 
              className="base-input" 
              style={{ width: '100%' }} 
              placeholder="0"
              value={newTransaction.amount}
              onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})}
              required
            />
          </div>

          <div className="filter-group" style={{ marginBottom: '2rem' }}>
            <label className="text-muted">카테고리</label>
            <select 
              className="base-input" 
              style={{ width: '100%' }}
              value={newTransaction.category}
              onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}
            >
              <option>식비</option>
              <option>쇼핑</option>
              <option>교통</option>
              <option>생활</option>
              <option>수입</option>
              <option>기타</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" className="base-input" style={{ flex: 1, cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>취소</button>
            <button type="submit" className="base-input" style={{ flex: 1, background: 'var(--primary)', color: 'white', cursor: 'pointer', border: 'none' }}>저장</button>
          </div>
        </form>
      </div>
    </div>
  );

  const ImportView = () => (
    <div className="main-content animate-fade">
      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="font-bold" style={{ marginBottom: '1rem' }}>엑셀/CSV 데이터 업로드</h2>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          은행이나 카드사에서 다운로드한 결제 내역 파일을 업로드하세요. <br/>
          (권장 항목: 날짜, 가맹점명, 금액)
        </p>
        
        <label className="upload-zone">
          <input type="file" style={{ display: 'none' }} accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          <FileSpreadsheet size={48} className="text-primary" style={{ marginBottom: '1rem' }} />
          <div className="font-bold">클릭하여 파일 선택</div>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>또는 여기에 파일을 끌어다 놓으세요</div>
        </label>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: '1rem' }}>
          <div className="font-bold" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>지원되는 서비스</div>
          <div style={{ display: 'flex', gap: '1rem', opacity: 0.6 }}>
            <span>신한카드</span>
            <span>국민은행</span>
            <span>삼성카드</span>
            <span>토스 (CSV)</span>
          </div>
        </div>
      </div>
    </div>
  );

  const MobileHeader = () => (
    <div className="mobile-header">
      <div className="logo" style={{ marginBottom: 0, fontSize: '1.25rem' }}>FINANCE<span>FLOW</span></div>
    </div>
  );

  const BottomNav = () => (
    <nav className="mobile-nav">
      <button className={`nav-item-mobile ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
        <LayoutDashboard size={20} />
        <span>대시보드</span>
      </button>
      <button className={`nav-item-mobile ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
        <Search size={20} />
        <span>내역</span>
      </button>
      <button className={`nav-item-mobile ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
        <Sparkles size={20} />
        <span>AI</span>
      </button>
      <button className={`nav-item-mobile ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>
        <Newspaper size={20} />
        <span>뉴스</span>
      </button>
      <button className="nav-item-mobile" onClick={() => setIsModalOpen(true)} style={{ color: 'var(--primary)' }}>
        <Plus size={20} />
        <span>추가</span>
      </button>
    </nav>
  );

  return (
    <div className="app-container">
      <MobileHeader />
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'analysis' && <AnalysisView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'ai' && <AIInsightsView />}
        {activeTab === 'news' && <EconomyNewsView />}
        {activeTab === 'import' && <ImportView />}
      </div>
      <BottomNav />
      <Modal />
    </div>
  );
};

export default App;
