import { supabase } from './supabaseClient.js';

document.getElementById("connect-twitter-btn").addEventListener("click", () => {
  const popup = window.open("http://localhost:5000/login", "_blank", "width=500,height=600");

  window.addEventListener("message", async (event) => {
    const twitterHandle = event.data.twitterHandle;
    const wallet = localStorage.getItem("walletAddress");

    console.log("Twitter:", twitterHandle, "Wallet:", wallet);

    const { data, error } = await supabase.from("users").upsert({
      twitter_handle: twitterHandle,
      wallet: wallet
    });

    alert("Twitter connected: @" + twitterHandle);
  });
});
