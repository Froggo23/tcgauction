// =============================================
// TCG Auction — Single Page Application (Vanilla JS)
// =============================================

const app = document.getElementById('app');

// ---- Polling ----
let pollingTimer = null;
function stopPolling() {
  if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
}

// ---- Helpers ----
function getUser() { return localStorage.getItem('auction_user'); }
function setUser(name) { localStorage.setItem('auction_user', name); }
function clearUser() { localStorage.removeItem('auction_user'); }

function formatPrice(n) {
  if (n == null) return '0원';
  return Number(n).toLocaleString('ko-KR') + '원';
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function getAuctionStatus(auction) {
  const now = new Date();
  const start = new Date(auction.startDate);
  const end = new Date(auction.endDate);
  if (now < start) return { label: '예정', className: 'time-upcoming', canBid: false };
  if (now > end) return { label: '종료', className: 'time-ended', canBid: false };
  return { label: '진행중', className: 'time-active', canBid: true };
}

function headerHTML(user) {
  return `
    <header class="header">
      <div class="header-inner">
        <span class="header-logo" onclick="navigate('list')">TCG Auction</span>
        <div class="header-user">
          <span>안녕하세요, <strong>${user}</strong>님</span>
          <button class="btn-logout" onclick="logout()">로그아웃</button>
        </div>
      </div>
    </header>
  `;
}

// ---- Router ----
function navigate(page, param) {
  stopPolling(); // 페이지 이동 시 기존 폴링 중지
  const user = getUser();
  if (!user && page !== 'login') { renderLogin(); return; }
  switch (page) {
    case 'login': renderLogin(); break;
    case 'list': renderList(); break;
    case 'create': renderCreate(); break;
    case 'detail': renderDetail(param); break;
    default: renderList();
  }
}

function logout() { clearUser(); navigate('login'); }

// ---- Login Page ----
function renderLogin() {
  if (getUser()) { navigate('list'); return; }
  app.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <span class="emoji">🃏</span>
        <h1>TCG Auction</h1>
        <p>경매에 참여하려면 이름을 입력하세요</p>
        <form id="login-form">
          <div class="form-group">
            <label for="name-input">What is your name (ID)?</label>
            <input id="name-input" type="text" class="form-input" placeholder="이름을 입력하세요..." autocomplete="off" autofocus>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="login-btn" disabled>입장하기</button>
        </form>
      </div>
    </div>
  `;
  const input = document.getElementById('name-input');
  const btn = document.getElementById('login-btn');
  input.addEventListener('input', () => { btn.disabled = !input.value.trim(); });
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    setUser(name);
    navigate('list');
  });
}

// ---- Auction List Page ----
async function renderList() {
  const user = getUser();
  app.innerHTML = headerHTML(user) + `
    <div class="container fade-up">
      <div class="page-header">
        <h2>🔥 경매 목록</h2>
        <button class="btn btn-primary btn-sm" onclick="navigate('create')">➕ 경매 등록하기</button>
      </div>
      <div id="auction-content"><div class="empty-state"><p>불러오는 중...</p></div></div>
    </div>
  `;

  try {
    const res = await fetch('/api/auctions');
    const auctions = await res.json();
    const container = document.getElementById('auction-content');

    if (auctions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="emoji">📭</span>
          <p>아직 등록된 경매가 없습니다</p>
          <button class="btn btn-primary" onclick="navigate('create')">첫 경매를 등록해 보세요!</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div class="auction-grid">${auctions.map(a => {
      const status = getAuctionStatus(a);
      return `
        <div class="auction-card" onclick="navigate('detail', ${a.id})">
          ${a.imagePath
          ? `<img src="${a.imagePath}" alt="${a.title}" class="auction-card-image">`
          : `<div class="auction-card-image-placeholder">🃏</div>`}
          <div class="auction-card-body">
            <div class="auction-card-title">${a.title}</div>
            <div class="auction-card-meta">
              <div class="auction-card-price">
                <small>현재가</small>
                ${formatPrice(a.currentPrice)}
              </div>
              <div class="auction-card-info">
                <div class="bids">${a.bidCount}건 입찰</div>
                <span class="time ${status.className}">${status.label}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('')}</div>`;
  } catch (err) {
    console.error(err);
    document.getElementById('auction-content').innerHTML =
      `<div class="empty-state"><p>경매 목록을 불러오는 데 실패했습니다.</p></div>`;
  }

  // [POLLING] 목록 페이지: 10초마다 경매 목록 갱신
  pollingTimer = setInterval(async () => {
    try {
      const r = await fetch('/api/auctions');
      const freshAuctions = await r.json();
      const container = document.getElementById('auction-content');
      if (!container) { stopPolling(); return; }

      if (freshAuctions.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                      <span class="emoji">📭</span>
                      <p>아직 등록된 경매가 없습니다</p>
                      <button class="btn btn-primary" onclick="navigate('create')">첫 경매를 등록해 보세요!</button>
                    </div>`;
        return;
      }

      container.innerHTML = `<div class="auction-grid">${freshAuctions.map(a => {
        const st = getAuctionStatus(a);
        return `
                    <div class="auction-card" onclick="navigate('detail', ${a.id})">
                      ${a.imagePath
            ? `<img src="${a.imagePath}" alt="${a.title}" class="auction-card-image">`
            : `<div class="auction-card-image-placeholder">🃏</div>`}
                      <div class="auction-card-body">
                        <div class="auction-card-title">${a.title}</div>
                        <div class="auction-card-meta">
                          <div class="auction-card-price"><small>현재가</small>${formatPrice(a.currentPrice)}</div>
                          <div class="auction-card-info">
                            <div class="bids">${a.bidCount}건 입찰</div>
                            <span class="time ${st.className}">${st.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>`;
      }).join('')}</div>`;
    } catch (e) { /* 폴링 실패 무시 */ }
  }, 10000);
}

