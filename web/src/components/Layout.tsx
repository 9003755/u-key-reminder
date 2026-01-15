import { LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Layout({ children }: { children: React.ReactNode }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">U盾/CA 提醒助手</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </button>
          </div>
        </div>
      </nav>
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
