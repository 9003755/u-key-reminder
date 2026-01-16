const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:eEJCLMqNYDajTOgM@db.owftlotklqlvtedevzsx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Get Assets
    const resAssets = await client.query('SELECT * FROM public.assets');
    console.log(`Found ${resAssets.rows.length} assets.`);

    // 2. Get Users (need to query auth schema which requires permissions, postgres role has it)
    const resUsers = await client.query('SELECT id, email FROM auth.users');
    console.log(`Found ${resUsers.rows.length} users.`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const asset of resAssets.rows) {
      console.log('------------------------------------------------');
      console.log(`Checking Asset: ${asset.name} (ID: ${asset.id})`);
      console.log(`Expiry Date: ${asset.expiry_date}`);
      console.log(`Notification Enabled: ${asset.notification_enabled}`);
      console.log(`User ID: ${asset.user_id}`);

      const user = resUsers.rows.find(u => u.id === asset.user_id);
      if (!user) {
        console.log('ERROR: User not found for this asset!');
        continue;
      }
      console.log(`User Email: ${user.email}`);

      if (asset.notification_enabled === false) {
        console.log('Skipping: Notification disabled.');
        continue;
      }

      const expiryDate = new Date(asset.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log(`Days until expiry: ${diffDays}`);

      if (diffDays <= 10) {
        console.log('>>> SHOULD SEND EMAIL <<<');
      } else {
        console.log('Not expiring soon.');
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
