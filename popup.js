document.addEventListener("DOMContentLoaded", () => {
  const walletText = document.getElementById("walletAddressText");
  const sessionInfo = document.getElementById("sessionInfo");
  const depositBtn = document.getElementById("deposit-jar-btn");
  const jarToggle = document.getElementById("jar-toggle");

  // Read from chrome.storage
  chrome.storage.local.get(["walletAddress", "twitterHandle"], (data) => {
  const sessionInfo = document.getElementById("sessionInfo");
  const loginBtn = document.getElementById("login-btn");
  const depositBtn = document.getElementById("deposit-jar-btn");

  if (data?.walletAddress && data?.twitterHandle) {
    // ✅ Show session UI
    sessionInfo.style.display = "block";
    walletText.innerText = `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}`;
    depositBtn.disabled = false;
  } else {
    // ❌ No session → show Sign In button
    loginBtn.style.display = "block";
  }
});


  // Set on toggle change
jarToggle.addEventListener("change", () => {
  const value = jarToggle.checked;
  chrome.storage.local.set({ jarEnabled: value }, () => {
    console.log("✅ Stored jarEnabled:", value);
  });
});

// Initialize toggle state from chrome.storage
chrome.storage.local.get("jarEnabled", (data) => {
  const stored = data?.jarEnabled === true;
  jarToggle.checked = stored;
});


  // Deposit logic
  depositBtn.addEventListener("click", () => {
    const amount = prompt("Enter amount of AVAX to deposit:");
    if (amount) {
      chrome.runtime.sendMessage({ action: "depositToJar", amount });
    }
  });
});
document.getElementById("login-btn").addEventListener("click", () => {
  chrome.tabs.create({
<<<<<<< HEAD
    url: "https://snowdrop-avax.vercel.app/" // Replace with your actual domain
=======
    url: "https://www.snowdrop.live/" // Replace with your actual domain
>>>>>>> d234179 (working)
  });
});