// ---- Auction Create Page ----
function renderCreate() {
  const user = getUser();
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  app.innerHTML = headerHTML(user) + `
    <div class="create-page fade-up">
      <h2>➕ 새 경매 등록</h2>
      <form id="create-form">
        <div class="form-group">
          <label>사진</label>
          <div class="image-upload" id="image-upload-area">
            <span class="placeholder-icon">📷</span>
            <span class="placeholder-text">클릭하여 이미지를 선택하세요</span>
            <input type="file" accept="image/*" id="image-input" style="display:none">
          </div>
        </div>

        <div class="form-group">
          <label for="title">경매 제목</label>
          <input id="title" type="text" class="form-input" placeholder="예: 리자몽 VMAX 레인보우" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="starting-price">시작가 (원)</label>
            <input id="starting-price" type="number" class="form-input" placeholder="10000" min="1" required>
          </div>
          <div class="form-group">
            <label for="bid-unit">입찰 단위 (원)</label>
            <input id="bid-unit" type="number" class="form-input" placeholder="1000" min="1" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="start-date">시작 일시</label>
            <input id="start-date" type="datetime-local" class="form-input" value="${formatDateForInput(now)}" required>
          </div>
          <div class="form-group">
            <label for="end-date">종료 일시</label>
            <input id="end-date" type="datetime-local" class="form-input" value="${formatDateForInput(later)}" required>
          </div>
        </div>

        <div class="form-group">
          <label for="description">설명</label>
          <textarea id="description" class="form-input" placeholder="카드 상태, 특이사항 등을 적어주세요..." rows="4"></textarea>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-secondary" onclick="navigate('list')">취소</button>
          <button type="submit" class="btn btn-primary" id="submit-btn">경매 등록하기</button>
        </div>
      </form>
    </div>
  `;

  // Image upload
  const uploadArea = document.getElementById('image-upload-area');
  const imageInput = document.getElementById('image-input');
  uploadArea.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadArea.innerHTML = `<img src="${e.target.result}" alt="preview"><input type="file" accept="image/*" id="image-input" style="display:none">`;
        document.getElementById('image-input').addEventListener('change', arguments.callee);
      };
      reader.readAsDataURL(file);
    }
  });

  // Form submit
  document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = '등록 중...';

    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('startingPrice', document.getElementById('starting-price').value);
    formData.append('bidUnit', document.getElementById('bid-unit').value);
    formData.append('startDate', document.getElementById('start-date').value);
    formData.append('endDate', document.getElementById('end-date').value);
    formData.append('seller', user);

    const fileInput = document.getElementById('image-input');
    if (fileInput && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }

    try {
      const res = await fetch('/api/auctions', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '등록에 실패했습니다.');
        return;
      }
      navigate('list');
    } catch (err) {
      alert('등록 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = '경매 등록하기';
    }
  });
}

