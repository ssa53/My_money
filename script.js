// ==================================
// 1. 요소(Element) 변수 선언
// ==================================
const userInfo = document.getElementById('user-info');
const loadingSpinner = document.getElementById('loading-spinner');
const menuItems = document.querySelectorAll('.menu-item');
const assetManagementPage = document.getElementById('asset-management-page');
const koreanBalanceEl = document.getElementById('total-balance-korean');
const chartContainer = document.querySelector('.chart-container');
const assetChartCanvas = document.getElementById('assetChart');
const assetEmptyState = document.getElementById('asset-empty-state');
const addAssetFormEl = document.getElementById('add-asset-form');
const assetNameEl = document.getElementById('asset-name');
const assetAmountEl = document.getElementById('asset-amount');
const formEl = document.getElementById('transaction-form');
const dateEl = document.getElementById('date');
const amountEl = document.getElementById('amount');
const descriptionEl = document.getElementById('description');
const categoryEl = document.getElementById('beomju-input');
const typeEl = document.getElementById('type');
const transactionEmptyState = document.getElementById('transaction-empty-state');
const listEl = document.getElementById('transaction-list');
const editAssetsBtn = document.getElementById('edit-assets-btn');
const assetEditModal = document.getElementById('asset-edit-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalAssetList = document.getElementById('modal-asset-list');
const statisticsPage = document.getElementById('statistics-page');
const statsTabs = document.querySelector('.stats-tabs');
const categoryExpenseChartCanvas = document.getElementById('category-expense-chart');
const transactionHistoryPage = document.getElementById('transaction-history-page');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const currentMonthDisplay = document.getElementById('current-month-display');
const calendarGrid = document.getElementById('calendar-grid');
const calendarDetails = document.getElementById('calendar-details');
const detailsTitle = document.getElementById('details-title');
const detailsTransactionList = document.getElementById('details-transaction-list');
const settingsPage = document.getElementById('settings-page');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const clearDataBtn = document.getElementById('clear-data-btn');

// ==================================
// 2. 상태(State) 변수 선언
// ==================================
let transactions = [];
let assets = [];
let currentUser = null;
let assetChart = null;
let categoryExpenseChart = null;
let displayedMonth = new Date();

// ==================================
// 3. 핵심 기능 함수 (Rendering & Logic)
// ==================================
function renderTransactionList(targetTransactions, targetListEl) {
    if (!targetListEl) return;
    targetListEl.innerHTML = '';
    if (!targetTransactions || targetTransactions.length === 0) {
        targetListEl.innerHTML = '<div class="empty-state" style="padding: 20px; margin-top: 0;"><p>해당 기간에 거래 내역이 없습니다.</p></div>';
        return;
    }
    const grouped = targetTransactions.reduce((groups, t) => { (groups[t.date] = groups[t.date] || []).push(t); return groups; }, {});
    Object.keys(grouped).sort((a,b) => b.localeCompare(a)).forEach(date => {
        const dailyTotal = grouped[date].reduce((total, t) => t.type === 'expense' ? total - t.amount : total + t.amount, 0);
        let dailyStatus = '';
        if (dailyTotal > 0) dailyStatus = `수입: ${dailyTotal.toLocaleString()}원`;
        else if (dailyTotal < 0) dailyStatus = `지출: ${(-dailyTotal).toLocaleString()}원`;
        const groupHeader = document.createElement('div');
        groupHeader.classList.add('date-group-header');
        groupHeader.innerHTML = `<div class="date-header-left"><span class="toggle-icon"></span><span>${date}</span></div><span class="daily-expense">${dailyStatus}</span>`;
        targetListEl.appendChild(groupHeader);
        const groupBody = document.createElement('ul');
        groupBody.classList.add('transaction-group-body');
        groupBody.style.display = 'none';
        grouped[date].forEach(transaction => {
            const listItem = document.createElement('li');
            listItem.classList.add(transaction.type);
            listItem.setAttribute('data-id', transaction._id);
            listItem.innerHTML = `
                <div>
                    <span class="transaction-description editable" data-field="description">${transaction.description}</span>
                    <span class="category-label editable" data-field="category">${transaction.category}</span>
                </div>
                <div class="transaction-amount-container">
                    <span class="transaction-amount editable" data-field="amount">${transaction.amount.toLocaleString()}</span>
                    <span style="color: ${transaction.type === 'expense' ? '#dc3545' : '#28a745'}; font-weight: bold;">원</span>
                    <button class="delete-btn">삭제</button>
                </div>`;
            groupBody.appendChild(listItem);
        });
        targetListEl.appendChild(groupBody);
    });
}

function updateAllUI() {
    if (assets.length === 0) {
        if (chartContainer) chartContainer.style.display = 'none';
        if (assetEmptyState) assetEmptyState.style.display = 'block';
    } else {
        if (chartContainer) chartContainer.style.display = 'block';
        if (assetEmptyState) assetEmptyState.style.display = 'none';
        renderAssetChart();
    }
    const finalBalance = assets.reduce((sum, asset) => sum + asset.amount, 0);
    if (koreanBalanceEl) {
        koreanBalanceEl.innerHTML = formatToKoreanWon(finalBalance);
    }
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(new Date().getDate() - 7);
    const recentTransactions = transactions.filter(t => new Date(t.date) >= oneWeekAgo);
    if (listEl) {
        if (recentTransactions.length === 0) {
            listEl.style.display = 'none';
            if (transactionEmptyState) transactionEmptyState.style.display = 'block';
        } else {
            listEl.style.display = 'block';
            if (transactionEmptyState) transactionEmptyState.style.display = 'none';
            renderTransactionList(recentTransactions, listEl);
        }
    }
}

function renderAssetChart() {
    if (!assetManagementPage || !assetChartCanvas) return;
    const ctx = assetChartCanvas.getContext('2d');
    if (assetChart) assetChart.destroy();
    assetChart = new Chart(ctx, {
        type: 'doughnut', data: {
            labels: assets.map(a => a.name),
            datasets: [{ data: assets.map(a => a.amount), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true, callbacks: { label: (c) => `${c.label}: ${c.parsed.toLocaleString()}원` }}}}
    });
}

function formatToKoreanWon(number) {
    if (number === 0) return '0 <span class="won-unit">원</span>';
    let result = '', unitIndex = 0;
    const units = ['', '만', '억', '조'];
    while (number > 0) {
        const part = number % 10000;
        if (part > 0) {
            let pStr = '', h = Math.floor(part / 1000), t = Math.floor((part % 1000) / 100), d = Math.floor((part % 100) / 10), o = part % 10;
            if (h > 0) pStr += `<span>${h}</span>천 `; if (t > 0) pStr += `<span>${t}</span>백 `; if (d > 0) pStr += `<span>${d}</span>십 `; if (o > 0) pStr += `<span>${o}</span>`;
            result = `${pStr.trim()} ${units[unitIndex]} ${result}`;
        }
        number = Math.floor(number / 10000);
        unitIndex++;
    }
    return result.trim() + ` <span class="won-unit">원</span>`;
}

function renderStatistics(period) { 
    if (!statisticsPage) return;
    document.querySelectorAll('.stats-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.period === period));
    const now = new Date();
    let currentPeriodStart, previousPeriodStart, previousPeriodEnd;
    if (period === 'weekly') { const sunday = new Date(now); sunday.setDate(now.getDate() - now.getDay()); currentPeriodStart = sunday; previousPeriodStart = new Date(sunday); previousPeriodStart.setDate(sunday.getDate() - 7); previousPeriodEnd = new Date(now); previousPeriodEnd.setDate(now.getDate() - 7); } 
    else if (period === 'monthly') { currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1); previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); previousPeriodEnd = new Date(now); previousPeriodEnd.setMonth(now.getMonth() - 1); } 
    else { currentPeriodStart = new Date(now.getFullYear(), 0, 1); }
    const currentTransactions = transactions.filter(t => new Date(t.date) >= currentPeriodStart);
    let previousTransactions = []; if (period !== 'yearly') { previousTransactions = transactions.filter(t => new Date(t.date) >= previousPeriodStart && new Date(t.date) <= previousPeriodEnd); }
    const currentTotals = currentTransactions.reduce((acc, t) => { acc[t.type] = (acc[t.type] || 0) + t.amount; return acc; }, { income: 0, expense: 0 });
    const previousExpenseTotal = previousTransactions.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0);
    document.getElementById('stats-income').innerText = `${currentTotals.income.toLocaleString()}원`;
    document.getElementById('stats-expense').innerText = `${currentTotals.expense.toLocaleString()}원`;
    const comparisonEl = document.getElementById('stats-comparison');
    if (period !== 'yearly') {
        const diff = currentTotals.expense - previousExpenseTotal; const periodText = period === 'weekly' ? '지난 주' : '지난 달';
        if (previousExpenseTotal === 0 && currentTotals.expense > 0) { comparisonEl.innerHTML = `${periodText} 대비 지출 발생`; comparisonEl.style.color = '#dc3545'; } 
        else if (previousExpenseTotal > 0) { const p = Math.round((diff / previousExpenseTotal) * 100); if (diff > 0) { comparisonEl.innerHTML = `${periodText} 대비 <strong>+${diff.toLocaleString()}원</strong> (↑${p}%) 더 사용`; comparisonEl.style.color = '#dc3545'; } else { comparisonEl.innerHTML = `${periodText} 대비 <strong>${(-diff).toLocaleString()}원</strong> (↓${-p}%) 절약`; comparisonEl.style.color = '#28a745'; } } 
        else { comparisonEl.innerHTML = `지난 기간 지출 없음`; comparisonEl.style.color = '#777'; }
    } else { comparisonEl.innerHTML = ''; }
    const expensesByCategory = currentTransactions.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    const statsEmptyState = document.getElementById('stats-empty-state');
    if (Object.keys(expensesByCategory).length === 0) { if(statsEmptyState) statsEmptyState.style.display = 'block'; if (categoryExpenseChart) categoryExpenseChart.destroy(); if(categoryExpenseChartCanvas) categoryExpenseChartCanvas.style.display = 'none'; } 
    else { if(statsEmptyState) statsEmptyState.style.display = 'none'; if(categoryExpenseChartCanvas) categoryExpenseChartCanvas.style.display = 'block';
        const sorted = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a);
        if (categoryExpenseChart) categoryExpenseChart.destroy();
        categoryExpenseChart = new Chart(categoryExpenseChartCanvas.getContext('2d'), { type: 'doughnut', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
    }
}

