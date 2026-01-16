
const { createClient } = require('@supabase/supabase-js');

// Config from environment (or hardcoded for this one-off script since I have them from tool)
const SUPABASE_URL = 'https://owftlotklqlvtedevzsx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZnRsb3RrbHFsdnRlZGV2enN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ0MTQ1MCwiZXhwIjoyMDg0MDE3NDUwfQ.uYpU4kjVeWyWPL5ML-wZ8PgHiHIADPmJvu_R5mmYlMQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'admin@u-key.com'; // Using a dedicated admin email to avoid conflict with personal email
  const password = 'admin_password_123456'; // Temporary password, change immediately

  console.log(`Creating/Updating admin user: ${email}`);

  // 1. Check if user exists
  // Admin API: listUsers
  // We can't search by email directly with listUsers efficiently without pagination, 
  // but for a script we can try to create and handle error, or list all.
  
  // Easier: Try to Create. If exists, Update password.
  
  // Create User
  const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  let userId;

  if (createError) {
    if (createError.message.includes('already has been registered')) {
        console.log('User already exists. Updating password...');
        // Find user ID - we need it to update
        // We can't get ID from create error. We have to list users or sign in?
        // Admin listUsers
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Error listing users:', listError);
            return;
        }
        const existingUser = users.find(u => u.email === email);
        if (!existingUser) {
            console.error('Could not find existing user despite error message.');
            return;
        }
        userId = existingUser.id;
        
        // Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            { password: password }
        );
        if (updateError) {
            console.error('Error updating password:', updateError);
            return;
        }
        console.log('Password updated.');
    } else {
        console.error('Error creating user:', createError);
        return;
    }
  } else {
      userId = user.id;
      console.log('User created successfully.');
  }

  // 2. Set as Admin in profiles table
  console.log(`Setting is_admin = true for user ${userId}...`);
  
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', userId);

  if (profileError) {
      console.error('Error updating profile:', profileError);
      // Try insert if profile doesn't exist (though trigger should have handled it)
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, is_admin: true })
        .select();
      
      if (insertError) {
          console.error('Error inserting profile:', insertError);
      } else {
          console.log('Profile created and set as admin.');
      }
  } else {
      console.log('Admin privileges granted successfully.');
  }
}

createAdmin();
