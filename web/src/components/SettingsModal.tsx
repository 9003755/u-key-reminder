import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Force update trigger
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [pushPlusToken, setPushPlusToken] = useState('');
  const [notifyDays, setNotifyDays] = useState<string>('30, 7, 1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('wechat_webhook, notify_days')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      if (data) {
        setPushPlusToken(data.wechat_webhook || '');
        if (data.notify_days && Array.isArray(data.notify_days)) {
            setNotifyDays(data.notify_days.join(', '));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Parse notify days
      const daysArray = notifyDays.split(',')
        .map(d => parseInt(d.trim()))
        .filter(d => !isNaN(d) && d >= 0)
        .sort((a, b) => b - a); // Sort descending

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          wechat_webhook: pushPlusToken,
          notify_days: daysArray
        });

      if (error) throw error;
      onClose();
      alert('设置已保存');
    } catch (error) {
      alert('保存失败: ' + error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <MessageSquare className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      通知设置
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        配置微信通知，以便在手机上即时收到到期提醒。
                      </p>
                      <form onSubmit={handleSave} className="space-y-4">
                        <div>
                          <label htmlFor="token" className="block text-sm font-medium leading-6 text-gray-900">
                            PushPlus Token (微信推送)
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="token"
                              id="token"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                              placeholder="例如：a1b2c3d4e5..."
                              value={pushPlusToken}
                              onChange={(e) => setPushPlusToken(e.target.value)}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            1. 访问 <a href="https://www.pushplus.plus/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">pushplus.plus</a> 关注公众号<br/>
                            2. 复制您的 "Token" 填入上方
                          </p>
                        </div>

                        <div>
                          <label htmlFor="notify_days" className="block text-sm font-medium leading-6 text-gray-900">
                            提醒提前量 (天)
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="notify_days"
                              id="notify_days"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                              placeholder="例如：30, 7, 1"
                              value={notifyDays}
                              onChange={(e) => setNotifyDays(e.target.value)}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            请输入提前提醒的天数，用逗号分隔。<br/>例如 "30, 7, 1" 表示在到期前30天、7天和1天发送提醒。
                          </p>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                          >
                            {saving ? '保存中...' : '保存设置'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            onClick={onClose}
                          >
                            取消
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
