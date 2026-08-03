"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../lib/axios";
import PageHeader from "../../../components/ui/PageHeader";

// ============================================================
// COMPACT SUB-COMPONENTS (OPTIMIZED FOR SaaS DENSITY)
// ============================================================

// 1. Compact Premium Input Field with Labels, Heights, and Focus Rings
interface PremiumInputProps {
  label: string;
  type?: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  id: string;
  placeholder?: string;
}

const PremiumInput = ({
  label,
  type = "text",
  value,
  onChange,
  icon,
  id,
  placeholder
}: PremiumInputProps) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={id} className="block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-widest">
        {label}
      </label>
      <div className="relative w-full group/input">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#94A3B8] group-focus-within/input:text-blue-500 transition-colors duration-250 z-10">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
          className="w-full h-[46px] pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] hover:border-blue-400 dark:hover:border-blue-500/50 focus:border-blue-600 dark:focus:border-blue-500 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-[#0F172A] transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
    </div>
  );
};

// 2. Compact iOS-style Toggle Switch (Centered & Primary Blue)
interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const ToggleSwitch = ({
  id,
  checked,
  onChange,
  label
}: ToggleSwitchProps) => {
  return (
    <div className="flex items-center justify-between pl-4 pr-5 h-14 bg-slate-50/50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl shadow-sm transition-all duration-200">
      <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">{label}</span>
      <button
        type="button"
        id={id}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/10 items-center ${
          checked ? 'bg-[#2563EB]' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

// 3. Compact Custom Searchable Dropdown Selector
interface DropdownOption {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  id: string;
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  icon: React.ReactNode;
}

const CustomDropdown = ({
  id,
  label,
  value,
  options,
  onChange,
  icon
}: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`#dropdown-${id}`)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isOpen, id]);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id={`dropdown-${id}`} className="flex flex-col gap-1.5 w-full relative">
      <span className="block text-[10px] font-bold text-slate-450 dark:text-[#94A3B8] uppercase tracking-widest">
        {label}
      </span>
      <div className="relative w-full group/dropdown">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#94A3B8] group-focus-within/dropdown:text-blue-500 transition-colors duration-250 z-10">
          {icon}
        </span>
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-[46px] text-left pl-11 pr-10 py-3 bg-slate-50/50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] hover:border-blue-400 dark:hover:border-blue-500/50 focus:border-blue-600 dark:focus:border-blue-500 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-[#0F172A] transition-all shadow-sm flex justify-between items-center"
        >
          <span className="truncate">{selectedOption?.label || value}</span>
          <svg 
            className={`w-[18px] h-[18px] text-slate-450 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-500" : ""}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl shadow-xl z-50 p-2 overflow-hidden animate-settings-tab-fade">
            <div className="relative mb-2 p-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 p-1 pr-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-between ${
                      opt.value === value
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#273449] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-2 text-slate-450 dark:text-[#94A3B8] text-xs">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
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

  // Tab Details & Metadata (using optimized 18px icons)
  const tabMetadata: Record<string, { label: string; cardTitle: string; icon: React.ReactNode }> = {
    email: {
      label: "Email",
      cardTitle: "SMTP Email Settings",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    messaging: {
      label: "Messaging",
      cardTitle: "SMS / WhatsApp Provider",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    security: {
      label: "Security",
      cardTitle: "Platform Security",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    storage: {
      label: "Storage",
      cardTitle: "Document Storage",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      )
    },
    backup: {
      label: "Backup",
      cardTitle: "Database Backup",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4-3 3m0 0-3-3m3 3V4" />
        </svg>
      )
    }
  };

  const messagingOptions = [
    { label: "Twilio", value: "Twilio" },
    { label: "Gupshup", value: "Gupshup" },
    { label: "AWS SNS", value: "AWS_SNS" }
  ];

  const storageOptions = [
    { label: "Amazon S3", value: "S3" },
    { label: "Google Cloud Storage", value: "GCS" },
    { label: "Local Disk", value: "Local" }
  ];

  const backupOptions = [
    { label: "Hourly", value: "hourly" },
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" }
  ];

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="max-w-5xl space-y-6 animate-settings-entrance relative pb-8">
      
      {/* BACKGROUND DECORATIVE GRADIENTS */}
      <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-blue-500/8 blur-[90px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

      <PageHeader
        breadcrumb="Dashboard / Administration / Global Settings"
        title="Global Settings"
        subtitle="Configure SMTP credentials, backup policies, messaging, and storage providers"
        actions={
          <button 
            onClick={saveSettings}
            disabled={saving || loading}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 cursor-pointer"
          >
            <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>{saving ? "Saving Changes..." : "Save All Changes"}</span>
          </button>
        }
      />

      {loading ? (
        <div className="relative z-10 overflow-hidden bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-[#2A3448] rounded-2xl shadow-sm p-10 text-center text-slate-500 dark:text-[#94A3B8] font-bold text-xs">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading system configurations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start relative z-10">
          
          {/* COMPACT LEFT SIDEBAR NAVIGATION */}
          <div className="md:col-span-1 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-hide shrink-0 bg-white dark:bg-[#1E293B] p-2.5 rounded-2xl border border-slate-200/80 dark:border-[#2A3448] shadow-sm">
            {['email', 'messaging', 'security', 'storage', 'backup'].map((tab) => {
              const active = activeTab === tab;
              const meta = tabMetadata[tab];
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full relative flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 select-none ${
                    active 
                      ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/10 translate-x-1" 
                      : "text-slate-655 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1E293B]/70 hover:text-slate-900 dark:hover:text-white hover:translate-x-1 hover:shadow-sm"
                  }`}
                >
                  {/* Left glowing indicator */}
                  {active && (
                    <span className="absolute left-2 top-[30%] bottom-[30%] w-0.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                  )}
                  
                  <span className={`transition-transform duration-300 ${active ? "scale-110 ml-1.5" : "group-hover:scale-110"}`}>
                    {meta.icon}
                  </span>
                  
                  <span className="truncate whitespace-nowrap">{meta.label} Configuration</span>
                </button>
              );
            })}
          </div>

          {/* COMPACT MAIN CONFIGURATION CONTENT */}
          <div className="md:col-span-3">
            <div 
              key={activeTab}
              className="relative overflow-visible bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-[#2A3448] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)] p-6 md:p-8 transition-all duration-300 hover:shadow-[0_6px_18px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_6px_22px_rgba(0,0,0,0.45)] hover:translate-y-[-2px] animate-settings-tab-fade"
            >
              {/* Top Accent Gradient Border */}
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-purple-500 to-transparent rounded-t-2xl" />
              
              {/* Card Header & Title */}
              <div className="mb-5 flex items-center gap-2.5">
                <span className="p-2 bg-blue-500/10 rounded-xl text-blue-500 flex items-center justify-center">
                  {tabMetadata[activeTab].icon}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{tabMetadata[activeTab].cardTitle}</h3>
              </div>
              
              {/* Divider */}
              <div className="h-[1px] bg-slate-100 dark:bg-slate-800 mb-5" />

              {/* Form Controls (Optimized Gaps to 16px = space-y-4) */}
              <div className="max-w-2xl space-y-6">
                
                {/* Email Tab Content */}
                {activeTab === "email" && (
                  <>
                    <ToggleSwitch 
                      id="email_enabled" 
                      label="Enable Email Notifications" 
                      checked={settings.email.enabled} 
                      onChange={(checked) => handleNestedChange('email', 'enabled', checked)} 
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PremiumInput 
                        id="email_host" 
                        label="SMTP Host" 
                        value={settings.email.host} 
                        onChange={(e) => handleNestedChange('email', 'host', e.target.value)} 
                        icon={
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        } 
                      />
                      <PremiumInput 
                        id="email_port" 
                        type="number"
                        label="SMTP Port" 
                        value={settings.email.port} 
                        onChange={(e) => handleNestedChange('email', 'port', parseInt(e.target.value) || 0)} 
                        icon={
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        } 
                      />
                    </div>

                    <PremiumInput 
                      id="email_sender" 
                      type="email"
                      label="Sender Email" 
                      value={settings.email.sender_email} 
                      onChange={(e) => handleNestedChange('email', 'sender_email', e.target.value)} 
                      icon={
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                        </svg>
                      } 
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PremiumInput 
                        id="email_username" 
                        label="Username" 
                        value={settings.email.username} 
                        onChange={(e) => handleNestedChange('email', 'username', e.target.value)} 
                        icon={
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        } 
                      />
                      <PremiumInput 
                        id="email_password" 
                        type="password"
                        label="Password" 
                        value={settings.email.password} 
                        onChange={(e) => handleNestedChange('email', 'password', e.target.value)} 
                        icon={
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        } 
                      />
                    </div>

                    <ToggleSwitch 
                      id="use_tls" 
                      label="Use TLS Encryption" 
                      checked={settings.email.use_tls} 
                      onChange={(checked) => handleNestedChange('email', 'use_tls', checked)} 
                    />
                  </>
                )}

                {/* Messaging Tab Content */}
                {activeTab === "messaging" && (
                  <>
                    <ToggleSwitch 
                      id="messaging_enabled" 
                      label="Enable External Messaging API" 
                      checked={settings.messaging.enabled} 
                      onChange={(checked) => handleNestedChange('messaging', 'enabled', checked)} 
                    />

                    <CustomDropdown 
                      id="messaging_provider" 
                      label="Provider" 
                      value={settings.messaging.provider} 
                      options={messagingOptions} 
                      onChange={(value) => handleNestedChange('messaging', 'provider', value)} 
                      icon={
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      }
                    />

                    <PremiumInput 
                      id="messaging_api_key" 
                      type="password"
                      label="API Key / Token" 
                      value={settings.messaging.api_key} 
                      onChange={(e) => handleNestedChange('messaging', 'api_key', e.target.value)} 
                      icon={
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-5 4a5 5 0 01-1.89-4H5a2 2 0 00-2 2v3a2 2 0 002 2h1v1a1 1 0 001 1h1a1 1 0 001-1v-1h3a5 5 0 011.89-4z" />
                        </svg>
                      } 
                    />
                  </>
                )}

                {/* Security Tab Content */}
                {activeTab === "security" && (
                  <>
                    <ToggleSwitch 
                      id="require_2fa" 
                      label="Enforce 2FA for all Super Admins" 
                      checked={settings.security.require_2fa} 
                      onChange={(checked) => handleNestedChange('security', 'require_2fa', checked)} 
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PremiumInput 
                        id="security_timeout" 
                        type="number"
                        label="Session Timeout (minutes)" 
                        value={settings.security.session_timeout} 
                        onChange={(e) => handleNestedChange('security', 'session_timeout', parseInt(e.target.value) || 0)} 
                        icon={
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        } 
                      />
                      <PremiumInput 
                        id="security_expiry" 
                        type="number"
                        label="Password Expiry (Days)" 
                        value={settings.security.password_expiry_days} 
                        onChange={(e) => handleNestedChange('security', 'password_expiry_days', parseInt(e.target.value) || 0)} 
                        icon={
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        } 
                      />
                    </div>
                  </>
                )}

                {/* Storage Tab Content */}
                {activeTab === "storage" && (
                  <>
                    <CustomDropdown 
                      id="storage_provider" 
                      label="Storage Provider" 
                      value={settings.storage.provider} 
                      options={storageOptions} 
                      onChange={(value) => handleNestedChange('storage', 'provider', value)} 
                      icon={
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                      }
                    />

                    <PremiumInput 
                      id="storage_bucket" 
                      label="Bucket Name" 
                      value={settings.storage.bucket_name} 
                      onChange={(e) => handleNestedChange('storage', 'bucket_name', e.target.value)} 
                      icon={
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      } 
                    />
                  </>
                )}

                {/* Backup Tab Content */}
                {activeTab === "backup" && (
                  <>
                    <CustomDropdown 
                      id="backup_frequency" 
                      label="Frequency" 
                      value={settings.backup.frequency} 
                      options={backupOptions} 
                      onChange={(value) => handleNestedChange('backup', 'frequency', value)} 
                      icon={
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                        </svg>
                      }
                    />

                    <PremiumInput 
                      id="backup_retention" 
                      type="number"
                      label="Retention Period (Days)" 
                      value={settings.backup.retention_days} 
                      onChange={(e) => handleNestedChange('backup', 'retention_days', parseInt(e.target.value) || 0)} 
                      icon={
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      } 
                    />
                  </>
                )}

              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