function renderCalendar(dateToShow) {
    if (!transactionHistoryPage) return;
    currentMonthDisplay.textContent = `${dateToShow.getFullYear()}년 ${dateToShow.getMonth() + 1}월`;
    calendarGrid.innerHTML = '';
    if(calendarDetails) calendarDetails.style.display = 'none';
    const year = dateToShow.getFullYear();
    const month = dateToShow.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) { calendarGrid.appendChild(document.createElement('div')); }
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayCell.dataset.date = dateStr;
        const dailyExpenses = transactions.filter(t => t.date === dateStr && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        let dailyTotalHtml = '';
        if (dailyExpenses > 0) {
            dailyTotalHtml = `<div class="daily-total">${dailyExpenses.toLocaleString()}</div>`;
        }
        dayCell.innerHTML = `<div class="day-number">${day}</div>${dailyTotalHtml}`;
        calendarGrid.appendChild(dayCell);
    }
}

function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
}

// 로그인 확인 함수
function checkAuth() {
    if (!currentUser) {
        alert('로그인이 필요합니다!\n로그인 페이지로 이동합니다.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ==================================
// 4. 데이터 로딩 및 초기화
// ==================================
async function loadAllData() {
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    
    // 로컬 스토리지에서 사용자 정보 로드
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        userInfo.innerHTML = `<p>안녕하세요, ${currentUser.name || currentUser.username}님!</p><button id="logout-btn" style="background: none; border: none; color: #5c67f2; cursor: pointer; font-size: 0.9em; margin-top: 8px;">로그아웃</button>`;
        
        // 로그아웃 버튼 이벤트 리스너 추가
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                // 사용자 정보만 삭제 (데이터는 서버에 저장되어 있음)
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
            });
        }
        
        try {
            // 서버에서 데이터 로드 (사용자별 필터링)
            const [transactionsResponse, assetsResponse] = await Promise.all([
                fetch(`/api/transactions?userId=${currentUser.id || currentUser._id}`),
                fetch(`/api/assets?userId=${currentUser.id || currentUser._id}`)
            ]);
            
            if (transactionsResponse.ok && assetsResponse.ok) {
                transactions = await transactionsResponse.json();
                assets = await assetsResponse.json();
                
                // 로컬 스토리지에도 저장 (오프라인 백업)
                localStorage.setItem('transactions', JSON.stringify(transactions));
                localStorage.setItem('assets', JSON.stringify(assets));
                
                console.log(`서버에서 데이터 로드 완료: 거래내역 ${transactions.length}개, 자산 ${assets.length}개`);
            } else {
                // 서버 오류 시 로컬 스토리지에서 로드
                console.log('서버에서 데이터를 가져올 수 없어 로컬 데이터를 사용합니다.');
                const savedTransactions = localStorage.getItem('transactions');
                const savedAssets = localStorage.getItem('assets');
                
                transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
                assets = savedAssets ? JSON.parse(savedAssets) : [];
                
                console.log(`로컬 데이터 로드: 거래내역 ${transactions.length}개, 자산 ${assets.length}개`);
            }
        } catch (error) {
            // 네트워크 오류 시 로컬 스토리지에서 로드
            console.log('네트워크 오류로 로컬 데이터를 사용합니다:', error);
            const savedTransactions = localStorage.getItem('transactions');
            const savedAssets = localStorage.getItem('assets');
            
            transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
            assets = savedAssets ? JSON.parse(savedAssets) : [];
        }
        
        document.querySelector('.menu-item[data-page="asset-management-page"]').click();
    } else {
        // 로그인하지 않은 사용자에게는 로그인 버튼 표시
        userInfo.innerHTML = `<p>로그인이 필요합니다</p><button id="login-btn" style="background: #5c67f2; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9em; margin-top: 8px;">로그인</button>`;
        
        // 로그인 버튼 이벤트 리스너 추가
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }
        
        // 빈 데이터로 초기화
        transactions = [];
        assets = [];
        
        document.querySelector('.menu-item[data-page="asset-management-page"]').click();
    }
    
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

