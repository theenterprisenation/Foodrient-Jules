import { serve } from "npm:@supabase/functions-js@2.1.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Set a timeout for Supabase operations
const OPERATION_TIMEOUT = 15000; // 15 seconds

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: (url, options) => {
            // Create an AbortController to handle timeouts
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), OPERATION_TIMEOUT);
            
            // Add the signal to the fetch options
            const fetchOptions = {
              ...options,
              signal: controller.signal,
            };
            
            // Perform the fetch with timeout
            return fetch(url, fetchOptions)
              .finally(() => clearTimeout(timeoutId));
          },
        },
      }
    );

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid token");
    }

    // Check if the user has admin privileges
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error("Error fetching user profile");
    }

    if (!profile || !["chief", "coordinator"].includes(profile.role)) {
      throw new Error("Insufficient privileges");
    }

    // Parse the request body
    const { action, params } = await req.json();

    let result;
    // Perform the requested admin action
    switch (action) {
      case "listUsers":
        const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        if (usersError) throw usersError;
        result = users;
        break;

      case "updateUserRole":
        const { userId, role } = params;
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ role })
          .eq("id", userId);
        if (updateError) throw updateError;
        result = { success: true };
        break;

      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Admin auth error:", error);
    
    // Handle AbortError (timeout) specifically
    const status = 
      error.name === "AbortError" ? 504 :  // Gateway Timeout
      error.message.includes("Invalid token") || 
      error.message.includes("Missing authorization") ? 401 : 
      error.message.includes("Insufficient privileges") ? 403 : 500;
    
    const errorMessage = 
      error.name === "AbortError" ? 
      "The operation timed out. Please try again later." : 
      error.message || "An unexpected error occurred";
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status,
      }
    );
  }
});