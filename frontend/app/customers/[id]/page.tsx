"use client";

import { useState, useEffect } from "react";
import api from "../../../lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("ID_PROOF");
  const [file, setFile] = useState<File | null>(null);
  
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchCustomerData();
  }, [params.id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const [custRes, timeRes] = await Promise.all([
        api.get(`/customers/${params.id}`),
        api.get(`/customers/${params.id}/timeline`)
      ]);
      setCustomer(custRes.data);
      setTimeline(timeRes.data.timeline);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("doc_type", docType);
      formData.append("file", file);
      
      await api.post(`/customers/${params.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("Document uploaded successfully.");
      setFile(null);
      fetchCustomerData();
    } catch (err) {
      alert("Error uploading document");
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (docId: number, status: string) => {
    try {
      await api.patch(`/customers/documents/${docId}/verify`, { status });
      alert(`Document marked as ${status}`);
      
      if (status === 'VERIFIED') {
        window.location.href = '/customers'; // Use standard window navigation to force a full refresh, bypassing Next.js client router cache
      } else {
        fetchCustomerData();
      }
    } catch (err) {
      alert("Error verifying document. You might lack permissions.");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!customer) return <div className="p-8">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
      <div className="max-w-6xl w-full flex flex-col gap-8">
        
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 self-start">← Back</button>
        
        {/* Top Info Card */}
        <div className="bg-white p-6 rounded-xl shadow border">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{customer.name}</h2>
          <div className="flex gap-6 text-gray-600">
            <p><strong>Phone:</strong> {customer.phone || "-"}</p>
            <p><strong>Email:</strong> {customer.email || "-"}</p>
            <p><strong>Assigned To:</strong> User ID {customer.assigned_to_id}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Col: Documents */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-xl shadow border">
              <h3 className="text-xl font-bold mb-6 border-b pb-2">KYC Documents</h3>
              
              <div className="space-y-4 mb-8">
                {customer.documents?.map((doc: any) => (
                  <div key={doc.id} className="flex justify-between items-center p-4 border rounded-lg bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-800">{doc.doc_type}</p>
                      <a href={`http://localhost:8000${doc.file_url}`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View File</a>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        doc.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                        doc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status}
                      </span>
                      
                      {doc.status === 'UPLOADED' && (user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN') && (
                        <div className="flex gap-2">
                          <button onClick={() => handleVerify(doc.id, 'VERIFIED')} className="text-xs bg-green-500 text-white px-2 py-1 rounded">Verify</button>
                          <button onClick={() => handleVerify(doc.id, 'REJECTED')} className="text-xs bg-red-500 text-white px-2 py-1 rounded">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!customer.documents || customer.documents.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No documents uploaded.</p>
                )}
              </div>
              
              <form onSubmit={handleUpload} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-3">Upload New Document</h4>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-800 mb-1">Type</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full p-2 border rounded">
                      <option value="ID_PROOF">ID Proof</option>
                      <option value="ADDRESS_PROOF">Address Proof</option>
                      <option value="BANK_STATEMENT">Bank Statement</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-800 mb-1">File</label>
                    <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="w-full p-1 border rounded bg-white" required />
                  </div>
                  <button type="submit" disabled={uploading} className="bg-primary text-white px-4 py-2 rounded font-bold disabled:opacity-50">
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Timeline */}
          <div className="flex-1 bg-white p-6 rounded-xl shadow border">
            <h3 className="text-xl font-bold mb-6 border-b pb-2">Customer Journey</h3>
            
            <div className="space-y-6">
              {/* Stub for Bookings (Future Feature) */}
              <div className="relative pl-6 border-l-2 border-gray-200">
                <div className="absolute w-3 h-3 bg-gray-300 rounded-full -left-[7px] top-1"></div>
                <h4 className="font-bold text-gray-500">Bookings & Payments</h4>
                <p className="text-sm text-gray-400">Module not yet built...</p>
              </div>

              {timeline.map((item: any, idx: number) => (
                <div key={idx} className="relative pl-6 border-l-2 border-primary">
                  <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1"></div>
                  <h4 className="font-bold text-gray-800">{item.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(item.date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