// ---- Auction Detail Page ----
async function renderDetail(auctionId) {
  const user = getUser();
  app.innerHTML = headerHTML(user) + `
    <div class="detail-page fade-up">
      <div class="empty-state"><p>불러오는 중...</p></div>
    </div>
  `;

  try {
    const res = await fetch(`/api/auctions/${auctionId}`);
    if (!res.ok) {
      app.innerHTML = headerHTML(user) + `
        <div class="container" style="padding-top:100px;text-align:center;">
          <h2>경매를 찾을 수 없습니다</h2>
          <button class="btn btn-primary" style="margin-top:20px" onclick="navigate('list')">목록으로 돌아가기</button>
        </div>
      `;
      return;
    }

    const auction = await res.json();
    const status = getAuctionStatus(auction);
    const bids = auction.bids || [];
    const currentPrice = bids.length > 0 ? bids[0].bidAmount : auction.startingPrice;
    const minBid = currentPrice + auction.bidUnit;

    let bidsHTML = '';
    if (bids.length > 0) {
      bidsHTML = bids.map((b, i) => `
        <div class="bid-item">
          <div class="bid-amount">${formatPrice(b.bidAmount)}</div>
          <div class="bid-info">
            <div class="bid-bidder">${i === 0 ? '👑 ' : ''}${b.bidder}</div>
            <div class="bid-time">${formatDate(b.createdAt)}</div>
          </div>
        </div>
      `).join('');
      bidsHTML += `
        <div class="starting-price-item">
          <div class="bid-amount">${formatPrice(auction.startingPrice)}</div>
          <div class="bid-info"><div class="bid-bidder">시작가</div></div>
        </div>
      `;
    } else {
      bidsHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted)">아직 입찰이 없습니다</div>`;
    }

    let bidFormHTML = '';
    if (status.canBid && user !== auction.seller) {
      bidFormHTML = `
        <div class="bid-form">
          <h3>💰 입찰하기</h3>
          <form id="bid-form">
            <div class="bid-form-row">
              <div class="form-group">
                <label for="bid-amount">입찰 금액 (원)</label>
                <input id="bid-amount" type="number" class="form-input"
                  placeholder="${minBid.toLocaleString()}" min="${minBid}" step="${auction.bidUnit}">
              </div>
              <button type="submit" class="btn btn-primary" id="bid-btn" style="height:50px;min-width:120px">입찰하기</button>
            </div>
            <div class="bid-min-info">최소 입찰가: ${formatPrice(minBid)} (현재가 + 입찰 단위)</div>
            <div id="bid-message"></div>
          </form>
        </div>
      `;
    } else if (user === auction.seller) {
      bidFormHTML = `<div class="bid-form" style="text-align:center;color:var(--text-secondary)"><p>내가 등록한 경매입니다</p></div>`;
    } else if (!status.canBid && status.label === '종료') {
      bidFormHTML = `<div class="bid-form" style="text-align:center;color:var(--text-muted)"><p>이 경매는 종료되었습니다</p></div>`;
    }

    app.innerHTML = headerHTML(user) + `
      <div class="detail-page fade-up">
        ${auction.imagePath
        ? `<div class="detail-image-wrapper"><img src="${auction.imagePath}" alt="${auction.title}"></div>`
        : `<div class="detail-image-placeholder">🃏</div>`}

        <div class="detail-header">
          <h1>${auction.title}</h1>
          <span class="detail-status ${status.className}">${status.label}</span>
        </div>

        <div class="detail-info-grid">
          <div class="detail-info-item"><div class="label">현재가</div><div class="value price">${formatPrice(currentPrice)}</div></div>
          <div class="detail-info-item"><div class="label">시작가</div><div class="value">${formatPrice(auction.startingPrice)}</div></div>
          <div class="detail-info-item"><div class="label">입찰 단위</div><div class="value">${formatPrice(auction.bidUnit)}</div></div>
          <div class="detail-info-item"><div class="label">입찰 횟수</div><div class="value">${bids.length}건</div></div>
          <div class="detail-info-item"><div class="label">시작일</div><div class="value" style="font-size:14px">${formatDate(auction.startDate)}</div></div>
          <div class="detail-info-item"><div class="label">종료일</div><div class="value" style="font-size:14px">${formatDate(auction.endDate)}</div></div>
        </div>

        ${auction.description ? `<div class="detail-description"><h3>📋 설명</h3>${auction.description}</div>` : ''}

        <div class="detail-info-item" style="margin-bottom:32px">
          <div class="label">판매자</div><div class="value">👤 ${auction.seller}</div>
        </div>

        <div class="bid-section">
          <h3>📊 입찰 내역</h3>
          <div class="bid-list">${bidsHTML}</div>
        </div>

        ${bidFormHTML}
      </div>
    `;

    // Bid form handler
    const bidForm = document.getElementById('bid-form');
    if (bidForm) {
      bidForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const btn = document.getElementById('bid-btn');
        const msgDiv = document.getElementById('bid-message');
        const amountInput = document.getElementById('bid-amount');
        const amount = parseInt(amountInput.value);

        if (!amount || amount < minBid) {
          msgDiv.innerHTML = `<div class="bid-error">⚠️ 최소 입찰가는 ${formatPrice(minBid)} 입니다.</div>`;
          return;
        }

        btn.disabled = true;
        btn.textContent = '입찰 중...';
        msgDiv.innerHTML = '';

        try {
          const r = await fetch(`/api/auctions/${auctionId}/bid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bidder: user, bidAmount: amount })
          });
          const data = await r.json();
          if (!r.ok) {
            msgDiv.innerHTML = `<div class="bid-error">⚠️ ${data.error}</div>`;
          } else {
            msgDiv.innerHTML = `<div class="bid-success">✅ 입찰이 완료되었습니다! 🎉</div>`;
            setTimeout(() => renderDetail(auctionId), 800);
          }
        } catch (err) {
          msgDiv.innerHTML = `<div class="bid-error">⚠️ 입찰 중 오류가 발생했습니다.</div>`;
        } finally {
          btn.disabled = false;
          btn.textContent = '입찰하기';
        }
      });
    }

    // [POLLING] 상세 페이지: 5초마다 입찰 내역 갱신 (부분 업데이트)
    pollingTimer = setInterval(async () => {
      try {
        const r = await fetch(`/api/auctions/${auctionId}`);
        if (!r.ok) return;
        const fresh = await r.json();
        const freshBids = fresh.bids || [];

        // 입찰 수가 같으면 변경 없음 → 스킵
        if (freshBids.length === bids.length) return;

        // 현재가, 최소 입찰가 업데이트
        const newCurrentPrice = freshBids.length > 0 ? freshBids[0].bidAmount : fresh.startingPrice;
        const newMinBid = newCurrentPrice + fresh.bidUnit;

        // 가격 정보 업데이트
        const priceEl = document.querySelector('.detail-info-item .value.price');
        if (priceEl) priceEl.textContent = formatPrice(newCurrentPrice);

        const bidCountEl = document.querySelectorAll('.detail-info-item .value')[3];
        if (bidCountEl) bidCountEl.textContent = freshBids.length + '건';

        // 입찰 내역 업데이트
        const bidListEl = document.querySelector('.bid-list');
        if (bidListEl) {
          let newBidsHTML = freshBids.map((b, i) => `
                        <div class="bid-item">
                          <div class="bid-amount">${formatPrice(b.bidAmount)}</div>
                          <div class="bid-info">
                            <div class="bid-bidder">${i === 0 ? '👑 ' : ''}${b.bidder}</div>
                            <div class="bid-time">${formatDate(b.createdAt)}</div>
                          </div>
                        </div>`).join('');
          newBidsHTML += `
                        <div class="starting-price-item">
                          <div class="bid-amount">${formatPrice(fresh.startingPrice)}</div>
                          <div class="bid-info"><div class="bid-bidder">시작가</div></div>
                        </div>`;
          bidListEl.innerHTML = newBidsHTML;
        }

        // 입찰 폼의 최소가 업데이트 (입력 중인 값은 유지)
        const bidAmountInput = document.getElementById('bid-amount');
        if (bidAmountInput) {
          bidAmountInput.min = newMinBid;
          bidAmountInput.step = fresh.bidUnit;
          bidAmountInput.placeholder = newMinBid.toLocaleString();
        }
        const minInfoEl = document.querySelector('.bid-min-info');
        if (minInfoEl) minInfoEl.textContent = `최소 입찰가: ${formatPrice(newMinBid)} (현재가 + 입찰 단위)`;

        // 내부 상태 동기화
        bids.length = 0;
        freshBids.forEach(b => bids.push(b));
      } catch (e) { /* 폴링 실패 무시 */ }
    }, 5000);

  } catch (err) {
    console.error(err);
  }
}

// ---- Init ----
navigate(getUser() ? 'list' : 'login');
