import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Mail, MessageSquare, Shield, LogOut, RefreshCw, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface NotificationLog {
  id: string;
  created_at: string;
  type: 'email' | 'wechat';
  recipient: string;
  asset_name: string;
  status: string;
}

interface LoginLog {
  id: string;
  user_id: string;
  login_at: string;
}

interface UserProfile {
  id: string;
  email_notify: boolean;
  is_admin: boolean;
  notify_days: number[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [todayEmails, setTodayEmails] = useState(0);
  const [todayWechats, setTodayWechats] = useState(0);
  
  // Lists
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: isAdmin } = await supabase.rpc('is_admin');

      if (!isAdmin) {
        navigate('/admin/login');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error checking admin:', error);
      navigate('/admin/login');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Total Users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(userCount || 0);

      // 2. Notification Logs
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      setNotificationLogs(logs || []);

      // Calculate today's stats
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = logs?.filter(l => l.created_at.startsWith(today)) || [];
      setTodayEmails(todayLogs.filter(l => l.type === 'email').length);
      setTodayWechats(todayLogs.filter(l => l.type === 'wechat').length);

      // 3. Login Logs
      const { data: logins } = await supabase
        .from('login_logs')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(50);
      setLoginLogs(logins || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navbar */}
      <nav className="bg-gray-900 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-indigo-400" />
              <span className="ml-3 text-xl font-bold tracking-wider">系统监控中心</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchData}
                className="p-2 rounded-full hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                title="刷新数据"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="h-6 w-px bg-gray-700"></div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md hover:bg-gray-800 text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Dashboard Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              运行概览
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              实时监控系统用户活跃度与通知发送状态
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-10">
            <div className="bg-white overflow-hidden shadow-md rounded-xl border-l-4 border-indigo-500">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-50 rounded-lg p-3">
                    <Users className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">总注册用户</dt>
                      <dd className="text-3xl font-bold text-gray-900">{totalUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-md rounded-xl border-l-4 border-blue-500">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-50 rounded-lg p-3">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">今日邮件发送</dt>
                      <dd className="text-3xl font-bold text-gray-900">{todayEmails}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-md rounded-xl border-l-4 border-green-500">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-50 rounded-lg p-3">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">今日微信发送</dt>
                      <dd className="text-3xl font-bold text-gray-900">{todayWechats}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Notification Logs */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-gray-500" />
                  通知发送日志
                </h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">最新 50 条</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">接收者</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {notificationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {format(new Date(log.created_at), 'MM-dd HH:mm:ss', { locale: zhCN })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.type === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {log.type === 'email' ? '邮件' : '微信'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[150px] truncate" title={log.recipient}>
                          {log.recipient}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status === 'success' ? '成功' : '失败'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {notificationLogs.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-10 text-gray-500">暂无数据</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Login Logs */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-gray-500" />
                  用户登录审计
                </h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">最新 50 条</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登录时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户 ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {format(new Date(log.login_at), 'MM-dd HH:mm:ss', { locale: zhCN })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {log.user_id}
                        </td>
                      </tr>
                    ))}
                    {loginLogs.length === 0 && (
                      <tr><td colSpan={2} className="text-center py-10 text-gray-500">暂无数据</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
