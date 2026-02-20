/**
 * Transcendia Admin Panel
 * 
 * Dashboard for managing translations
 */

'use client';

import { useState, useEffect } from 'react';

interface Translation {
  id: string;
  key: string;
  value: string;
  language: string;
  status: string;
}

interface Contribution {
  id: string;
  key: string;
  suggestedValue: string;
  language: string;
  comment?: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'translations' | 'contributions' | 'languages'>('translations');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'contributions') {
      fetchContributions();
    }
  }, [activeTab]);

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/contribute?status=OPEN');
      const data = await response.json();
      setContributions(data.contributions || []);
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
    }
    setLoading(false);
  };

  const approveContribution = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/v1/contribute/${id}/approve`, {
        method: 'PUT',
      });
      if (response.ok) {
        fetchContributions();
      }
    } catch (error) {
      console.error('Failed to approve contribution:', error);
    }
  };

  const rejectContribution = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/v1/contribute/${id}/reject`, {
        method: 'PUT',
      });
      if (response.ok) {
        fetchContributions();
      }
    } catch (error) {
      console.error('Failed to reject contribution:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Transcendia Admin Panel
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('translations')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'translations'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Çeviriler
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'contributions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Katkılar
            </button>
            <button
              onClick={() => setActiveTab('languages')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'languages'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Diller
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg p-6">
          {activeTab === 'translations' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Çeviri Yönetimi</h2>
              <p className="text-gray-500">Çeviri anahtarlarını buradan yönetebilirsiniz.</p>
              {/* Translation list would go here */}
            </div>
          )}

          {activeTab === 'contributions' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Topluluk Katkıları</h2>
              {loading ? (
                <p>Yükleniyor...</p>
              ) : contributions.length === 0 ? (
                <p className="text-gray-500">Bekleyen katkı yok.</p>
              ) : (
                <div className="space-y-4">
                  {contributions.map((contribution) => (
                    <div
                      key={contribution.id}
                      className="border rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {contribution.key}
                          </p>
                          <p className="text-sm text-gray-500">
                            Dil: {contribution.language}
                          </p>
                          <p className="mt-2 text-green-600 font-medium">
                            Önerilen: {contribution.suggestedValue}
                          </p>
                          {contribution.comment && (
                            <p className="text-sm text-gray-400 mt-1">
                              Yorum: {contribution.comment}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => approveContribution(contribution.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => rejectContribution(contribution.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'languages' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Dil Yönetimi</h2>
              <p className="text-gray-500">Desteklenen dilleri buradan ekleyebilir veya düzenleyebilirsiniz.</p>
              {/* Language management would go here */}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
