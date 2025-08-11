// @ts-nocheck
import { ethers } from "ethers";

console.log("✅ EVM injected.ts loaded");

const ESCROW_CONTRACT_ADDRESS = "0x370d6006D2C2C1c64408555Fa7ff5b6134C16d4D";
const USDC_TOKEN_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";

const ESCROW_ABI = [
  {
    inputs: [{ internalType: "string", name: "twitterHandle", type: "string" }],
    name: "tipWithAVAX",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "twitterHandle", type: "string" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "tipWithUSDC",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
];

window.addEventListener("message", async (event) => {
  if (event.data.type !== "REQUEST_WALLET_CONNECT") return;

  const { tweetId, authorHandle, amount, token, jarEnabled } = event.data;

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const sender = await signer.getAddress();

    const amountInAVAX = ethers.utils.parseEther(amount.toString());

    // ✅ JAR tipping via backend (AVAX only)
    if (jarEnabled && token === "AVAX") {
      try {
        const response = await fetch("http://localhost:3000/api/tip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            twitterHandle: authorHandle,
            amount,
            userAddress: sender,
          }),
        });

        const result = await response.json();

        if (result.success) {
          window.postMessage(
            {
              type: "TIP_RESULT",
              message: `🍯 Tip of ${amount} AVAX sent from Jar!`,
              txHash: result.txHash,
            },
            "*"
          );
        } else {
          window.postMessage(
            { type: "TIP_RESULT", message: `❌ ${result.error}` },
            "*"
          );
        }
      } catch (err) {
        console.error("❌ Jar relayer error:", err);
        window.postMessage(
          { type: "TIP_RESULT", message: "❌ Jar network error" },
          "*"
        );
      }
      return;
    }

    // ✅ USDC Flow
    if (token === "USDC") {
      const escrow = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
      const usdc = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
      const amountInUSDC = ethers.utils.parseUnits(amount.toString(), 6);

      const approveTx = await usdc.approve(ESCROW_CONTRACT_ADDRESS, amountInUSDC);
      await approveTx.wait();

      const tx = await escrow.tipWithUSDC(authorHandle, amountInUSDC);
      await tx.wait();

      window.postMessage(
        {
          type: "TIP_RESULT",
          message: `💵 USDC tip sent!`,
          txHash: tx.hash,
        },
        "*"
      );
      window.postMessage({
  type: "LOG_TIP_TO_SUPABASE",
  payload: {
    tweetId,
    authorHandle,
    senderWallet: sender,
    amount,
    token: "USDC",
    txHash: tx.hash,
  },
}, "*");

      return;
    }

    // ✅ AVAX Flow (manual)
    const escrow = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
    const tx = await escrow.tipWithAVAX(authorHandle, { value: amountInAVAX });
    await tx.wait();

    window.postMessage(
      {
        type: "TIP_RESULT",
        message: `💸 AVAX tip sent!`,
        txHash: tx.hash,
      },
      "*"
    );
    window.postMessage({
  type: "LOG_TIP_TO_SUPABASE",
  payload: {
    tweetId,
    authorHandle,
    senderWallet: sender,
    amount,
    token: "AVAX",
    txHash: tx.hash,
  },
}, "*");

  } catch (err) {
    console.error("❌ Tip failed:", err);
    window.postMessage({
      type: "TIP_RESULT",
      message: "❌ Tip failed. Check console.",
    });
  }
});
