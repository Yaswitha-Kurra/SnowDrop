const SUPABASE_URL = "https://vavrqhflogjkxnsphdhh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnJxaGZsb2dqa3huc3BoZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTg0OTYsImV4cCI6MjA2ODgzNDQ5Nn0.g9-9Pe_KXWCWqENEvgtmtFBVm64dRKM9slQrhdYU_lQ"; // truncated

const processedTweets = new Set();

console.log("✅ Tweet Tipper content script loaded");

// === Supabase ===
async function supabaseCountTips(tweetId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tips?tweet_id=eq.${tweetId}&select=id`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();
    return data.length.toString();
  } catch (error) {
    console.error("Supabase count error:", error);
    return "0";
  }
}

// === Inject Tip Button ===
function injectTipButton(tweetElement, tweetId, authorHandle) {
  if (tweetElement.querySelector('.tip-button') || tweetElement.getAttribute('aria-hidden') === 'true') return;

  const actionBar =
    tweetElement.querySelector('[role="group"]') ||
    tweetElement.querySelector('div[aria-label="Tweet actions"]');
  if (!actionBar || actionBar.getAttribute('aria-hidden') === 'true') return;

  const tipBtn = document.createElement('button');
  tipBtn.innerText = '💸 Tip';
  tipBtn.className = 'tip-button';
  tipBtn.style.marginLeft = '12px';
  tipBtn.style.cursor = 'pointer';
  tipBtn.style.color = '#00b894';
  tipBtn.style.border = 'none';
  tipBtn.style.background = 'transparent';

  tipBtn.onclick = (e) => {
    showTipModal(authorHandle, tweetId, e.target);
  };

  actionBar.appendChild(tipBtn);
}

// === Inject Tip Counter ===
async function injectTipCounter(tweetElement, tweetId) {
  if (tweetElement.querySelector('.tip-counter') || tweetElement.getAttribute('aria-hidden') === 'true') return;

  const count = await supabaseCountTips(tweetId);
  const actionBar = tweetElement.querySelector('[role="group"]') || tweetElement.querySelector('div[aria-label="Tweet actions"]');
  if (!actionBar || actionBar.getAttribute('aria-hidden') === 'true') return;

  const counter = document.createElement('span');
  counter.className = 'tip-counter';
  counter.innerText = count === "1"
    ? '💸 Tipped by 1 user'
    : `🔥 Tip Train: ${count} riders`;
  counter.style.marginLeft = '10px';
  counter.style.color = '#ff8800';
  counter.style.fontSize = '0.9em';

  actionBar.appendChild(counter);
}

// === Update Tip Count on New Tip ===
window.addEventListener("message", (event) => {
  if (event.data.type === "UPDATE_TIP_COUNT") {
    const { tweetId, increment } = event.data;
    const tweetElement = document.querySelector(`article[data-testid="tweet"] a[href*="/status/${tweetId}"]`)?.closest('article[data-testid="tweet"]');
    if (tweetElement) {
      const counter = tweetElement.querySelector('.tip-counter');
      if (counter) {
        let count = parseInt(counter.innerText.match(/\d+/)?.[0] || "0");
        count += increment;
        counter.innerText = count === 1
          ? '💸 Tipped by 1 user'
          : `🔥 Tip Train: ${count} riders`;
      } else {
        injectTipCounter(tweetElement, tweetId);
      }
    }
  }
});

// === Scan and Inject Buttons ===
function extractTweetData(tweetElement) {
  const anchor = tweetElement.querySelector('a[href*="/status/"]');
  if (!anchor) return null;
  const parts = anchor.getAttribute('href').split('/');
  return {
    tweetId: parts[3],
    authorHandle: parts[1].replace('@', '')
  };
}

function scanAndInject() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  tweets.forEach(tweet => {
    const data = extractTweetData(tweet);
    if (data && !processedTweets.has(data.tweetId)) {
      injectTipButton(tweet, data.tweetId, data.authorHandle);
      injectTipCounter(tweet, data.tweetId);
      processedTweets.add(data.tweetId);
    }
  });
}

setInterval(scanAndInject, 1000);

// === Event Bridge
window.addEventListener("message", (event) => {
  if (event.data.type === "GET_BLOCKHASH") {
    chrome.runtime.sendMessage({ type: "GET_BLOCKHASH" }, (res) => {
      window.postMessage({ type: "BLOCKHASH_RESPONSE", blockhash: res?.blockhash }, "*");
    });
  }

  if (event.data.type === "TIP_RESULT") {
    showToast(event.data.message || "Tip sent!", event.data.txHash || null);
    const sendBtn = document.getElementById("sendTipBtn");
    if (sendBtn) {
      sendBtn.innerText = "Send Tip";
      sendBtn.disabled = false;
      sendBtn.style.opacity = "1";
    }
  }

  if (event.data.type === "LOG_TIP_TO_SUPABASE") {
    chrome.runtime.sendMessage({
      type: "SUPABASE_LOG",
      payload: event.data.payload
    });
  }
});
let activeTweetId = null;
let activeAuthor = null;
let tipModalEl = null;

function showTipModal(author, tweetId, eventTarget) {
  activeTweetId = tweetId;
  activeAuthor = author;

  if (!tipModalEl) createTipModal();

  const rect = eventTarget.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;

  tipModalEl.style.top = `${rect.top + scrollTop - tipModalEl.offsetHeight - 10}px`;
  tipModalEl.style.left = `${rect.left}px`;
  tipModalEl.style.display = 'block';

  document.getElementById("tipToUser").innerText = `@${author}`;
  document.getElementById("tipAmountInput").value = "";
}

function hideTipModal() {
  if (tipModalEl) {
    tipModalEl.style.display = 'none';
  }
}
function createTipModal() {
  tipModalEl = document.createElement("div");
  tipModalEl.id = "tipModal";
  tipModalEl.style.cssText = `
    display: none;
    position: absolute;
    width: 320px;
    padding: 24px;
    background: #1a0000;
    border: 2px solid #e84142;
    border-radius: 16px;
    box-shadow: 0 0 30px #ff0000aa;
    color: white;
    z-index: 9999;
    font-family: system-ui, sans-serif;
  `;

  tipModalEl.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div style="font-size: 17px;">
        <strong style="color:#fff;">Send tip to <span id="tipToUser" style="color:#ff6666">@someone</span></strong>
      </div>
      <div id="tipCloseBtn" style="cursor:pointer; color:#ff6666; font-size: 20px; font-weight: bold;">✖</div>
    </div>

    <div style="margin-bottom: 12px; color: #aaa; font-size: 13px;">Select token</div>
    <select id="tokenSelector" style="
  background: #3a0000;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 18px;
  color: #fff;
  font-weight: bold;
  width: 100%;
  border: none;
  font-size: 15px;
">
  <option value="AVAX">🔺 AVAX</option>
  <option value="USDC">💵 USDC</option>
</select>


    <input type="number" id="tipAmountInput" placeholder="Amount (e.g., 0.1)" style="
      width: 100%;
      padding: 12px;
      font-size: 15px;
      margin-bottom: 18px;
      border-radius: 10px;
      border: none;
      background: #2e0b0b;
      color: white;
    " />

    <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 18px;">
  <button class="presetBtn" style="
    width: 48px;
    height: 48px;
    font-weight: bold;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #440000;
    color: #fff;
    border: none;
    cursor: pointer;
  ">0.05</button>
  <button class="presetBtn" style="
    width: 48px;
    height: 48px;
    font-weight: bold;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #440000;
    color: #fff;
    border: none;
    cursor: pointer;
  ">0.1</button>
  <button class="presetBtn" style="
    width: 48px;
    height: 48px;
    font-weight: bold;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #440000;
    color: #fff;
    border: none;
    cursor: pointer;
  ">0.25</button>
</div>


    <button id="sendTipBtn" style="
      background: #440000;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 10px;
      width: 100%;
      font-weight: bold;
      font-size: 15px;
      cursor: pointer;
      text-align: center;
    ">Send Tip</button>
  `;

  document.body.appendChild(tipModalEl);

  // Preset buttons
  document.querySelectorAll(".presetBtn").forEach(btn => {
    btn.onclick = () => {
      document.getElementById("tipAmountInput").value = btn.innerText;
    };
  });

  // Send button
  document.getElementById("sendTipBtn").onclick = () => {
  const input = document.getElementById("tipAmountInput").value.trim();
  const amount = parseFloat(input);
  const sendBtn = document.getElementById("sendTipBtn");
  const token = document.getElementById("tokenSelector").value;

  if (!amount || amount <= 0) {
    showToast("❌ Enter a valid amount");
    return;
  }

  sendBtn.innerText = "Tipping...";
  sendBtn.disabled = true;
  sendBtn.style.opacity = "0.6";

  window.postMessage({
    type: "REQUEST_WALLET_CONNECT",
    tweetId: activeTweetId,
    authorHandle: activeAuthor,
    amount,
    token  // 👈 include selected token here
  }, "*");

  hideTipModal();

  setTimeout(() => {
    sendBtn.innerText = "Send Tip";
    sendBtn.disabled = false;
    sendBtn.style.opacity = "1";
  }, 6000);
};


  // Close button
  document.getElementById("tipCloseBtn").onclick = hideTipModal;

  // Click outside to close
  document.addEventListener("click", function (e) {
    if (tipModalEl && !tipModalEl.contains(e.target) && !e.target.classList.contains("tip-button")) {
      hideTipModal();
    }
  });
}
function showToast(message, txHash = null) {
  const existing = document.getElementById("customToast");
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = "customToast";
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a0000;
    color: #ffcccc;
    padding: 20px 26px 16px;
    border-radius: 14px;
    box-shadow: 0 0 30px #e84142aa;
    z-index: 999999;
    font-family: sans-serif;
    font-size: 16px;
    font-weight: 500;
    max-width: 95vw;
    min-width: 320px;
    text-align: left;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `;

  // ❌ Close Button
  const close = document.createElement('div');
  close.innerText = '✖';
  close.style.cssText = `
    position: absolute;
    top: 8px;
    right: 12px;
    font-size: 18px;
    color: #ff9999;
    cursor: pointer;
  `;
  close.onclick = () => toast.remove();
  toast.appendChild(close);

  // ✅ Main message
  const content = document.createElement('div');
  content.innerText = message;
  toast.appendChild(content);

  // ✅ Transaction hash block
  if (txHash) {
    const txWrap = document.createElement("div");
    txWrap.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
      flex-wrap: wrap;
    `;

    const shortHash = txHash.slice(0, 6) + "..." + txHash.slice(-4);

    // 🔗 Clickable link
    const txLink = document.createElement("a");
    txLink.href = `https://testnet.snowtrace.io/tx/${txHash}`;
    txLink.innerText = shortHash;
    txLink.target = "_blank";
    txLink.rel = "noopener noreferrer";
    txLink.style.cssText = `
      color: #ff6666;
      font-weight: bold;
      text-decoration: underline;
      font-size: 15px;
      cursor: pointer;
    `;
    // Send message to background script to open the URL with enhanced debugging
    txLink.addEventListener('click', (event) => {
      event.preventDefault();
      console.log("Click detected on txLink, sending message to open:", txLink.href);
      chrome.runtime.sendMessage({ type: "OPEN_URL", url: txLink.href }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Message send failed:", chrome.runtime.lastError.message);
        } else if (response) {
          console.log("Response from background:", response);
        }
      });
    });

    // 📋 Copy icon
    const copyBtn = document.createElement("span");
    copyBtn.innerText = "📋";
    copyBtn.style.cssText = `
      cursor: pointer;
      font-size: 17px;
    `;
    copyBtn.title = "Copy full tx hash";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(txHash);
      copyBtn.innerText = "✅";
      setTimeout(() => copyBtn.innerText = "📋", 1500);
    };

    txWrap.appendChild(txLink);
    txWrap.appendChild(copyBtn);
    toast.appendChild(txWrap);
  }

  document.body.appendChild(toast);
}