import React, { useState, useEffect } from 'react';

export const SystemAdminPaymentConfig: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    publicKey: '',
    secretKey: '',
    apiEndpoint: 'https://app.dalipay.co.tz',
    isSandbox: false
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data?.dalipay) {
          setFormData({
            publicKey: data.dalipay.publicKey || '',
            secretKey: data.dalipay.secretKey || '',
            apiEndpoint: data.dalipay.apiEndpoint || 'https://app.dalipay.co.tz',
            isSandbox: Boolean(data.dalipay.isSandbox)
          });
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/dalipay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (res.ok) {
        alert("✅ Mipangilio ya Admin (Subscription Gateway) imehifadhiwa!");
      } else {
        alert("❌ Kosa: " + result.message);
      }
    } catch (err: any) {
      alert("❌ Hitilafu ya mawasiliano: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-6 bg-white rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-bold">Admin Subscription Payment Gateway</h2>
      <p className="text-sm text-gray-600">Funguo hizi zinatumika kupokea malipo ya mwezi kutoka kwa Hotspot Owners.</p>

      <div>
        <label className="block text-sm font-medium">Super Admin Public Key (gw_pk_...)</label>
        <input
          type="text"
          value={formData.publicKey}
          onChange={e => setFormData({ ...formData, publicKey: e.target.value })}
          className="w-full mt-1 border p-2 rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Super Admin Secret Key (gw_sk_...)</label>
        <input
          type="password"
          value={formData.secretKey}
          onChange={e => setFormData({ ...formData, secretKey: e.target.value })}
          className="w-full mt-1 border p-2 rounded"
          required
        />
      </div>

      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
        {loading ? "Inahifadhi..." : "Hifadhi Mipangilio ya Admin"}
      </button>
    </form>
  );
};