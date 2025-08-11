const connectBtn = document.getElementById("connectBtn");
const status = document.getElementById("status");

const connectWallet = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask or OKX Wallet.");
    return;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    chrome.storage.local.set({ walletAddress: address }, () => {
      status.innerText = `Connected: ${address}`;
      connectBtn.disabled = true;
    });
  } catch (err) {
    console.error("Connection rejected", err);
    alert("Wallet connection failed.");
  }
};

connectBtn.addEventListener("click", connectWallet);
