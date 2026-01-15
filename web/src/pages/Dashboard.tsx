import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { differenceInDays, parseISO } from 'date-fns';
import { Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import AssetModal from '../components/AssetModal';

interface Asset {
  id?: string;
  name: string;
  type: string;
  expiry_date: string;
  renewal_method: string;
  websites: string[];
  notes: string;
}

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      // Mock data for demo if connection fails (or env vars missing)
      if (import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
         setAssets([
           { id: '1', name: '工商银行U盾', type: 'U-Key', expiry_date: '2026-02-01', renewal_method: '柜台办理', websites: ['www.xx.com'], notes: '公司公户' },
           { id: '2', name: '阿里云域名', type: 'Domain', expiry_date: '2026-01-20', renewal_method: '在线续费', websites: ['www.yy.com'], notes: '自动续费失败' },
           { id: '3', name: '招投标CA', type: 'CA', expiry_date: '2026-06-15', renewal_method: '网站支付', websites: ['www.uu.com', 'www.ii.com'], notes: '' },
         ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingAsset(null);
    setIsModalOpen(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    fetchAssets();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个资产吗？此操作无法撤销。')) {
      return;
    }

    try {
      if (import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
        alert('演示模式：资产已删除（刷新后恢复）');
        setAssets(assets.filter(a => a.id !== id));
        return;
      }

      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAssets();
    } catch (error: any) {
      alert('Error deleting asset: ' + error.message);
    }
  };

  const getStatusColor = (dateStr: string) => {
    const days = differenceInDays(parseISO(dateStr), new Date());
    if (days < 7) return 'bg-red-100 text-red-800';
    if (days < 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = (dateStr: string) => {
    const days = differenceInDays(parseISO(dateStr), new Date());
    if (days < 7) return <AlertTriangle className="h-4 w-4 mr-1" />;
    if (days < 30) return <Clock className="h-4 w-4 mr-1" />;
    return <CheckCircle className="h-4 w-4 mr-1" />;
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">资产列表</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理您的所有 U盾、CA 证书及其他到期资产。
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleAdd}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Plus className="inline-block h-4 w-4 mr-1" />
            添加资产
          </button>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">名称</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">类型</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">到期日</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">剩余天数</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">续费方式</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">使用的网站</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-4">加载中...</td></tr>
                  ) : assets.map((asset) => {
                    const daysLeft = differenceInDays(parseISO(asset.expiry_date), new Date());
                    return (
                      <tr key={asset.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {asset.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.type}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.expiry_date}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(asset.expiry_date)}`}>
                            {getStatusIcon(asset.expiry_date)}
                            {daysLeft} 天
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.renewal_method}</td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {asset.websites?.map((site, index) => (
                            <div key={index}>
                              <a href={site.startsWith('http') ? site : `https://${site}`} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-700">
                                {site}
                              </a>
                            </div>
                          ))}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(asset)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => asset.id && handleDelete(asset.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <AssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingAsset}
      />
    </div>
  );
}
