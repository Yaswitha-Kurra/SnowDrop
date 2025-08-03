// @ts-nocheck
import { ethers } from "ethers";

console.log("✅ EVM injected.ts loaded");

const ESCROW_CONTRACT_ADDRESS = "0x2F837d620f228a862701Ac3f6C32A00889b2D354";
const USDC_TOKEN_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";

const ESCROW_ABI = [
  {
    "inputs": [{ "internalType": "string", "name": "twitterHandle", "type": "string" }],
    "name": "tipWithAVAX",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "twitterHandle", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "tipWithUSDC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  }
];

window.addEventListener("message", async (event) => {
  if (event.data.type !== "REQUEST_WALLET_CONNECT") return;

  const { tweetId, authorHandle, amount, token } = event.data;

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const sender = await signer.getAddress();

    const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

    if (token === "USDC") {
      const usdc = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
      const amountInUSDC = ethers.parseUnits(amount.toString(), 6); // USDC = 6 decimals

      const approveTx = await usdc.approve(ESCROW_CONTRACT_ADDRESS, amountInUSDC);
      await approveTx.wait();

      const tx = await contract.tipWithUSDC(authorHandle, amountInUSDC);
      await tx.wait();

      window.postMessage({
        type: "TIP_RESULT",
        message: `💵 USDC tip sent successfully!`,
        txHash: tx.hash
      }, "*");

      window.postMessage({
        type: "LOG_TIP_TO_SUPABASE",
        payload: {
          tweetId,
          authorHandle,
          senderWallet: sender,
          amount,
          token,
          txHash: tx.hash
        }
      }, "*");
    } else {
      // AVAX fallback (default)
      const amountInAVAX = ethers.parseEther(amount.toString());
      const tx = await contract.tipWithAVAX(authorHandle, { value: amountInAVAX });
      await tx.wait();

      window.postMessage({
        type: "TIP_RESULT",
        message: `💸 AVAX tip sent successfully!`,
        txHash: tx.hash
      }, "*");

      window.postMessage({
        type: "LOG_TIP_TO_SUPABASE",
        payload: {
          tweetId,
          authorHandle,
          senderWallet: sender,
          amount,
          token,
          txHash: tx.hash
        }
      }, "*");
    }
  } catch (err) {
    console.error("❌ Tip failed:", err);
    window.postMessage({
      type: "TIP_RESULT",
      message: "❌ Tip failed. Check console for details."
    }, "*");
  }
});
