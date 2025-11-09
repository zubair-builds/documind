'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Saved Passwords
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Manage your encrypted PDF passwords
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {/* Add Password Button and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              {showAddForm ? 'Cancel' : '+ Add New Password'}
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search passwords..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Add Password Form */}
          {showAddForm && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add New Password
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Label
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g., Work Credit Card"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password to save"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleAddPassword}
                  disabled={!newPassword.trim() || !newLabel.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Save Password
                </button>
              </div>
            </div>
          )}

          {/* Passwords List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading passwords...
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : filteredPasswords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? 'No passwords match your search'
                  : 'No saved passwords yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPasswords.map((pwd) => (
                <div
                  key={pwd.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  {editingId === pwd.id ? (
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        onClick={() => handleSaveEdit(pwd.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {pwd.label}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last used: {formatDate(pwd.lastUsed)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Created: {formatDate(pwd.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(pwd)}
                          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(pwd.id)}
                          className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                🔒 Security Information
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Passwords are encrypted with AES-256 encryption</li>
                <li>• Only you can access your saved passwords</li>
                <li>• Passwords are stored securely on the server</li>
                <li>• Maximum 50 passwords per user</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

