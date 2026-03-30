import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yfqglbupvpspefdaqnbp.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmcWdsYnVwdnBzcGVmZGFxbmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDc0MzUsImV4cCI6MjA5MDM4MzQzNX0.06JYRczzikRiFYeBNm4KTwcdTxb-gm27xh5ZwtijyJ0";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmcWdsYnVwdnBzcGVmZGFxbmJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgwNzQzNSwiZXhwIjoyMDkwMzgzNDM1fQ.FYKlQRGKXrCfZmXWnmUvhhdgC6GOKeVgvO5jgu8IqVQ";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  try {
    // Try signing in as the user with an OTP that expires far in the future
    const { data, error } = await supabase.auth.signInWithOtp({
      email: "lars.schmit05@gmail.com",
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }

    console.log("OTP sent to email");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

main();
