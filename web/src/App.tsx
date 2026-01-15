import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo Mode: If using placeholder URL, mock a session
    if (import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
      console.log('Running in Demo Mode');
      setSession({
        access_token: 'mock',
        refresh_token: 'mock',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'mock-user', aud: 'authenticated', role: 'authenticated', email: 'demo@example.com', app_metadata: {}, user_metadata: {}, created_at: '' }
      } as Session);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
