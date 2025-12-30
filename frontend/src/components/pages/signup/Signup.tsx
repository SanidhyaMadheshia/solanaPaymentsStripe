// import React, { useState } from "react";
import { Zap} from "lucide-react";
import { SignInButton, SignedIn, SignedOut, useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
// import { connectButton } from "../../../lib/stacks";
// import { getLocalStorage } from "@stacks/connect";
// import { Link } from "react-router";

const SignupPage = () => {
  const { user } = useUser();
  // const {session}= useSession();
  const {getToken} = useAuth();

  async function handleProceed() {

    const clerkSessionToken = await getToken();
    console.log("Clerk Session Token : ", clerkSessionToken);


    

    const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/user/exchangeToken`, {
      headers : {
        // "Content-Type" : "application/json",
        Authorization : `Bearer ${clerkSessionToken}`,
      }}
   );

   console.log("Response from exchangeToken : ", res);

    const data = res.data;



    const {jwtToken} = data;
    if (!jwtToken) {
      alert("Failed to get JWT token");
      return;
    }

    localStorage.setItem("jwtToken", "Bearer " + jwtToken);

    



    window.location.href= "/user/dashboard";

  } 
  

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] rounded-2xl border border-[#262626] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="border-b border-[#262626] p-6 bg-[#101010] flex flex-col items-center">
          <div className="w-14 h-14 bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00FFA3] rounded-2xl flex items-center justify-center mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-1">Join the Solana Network</h2>
          <p className="text-gray-400 text-sm">
            Sign in & connect your wallet to start accepting SOL payments
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <SignedOut>
            <SignInButton mode="modal"
              fallbackRedirectUrl={"/signup"}
            >
              <button className="w-full py-4 bg-gradient-to-r from-[#9945FF] via-[#8752F3] to-[#14F195] hover:opacity-90 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20">
                Continue with Google
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className="space-y-5">
              <div className="bg-[#101010] rounded-lg p-4 border border-[#262626]">
                <p className="text-sm text-gray-400 mb-1">Signed in as</p>
                <p className="text-white font-medium">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            
                  {/* <Link
                    to="/user/dashboard"
                    className="block w-full py-4 bg-gradient-to-r from-[#14F195] to-[#00FFA3] hover:opacity-90 text-black rounded-lg font-semibold transition-all shadow-lg shadow-emerald-500/20 text-center"
                  > */}
                  <button 
                    className="w-full py-4 bg-gradient-to-r from-[#14F195] to-[#00FFA3] hover:opacity-90 text-black rounded-lg font-semibold transition-all shadow-lg shadow-emerald-500/20"
                    onClick={handleProceed}
                  >

                    Proceed to Dashboard
                  </button>
                  {/* </Link> */}
                </div>
            
          </SignedIn>
        </div>

        {/* Footer */}
        <div className="border-t border-[#262626] bg-[#0a0a0a] p-4 text-center">
          <p className="text-xs text-gray-500">
            Powered by Solana • Fast • Secure • Decentralized
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
