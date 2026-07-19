"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../lib/axios";

export default function SettingsPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState("email");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    email: { enabled: false, host: "", port: 587, use_tls: true, username: "", password: "", sender_email: "" },
    messaging: { enabled: false, provider: "Twilio", api_key: "", webhook_secret: "" },
    security: { require_2fa: false, session_timeout: 30, password_expiry_days: 90 },
    storage: { provider: "S3", bucket_name: "", region: "" },
    backup: { frequency: "daily", retention_days: 30 }
  });

  useEffect(() => {
    if (!accessToken || user?.role !== "SUPER_ADMIN") {
      router.push("/");
    } else {
      fetchSettings();
    }
  }, [accessToken, user, router]);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings");
      // Merge with default state
      setSettings((prev) => ({
        ...prev,
        ...res.data
      }));
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch("/settings", settings);
      alert("Settings saved successfully.");
    } catch (err: any) {
      alert("Failed to save settings: " + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleNestedChange = (category: string, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h1 className="text-2xl font-bold mb-8 text-primary">CRM Admin</h1>
        <nav className="space-y-4">
          <a href="/" className="block px-4 py-2 hover:bg-slate-800 rounded">Back to Dashboard</a>
          <a href="/admin/users" className="block px-4 py-2 hover:bg-slate-800 rounded">User Management</a>
          <a href="/admin/approvals" className="block px-4 py-2 hover:bg-slate-800 rounded">Approvals Inbox</a>
          <a href="/admin/audit" className="block px-4 py-2 hover:bg-slate-800 rounded">Audit Logs</a>
          <a href="/admin/settings" className="block px-4 py-2 bg-slate-800 rounded">Global Settings</a>
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Global Settings</h2>
          <button 
            onClick={saveSettings}
            disabled={saving || loading}
            className="px-6 py-2 bg-primary text-white font-bold rounded shadow hover:bg-blue-600 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save All Changes"}
          </button>
        </div>

        {loading ? (
          <p>Loading settings...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            {/* Tabs Sidebar */}
            <div className="w-full md:w-64 bg-gray-50 border-r p-4 space-y-2">
              {['email', 'messaging', 'security', 'storage', 'backup'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-3 rounded font-bold capitalize transition ${
                    activeTab === tab ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab} Configuration
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-8">
              
              {/* Email Settings */}
              {activeTab === "email" && (
                <div className="max-w-2xl space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2">SMTP Email Settings</h3>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="email_enabled" checked={settings.email.enabled} onChange={(e) => handleNestedChange('email', 'enabled', e.target.checked)} />
                    <label htmlFor="email_enabled" className="font-bold text-gray-700">Enable Email Notifications</label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">SMTP Host</label>
                      <input type="text" className="w-full border p-2 rounded" value={settings.email.host} onChange={(e) => handleNestedChange('email', 'host', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">SMTP Port</label>
                      <input type="number" className="w-full border p-2 rounded" value={settings.email.port} onChange={(e) => handleNestedChange('email', 'port', parseInt(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Sender Email</label>
                    <input type="email" className="w-full border p-2 rounded" value={settings.email.sender_email} onChange={(e) => handleNestedChange('email', 'sender_email', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                      <input type="text" className="w-full border p-2 rounded" value={settings.email.username} onChange={(e) => handleNestedChange('email', 'username', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                      <input type="password" className="w-full border p-2 rounded" value={settings.email.password} onChange={(e) => handleNestedChange('email', 'password', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="use_tls" checked={settings.email.use_tls} onChange={(e) => handleNestedChange('email', 'use_tls', e.target.checked)} />
                    <label htmlFor="use_tls" className="font-bold text-gray-700">Use TLS Encryption</label>
                  </div>
                </div>
              )}

              {/* Messaging Settings */}
              {activeTab === "messaging" && (
                <div className="max-w-2xl space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2">SMS/WhatsApp Provider</h3>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="msg_enabled" checked={settings.messaging.enabled} onChange={(e) => handleNestedChange('messaging', 'enabled', e.target.checked)} />
                    <label htmlFor="msg_enabled" className="font-bold text-gray-700">Enable External Messaging API</label>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Provider</label>
                    <select className="w-full border p-2 rounded" value={settings.messaging.provider} onChange={(e) => handleNestedChange('messaging', 'provider', e.target.value)}>
                      <option value="Twilio">Twilio</option>
                      <option value="Gupshup">Gupshup</option>
                      <option value="AWS_SNS">AWS SNS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">API Key / Token</label>
                    <input type="password" className="w-full border p-2 rounded" value={settings.messaging.api_key} onChange={(e) => handleNestedChange('messaging', 'api_key', e.target.value)} />
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === "security" && (
                <div className="max-w-2xl space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Platform Security</h3>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="req_2fa" checked={settings.security.require_2fa} onChange={(e) => handleNestedChange('security', 'require_2fa', e.target.checked)} />
                    <label htmlFor="req_2fa" className="font-bold text-gray-700">Enforce 2FA for all Super Admins</label>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Session Timeout (minutes)</label>
                    <input type="number" className="w-full border p-2 rounded" value={settings.security.session_timeout} onChange={(e) => handleNestedChange('security', 'session_timeout', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Password Expiry (Days)</label>
                    <input type="number" className="w-full border p-2 rounded" value={settings.security.password_expiry_days} onChange={(e) => handleNestedChange('security', 'password_expiry_days', parseInt(e.target.value))} />
                  </div>
                </div>
              )}

              {/* Storage Settings */}
              {activeTab === "storage" && (
                <div className="max-w-2xl space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Document Storage Configuration</h3>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Storage Provider</label>
                    <select className="w-full border p-2 rounded" value={settings.storage.provider} onChange={(e) => handleNestedChange('storage', 'provider', e.target.value)}>
                      <option value="S3">Amazon S3</option>
                      <option value="GCS">Google Cloud Storage</option>
                      <option value="Local">Local Disk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Bucket Name</label>
                    <input type="text" className="w-full border p-2 rounded" value={settings.storage.bucket_name} onChange={(e) => handleNestedChange('storage', 'bucket_name', e.target.value)} />
                  </div>
                </div>
              )}

              {/* Backup Settings */}
              {activeTab === "backup" && (
                <div className="max-w-2xl space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Database Backup Schedule</h3>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Frequency</label>
                    <select className="w-full border p-2 rounded" value={settings.backup.frequency} onChange={(e) => handleNestedChange('backup', 'frequency', e.target.value)}>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Retention Period (Days)</label>
                    <input type="number" className="w-full border p-2 rounded" value={settings.backup.retention_days} onChange={(e) => handleNestedChange('backup', 'retention_days', parseInt(e.target.value))} />
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
