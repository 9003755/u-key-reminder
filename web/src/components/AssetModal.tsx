import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Plus, Trash2, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Asset {
  id?: string;
  name: string;
  type: string;
  expiry_date: string;
  renewal_method: string;
  websites: string[];
  notes: string;
  notification_enabled?: boolean;
  images?: string[];
}

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: Asset | null;
}

const ASSET_TYPES = ['U-Key', 'CA', 'Domain', 'Server', 'Insurance', '交付/投标/付款截止日', 'Other'];

export default function AssetModal({ isOpen, onClose, onSave, initialData }: AssetModalProps) {
  const [formData, setFormData] = useState<Asset>({
    name: '',
    type: 'U-Key',
    expiry_date: '',
    renewal_method: '',
    websites: [''],
    notes: '',
    notification_enabled: true,
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [notifyDaysString, setNotifyDaysString] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        websites: initialData.websites && initialData.websites.length > 0 ? initialData.websites : [''],
        notification_enabled: initialData.notification_enabled ?? true,
        images: initialData.images || []
      });
      // Handle notify days
      if (initialData.notify_advance_days && initialData.notify_advance_days.length > 0) {
        setNotifyDaysString(initialData.notify_advance_days.join(', '));
      } else {
        setNotifyDaysString('');
      }
    } else {
      setFormData({
        name: '',
        type: 'U-Key',
        expiry_date: '',
        renewal_method: '',
        websites: [''],
        notes: '',
        notification_enabled: true,
        images: []
      });
      setNotifyDaysString('');
    }
  }, [initialData, isOpen]);

  const handleWebsiteChange = (index: number, value: string) => {
    const newWebsites = [...formData.websites];
    newWebsites[index] = value;
    setFormData({ ...formData, websites: newWebsites });
  };

  const addWebsiteField = () => {
    setFormData({ ...formData, websites: [...formData.websites, ''] });
  };

  const removeWebsiteField = (index: number) => {
    const newWebsites = formData.websites.filter((_, i) => i !== index);
    setFormData({ ...formData, websites: newWebsites.length ? newWebsites : [''] });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    if ((formData.images?.length || 0) >= 2) {
      alert('每个设备最多只能上传两张照片');
      return;
    }

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('asset-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('asset-images')
        .getPublicUrl(filePath);

      const currentImages = formData.images || [];
      setFormData({ ...formData, images: [...currentImages, data.publicUrl] });
      
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = formData.images || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Filter out empty websites
    const cleanWebsites = formData.websites.filter(w => w.trim() !== '');
    
    // Parse notify days
    const notifyDaysArray = notifyDaysString.split(/[,，]/) // Support both English and Chinese commas
      .map(d => parseInt(d.trim()))
      .filter(d => !isNaN(d) && d >= 0)
      .sort((a, b) => b - a);

    const dataToSave = { ...formData, websites: cleanWebsites, notify_advance_days: notifyDaysArray };

    try {
      // Demo Mode Handling
      if (import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
        alert('演示模式：数据已保存（刷新页面后会重置）');
        onSave();
        onClose();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      if (initialData?.id) {
        const { error } = await supabase
          .from('assets')
          .update({ ...dataToSave, user_id: user.id })
          .eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([{ ...dataToSave, user_id: user.id }]);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      alert('Error saving asset: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      {initialData ? '编辑资产' : '添加新资产'}
                    </Dialog.Title>
                    <div className="mt-2">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">名称</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              required
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="type" className="block text-sm font-medium leading-6 text-gray-900">类型</label>
                          <div className="mt-1">
                            <select
                              id="type"
                              name="type"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                              value={formData.type}
                              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                              {ASSET_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="expiry_date" className="block text-sm font-medium leading-6 text-gray-900">到期日</label>
                          <div className="mt-1">
                            <input
                              type="date"
                              name="expiry_date"
                              id="expiry_date"
                              required
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                              value={formData.expiry_date}
                              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                            />
                          </div>

                          <div className="mt-4">
                            <label htmlFor="notify_days" className="block text-sm font-medium leading-6 text-gray-900">
                              设置提醒提前量 (天)
                            </label>
                            <div className="mt-1">
                              <input
                                type="text"
                                name="notify_days"
                                id="notify_days"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                placeholder="例如: 30, 7, 1"
                                value={notifyDaysString}
                                onChange={(e) => setNotifyDaysString(e.target.value)}
                              />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              请用逗号分隔天数。例如 "30, 7, 1" 表示在到期前30天、7天和1天发送提醒。
                            </p>
                          </div>

                          <div className="mt-2 flex items-center">
                            <input
                              id="notification_enabled"
                              name="notification_enabled"
                              type="checkbox"
                              checked={formData.notification_enabled}
                              onChange={(e) => {
                                if (!e.target.checked) {
                                  if (window.confirm("⚠️ 确认关闭提醒吗？\n\n关闭后，该资产到期前您将无法收到任何邮件或微信提醒，可能会导致业务中断风险。\n\n是否确认关闭？")) {
                                    setFormData({ ...formData, notification_enabled: false });
                                  }
                                  // If user cancels, do nothing (keep it checked)
                                } else {
                                  setFormData({ ...formData, notification_enabled: true });
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <label htmlFor="notification_enabled" className="ml-2 block text-sm text-gray-900">
                              启用到期提醒 {formData.notification_enabled === false && <span className="text-red-500 text-xs font-bold">(已关闭)</span>}
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium leading-6 text-gray-900">使用的网站</label>
                          {formData.websites.map((site, index) => (
                            <div key={index} className="flex mt-1 gap-2">
                              <input
                                type="text"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                                placeholder="www.example.com"
                                value={site}
                                onChange={(e) => handleWebsiteChange(index, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => removeWebsiteField(index)}
                                className="inline-flex items-center p-1.5 border border-transparent rounded-full text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addWebsiteField}
                            className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            添加网站
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium leading-6 text-gray-900">照片 (最多2张)</label>
                          <div className="mt-2 flex items-center gap-4 flex-wrap">
                            {formData.images?.map((img, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={img}
                                  alt={`Asset ${index + 1}`}
                                  className="h-24 w-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setPreviewImage(img)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            
                            {(formData.images?.length || 0) < 2 && (
                              <label className={`
                                flex flex-col items-center justify-center h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 
                                cursor-pointer hover:border-indigo-500 hover:bg-gray-50 transition-all
                                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                              `}>
                                <div className="text-center">
                                  <Camera className="mx-auto h-6 w-6 text-gray-400" />
                                  <span className="mt-1 block text-xs text-gray-500">拍照/上传</span>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  disabled={uploading}
                                />
                              </label>
                            )}
                          </div>
                          {uploading && <p className="mt-1 text-xs text-indigo-500">正在上传...</p>}
                          <p className="mt-1 text-xs text-gray-500">支持上传照片或直接拍照，方便记录设备外观或序列号。</p>
                        </div>

                        <div>
                          <label htmlFor="renewal_method" className="block text-sm font-medium leading-6 text-gray-900">续费方式</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="renewal_method"
                              id="renewal_method"
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                              value={formData.renewal_method}
                              onChange={(e) => setFormData({ ...formData, renewal_method: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="notes" className="block text-sm font-medium leading-6 text-gray-900">备注</label>
                          <div className="mt-1">
                            <textarea
                              id="notes"
                              name="notes"
                              rows={3}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                              value={formData.notes}
                              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                          >
                            {loading ? '保存中...' : '保存'}
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

    {/* Image Preview Modal */}
    <Transition.Root show={!!previewImage} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setPreviewImage(null)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-90 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-transparent text-left shadow-xl transition-all max-w-4xl w-full">
                <div className="absolute right-0 top-0 pr-4 pt-4 z-10">
                  <button
                    type="button"
                    className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none"
                    onClick={() => setPreviewImage(null)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex justify-center">
                  <img
                    src={previewImage || ''}
                    alt="Preview"
                    className="max-h-[85vh] w-auto object-contain rounded-md"
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
    </>
  );
}
