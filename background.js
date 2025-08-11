chrome.webNavigation.onCompleted.addListener((details) => {
  if (
    details.frameId === 0 &&
    (details.url.startsWith("https://twitter.com/") || details.url.startsWith("https://x.com/"))
  ) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      func: () => {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("injected.js");
        script.type = "module";
        script.onload = () => console.log("✅ injected.js loaded into page DOM");
        document.head.appendChild(script);
      }
    });
  }
}, {
  url: [{ urlMatches: "https://twitter\\.com/.*|https://x\\.com/.*" }]
});

// CSP-safe proxy for Solana RPC and other messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Background received message:", msg, "from sender:", sender); // Debug log
  if (msg.type === "GET_BLOCKHASH") {
    fetch("https://api.devnet.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [{ commitment: "finalized" }]
      })
    })
      .then(res => res.json())
      .then(data => {
        const blockhash = data.result?.value?.blockhash;
        sendResponse({ blockhash });
      })
      .catch(err => {
        console.error("Failed to fetch blockhash:", err);
        sendResponse(null);
      });
    return true; // Keep async message channel open
  }

  if (msg.type === "SUPABASE_LOG") {
    const { tweetId, authorHandle, senderWallet, amount, token, txHash, sender_handle, sender_avatar } = msg.payload;

    fetch("https://vavrqhflogjkxnsphdhh.supabase.co/rest/v1/tips", {
      method: "POST",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnJxaGZsb2dqa3huc3BoZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTg0OTYsImV4cCI6MjA2ODgzNDQ5Nn0.g9-9Pe_KXWCWqENEvgtmtFBVm64dRKM9slQrhdYU_lQ",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnJxaGZsb2dqa3huc3BoZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTg0OTYsImV4cCI6MjA2ODgzNDQ5Nn0.g9-9Pe_KXWCWqENEvgtmtFBVm64dRKM9slQrhdYU_lQ",
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        tweet_id: tweetId,
        author_handle: authorHandle,
        sender_wallet: senderWallet,
        amount,
        token,
        tx_hash: txHash,
        sender_handle,
        sender_avatar,
      })
    })
      .then(async res => {
  if (res.ok) {
    console.log("✅ Supabase log success:", res.status);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "UPDATE_TIP_COUNT", tweetId, increment: 1 });
        chrome.tabs.sendMessage(tabs[0].id, { type: "SUPABASE_LOG_SUCCESS" });
      }
    });
  } else {
    const error = await res.text();
    console.error("❌ Supabase log failed:", res.status, error);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SUPABASE_LOG_FAIL",
          error: `HTTP ${res.status}: ${error}`
        });
      }
    });
  }
})

      .catch(err => {
        console.error("❌ Supabase log failed:", err);
      });
  }

  if (msg.type === "OPEN_URL") {
    console.log("Received request to open:", msg.url);
    chrome.tabs.create({ url: msg.url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Error creating tab:", chrome.runtime.lastError.message);
      } else {
        console.log("Tab opened successfully:", tab.id);
      }
    });
  }

  if (msg.action === "setTwitterHandle") {
    const twitterHandle = msg.twitterHandle;
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnJxaGZsb2dqa3huc3BoZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE7NTMyNTg0OTYsImV4cCI6MjA2ODgzNDQ5Nn0.g9-9Pe_KXWCWqENEvgtmtFBVm64dRKM9slQrhdYU_lQ";

    fetch(`https://vavrqhflogjkxnsphdhh.supabase.co/rest/v1/wallets?twitter_handle=eq.${twitterHandle}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    })
      .then(res => {
        console.log("Supabase fetch response:", res.status); // Debug log
        return res.json();
      })
      .then(async ([data]) => {
        const walletAddress = data?.wallet_address;
        console.log("Fetched wallet data:", data); // Debug log

        if (walletAddress) {
          await new Promise((resolve) => {
            chrome.storage.local.set({
              twitterHandle,
              walletAddress
            }, () => {
              console.log("✅ Stored in extension:", twitterHandle, walletAddress);
              sendResponse({ status: "stored", walletAddress });
              resolve();
            });
          });
        } else {
          sendResponse({ status: "not_found" });
        }
      })
      .catch(err => {
        console.error("❌ Supabase fetch failed:", err);
        sendResponse({ status: "error" });
      });

    return true; // Keep port alive
  }
});
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg.action === "saveTwitterSession") {
    const { twitterHandle, walletAddress, twitterAvatar } = msg; // ✅ FIXED

    chrome.storage.local.set({ twitterHandle, walletAddress, twitterAvatar }, () => {
      console.log("✅ Session stored from web page:", twitterHandle, walletAddress, twitterAvatar);
      sendResponse({ status: "stored" });
    });

    return true;
  }
});