function initialize() {
    setupEventListeners();
    if (darkModeToggle) {
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'enabled') {
            darkModeToggle.checked = true;
            applyDarkMode(true);
        }
    }
    if (document.querySelector('.app-container')) { // 메인 앱 페이지일 때만 데이터 로드
        loadAllData();
    }
}

// ==================================
// 5. 이벤트 리스너(Event Listeners)
// ==================================
function setupEventListeners() {
    // 전체 문서에 삭제 버튼 이벤트 리스너 추가 (이벤트 위임)
    document.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            console.log('전역 삭제 버튼 클릭됨'); // 디버깅용
            const listItem = event.target.closest('li');
            if (!listItem) {
                console.log('listItem을 찾을 수 없음');
                return;
            }
            const transactionId = listItem.dataset.id;
            console.log('삭제할 거래 ID:', transactionId); // 디버깅용
            
            if (confirm('정말 삭제하시겠습니까?')) {
                transactions = transactions.filter(t => t._id !== transactionId);
                localStorage.setItem('transactions', JSON.stringify(transactions));
                console.log('거래 삭제 완료, 남은 거래 수:', transactions.length);
                
                const activePage = document.querySelector('.menu-item.active').dataset.page;
                if (activePage === 'asset-management-page') updateAllUI();
                else if (activePage === 'transaction-history-page') renderCalendar(displayedMonth);
            }
        }
    });

    if (menuItems.length) {
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const pageId = item.getAttribute('data-page');
                if (!pageId) return;
                const allPages = [assetManagementPage, statisticsPage, transactionHistoryPage, settingsPage];
                allPages.forEach(p => { if (p) p.style.display = 'none'; });
                menuItems.forEach(m => m.classList.remove('active'));
                const pageToShow = document.getElementById(pageId);
                if (pageToShow) {
                    pageToShow.style.display = 'block';
                    item.classList.add('active');
                }
                if (pageId === 'asset-management-page' && currentUser) {
                    updateAllUI();
                } else if (currentUser) {
                    if (pageId === 'statistics-page') {
                        renderStatistics('monthly');
                    } else if (pageId === 'transaction-history-page') {
                        displayedMonth = new Date();
                        renderCalendar(displayedMonth);
                    }
                }
            });
        });
    }

    [listEl, detailsTransactionList].forEach(list => {
        if (list) {
            list.addEventListener('click', (event) => {
                console.log('클릭된 요소:', event.target); // 디버깅용
                
                const header = event.target.closest('.date-group-header');
                if (header) {
                    header.classList.toggle('is-open');
                    const groupBody = header.nextElementSibling;
                    if (groupBody) groupBody.style.display = groupBody.style.display === 'none' ? 'block' : 'none';
                    return;
                }
                
                const target = event.target;
                if (target.classList.contains('editable') && !target.querySelector('input')) {
                    const listItem = target.closest('li');
                    const transactionId = listItem.dataset.id;
                    const field = target.dataset.field;
                    const transaction = transactions.find(t => t._id === transactionId);
                    if (!transaction) return;
                    const currentValue = transaction[field];
                    const input = document.createElement('input');
                    input.type = (field === 'amount') ? 'text' : 'text';
                    if (field === 'amount') { input.inputMode = 'numeric'; input.pattern = '[0-9]*'; }
                    input.value = currentValue;
                    input.style.width = `${target.offsetWidth + 20}px`;
                    target.innerHTML = '';
                    target.appendChild(input);
                    input.focus();
                    const saveUpdate = () => {
                        const newValue = (field === 'amount') ? parseFloat(input.value.replace(/,/g, '')) || 0 : input.value;
                        if (newValue !== currentValue) {
                            transaction[field] = newValue;
                            localStorage.setItem('transactions', JSON.stringify(transactions));
                        }
                        const activePage = document.querySelector('.menu-item.active').dataset.page;
                        if (activePage === 'asset-management-page') updateAllUI();
                        else if (activePage === 'transaction-history-page') renderCalendar(displayedMonth);
                    };
                    input.addEventListener('blur', saveUpdate);
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') saveUpdate();
                        else if (e.key === 'Escape') {
                            const activePage = document.querySelector('.menu-item.active').dataset.page;
                            if (activePage === 'asset-management-page') updateAllUI();
                            else if (activePage === 'transaction-history-page') renderCalendar(displayedMonth);
                        }
                    });
                }
            });
        }
    });

    if (prevMonthBtn) { prevMonthBtn.addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() - 1); renderCalendar(displayedMonth); }); }
    if (nextMonthBtn) { nextMonthBtn.addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() + 1); renderCalendar(displayedMonth); }); }
    if (calendarGrid) {
        calendarGrid.addEventListener('click', (event) => {
            const dayCell = event.target.closest('.calendar-day');
            if (dayCell && dayCell.dataset.date) {
                const date = dayCell.dataset.date;
                const dailyTransactions = transactions.filter(t => t.date === date);
                detailsTitle.textContent = `${date} 상세 내역`;
                renderTransactionList(dailyTransactions, detailsTransactionList);
                calendarDetails.style.display = 'block';
            }
        });
    }
    
    if (formEl) {
        formEl.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!checkAuth()) return;
            
            const newTransaction = { 
                _id: Date.now().toString(), // 간단한 ID 생성
                date: dateEl.value, 
                description: descriptionEl.value, 
                amount: parseFloat(amountEl.value), 
                category: categoryEl.value, 
                type: typeEl.value,
                userId: currentUser.id || currentUser._id
            };
            
            try {
                // 서버에 거래내역 추가
                const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newTransaction)
                });
                
                if (response.ok) {
                    const savedTransaction = await response.json();
                    transactions.unshift(savedTransaction);
                    localStorage.setItem('transactions', JSON.stringify(transactions));
                    updateAllUI();
                    formEl.reset();
                    if(dateEl) dateEl.valueAsDate = new Date();
                } else {
                    console.error('거래내역 저장 실패');
                    alert('거래내역 저장에 실패했습니다.');
                }
            } catch (error) {
                console.error('네트워크 오류:', error);
                // 오프라인 모드: 로컬 스토리지만 사용
                transactions.unshift(newTransaction);
                localStorage.setItem('transactions', JSON.stringify(transactions));
                updateAllUI();
                formEl.reset();
                if(dateEl) dateEl.valueAsDate = new Date();
            }
        });
    }

    if (addAssetFormEl) {
        addAssetFormEl.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!checkAuth()) return;
            
            const newAsset = { 
                _id: Date.now().toString(), // 간단한 ID 생성
                name: assetNameEl.value, 
                amount: parseFloat(assetAmountEl.value),
                userId: currentUser.id || currentUser._id
            };
            
            try {
                // 서버에 자산 추가
                const response = await fetch('/api/assets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newAsset)
                });
                
                if (response.ok) {
                    const savedAsset = await response.json();
                    assets.push(savedAsset);
                    localStorage.setItem('assets', JSON.stringify(assets));
                    updateAllUI();
                    addAssetFormEl.reset();
                } else {
                    console.error('자산 저장 실패');
                    alert('자산 저장에 실패했습니다.');
                }
            } catch (error) {
                console.error('네트워크 오류:', error);
                // 오프라인 모드: 로컬 스토리지만 사용
                assets.push(newAsset);
                localStorage.setItem('assets', JSON.stringify(assets));
                updateAllUI();
                addAssetFormEl.reset();
            }
        });
    }

    if (editAssetsBtn) {
        editAssetsBtn.addEventListener('click', () => {
            if (!checkAuth()) return;
            if (!assetEditModal) return;
            modalAssetList.innerHTML = '';
            assets.forEach(asset => {
                const item = document.createElement('li');
                item.classList.add('modal-asset-item');
                item.dataset.id = asset._id;
                item.innerHTML = `<span>${asset.name}</span><input type="text" value="${asset.amount}" inputmode="numeric" pattern="[0-9]*"><button class="delete-btn">삭제</button>`;
                modalAssetList.appendChild(item);
            });
            assetEditModal.style.display = 'flex';
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (assetEditModal) assetEditModal.style.display = 'none';
            updateAllUI(); 
        });
    }

    if (modalAssetList) {
        modalAssetList.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-btn')) {
                const item = event.target.closest('li');
                const assetId = item.dataset.id;
                if (confirm('이 자산을 정말 삭제하시겠습니까?')) {
                    assets = assets.filter(a => a._id !== assetId);
                    localStorage.setItem('assets', JSON.stringify(assets));
                    item.remove();
                }
            }
        });
        modalAssetList.addEventListener('change', (event) => {
            if (event.target.tagName === 'INPUT') {
                const item = event.target.closest('li');
                const assetId = item.dataset.id;
                const newAmount = parseFloat(event.target.value) || 0;
                const assetToUpdate = assets.find(a => a._id === assetId);
                if(assetToUpdate) assetToUpdate.amount = newAmount;
                localStorage.setItem('assets', JSON.stringify(assets));
            }
        });
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            const isDark = darkModeToggle.checked;
            applyDarkMode(isDark);
            localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
        });
    }
    
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            if (!checkAuth()) return;
            if (confirm('정말로 모든 거래내역과 자산을 삭제하시겠습니까?')) {
                transactions = [];
                assets = [];
                localStorage.setItem('transactions', JSON.stringify(transactions));
                localStorage.setItem('assets', JSON.stringify(assets));
                updateAllUI();
                renderCalendar(new Date());
                renderStatistics('monthly');
            }
        });
    }
    
    if (statsTabs) {
        statsTabs.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON') {
                const period = event.target.dataset.period;
                renderStatistics(period);
            }
        });
    }
}

// ==================================
// 6. 앱 시작
// ==================================
initialize();