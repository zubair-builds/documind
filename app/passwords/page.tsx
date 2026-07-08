'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Key, ShieldCheck, Search, Plus, X, Trash2, Edit3, Save, Lock } from 'lucide-react';

interface SavedPassword {
  id: string;
  label: string;
  lastUsed: string;
  createdAt: string;
}

export default function PasswordsPage() {
  const [passwords, setPasswords] = useState<SavedPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/passwords');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch passwords');
      }

      setPasswords(data.passwords);
    } catch (err: any) {
      setError(err.message || 'Failed to load passwords');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this password?')) {
      return;
    }

    try {
      const response = await fetch(`/api/passwords/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPasswords(passwords.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Error deleting password:', err);
    }
  };

  const handleStartEdit = (pwd: SavedPassword) => {
    setEditingId(pwd.id);
    setEditLabel(pwd.label);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editLabel.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/passwords/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label: editLabel }),
      });

      if (response.ok) {
        setPasswords(
          passwords.map((p) =>
            p.id === id ? { ...p, label: editLabel } : p
          )
        );
        setEditingId(null);
        setEditLabel('');
      }
    } catch (err) {
      console.error('Error updating label:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const handleAddPassword = async () => {
    if (!newPassword.trim() || !newLabel.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
          label: newLabel,
        }),
      });

      if (response.ok) {
        await fetchPasswords();
        setShowAddForm(false);
        setNewPassword('');
        setNewLabel('');
      }
    } catch (err) {
      console.error('Error adding password:', err);
    }
  };

  const filteredPasswords = passwords.filter((pwd) =>
    pwd.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] border border-indigo-500/20">
          <Key className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
          Password Vault
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Manage your encrypted PDF passwords securely. Bank-level encryption ensures your data remains entirely yours.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-sm">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]"
          >
            {showAddForm ? (
              <><X className="w-5 h-5" /> Cancel</>
            ) : (
              <><Plus className="w-5 h-5" /> Add New Password</>
            )}
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your vault..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Add Password Form */}
        {showAddForm && (
          <div className="bg-slate-950/50 rounded-2xl p-6 mb-8 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" /> Add New Password
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., Work Credit Card"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password to save"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
            <button
              onClick={handleAddPassword}
              disabled={!newPassword.trim() || !newLabel.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] disabled:shadow-none disabled:cursor-not-allowed"
            >
              Save to Vault
            </button>
          </div>
        )}

        {/* Passwords List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-400">Decrypting vault...</p>
          </div>
        ) : error ? (
          <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 text-center">
            <p className="text-pink-400">{error}</p>
          </div>
        ) : filteredPasswords.length === 0 ? (
          <div className="text-center py-16 bg-slate-950/30 rounded-2xl border border-dashed border-slate-700">
            <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium text-lg">
              {searchQuery ? 'No passwords match your search' : 'Your vault is empty'}
            </p>
            <p className="text-slate-500 text-sm mt-2">Add a password to securely manage your PDF unlocks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPasswords.map((pwd) => (
              <div
                key={pwd.id}
                className="group border border-slate-700/50 bg-slate-900/50 hover:bg-slate-800/80 rounded-2xl p-5 md:p-6 transition-all hover:border-indigo-500/30 hover:shadow-lg"
              >
                {editingId === pwd.id ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="flex-1 w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200"
                      autoFocus
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleSaveEdit(pwd.id)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                      >
                        <Save className="w-4 h-4" /> Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <Key className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                          {pwd.label}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span>Last used: <span className="text-slate-400">{formatDate(pwd.lastUsed)}</span></span>
                          <span className="hidden sm:inline text-slate-700">•</span>
                          <span>Created: <span className="text-slate-400">{formatDate(pwd.createdAt)}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-center">
                      <button
                        onClick={() => handleStartEdit(pwd)}
                        className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Edit label"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(pwd.id)}
                        className="p-2 bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Delete password"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Security Info */}
        <div className="mt-10 pt-6 border-t border-slate-800/80">
          <div className="bg-emerald-500/5 rounded-2xl p-5 border border-emerald-500/10 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">Military-Grade Security</h4>
              <ul className="text-sm text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Passwords are encrypted with AES-256 before leaving your browser.</li>
                <li>Your vault is isolated. No one else, not even our engineers, can decrypt it.</li>
                <li>Secure cloud sync up to 50 passwords.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

