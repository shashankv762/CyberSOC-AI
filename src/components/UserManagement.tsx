import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit2, Trash2, Shield, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    role: 'analyst'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to fetch users from Firestore');
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ role: user.role });
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const userRef = doc(db, 'users', editingUser.id);
        await updateDoc(userRef, { role: formData.role });
        toast.success('User role updated');
      }
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      toast.error('Failed to update user');
      handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser?.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user profile? (This does not delete their Firebase Auth account)')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success('User profile deleted');
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      toast.error('Failed to delete user');
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  if (loading && users.length === 0) {
    return <div className="p-8 text-soc-muted">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-soc-text flex items-center gap-2">
            <Users className="w-6 h-6 text-soc-blue" />
            User Management
          </h2>
          <p className="text-soc-muted text-sm mt-1">Manage system access and roles (Firestore)</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-soc-red/10 border border-soc-red/20 text-soc-red rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-soc-surface border border-soc-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-soc-bg border-b border-soc-border text-soc-muted">
            <tr>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Email / Name</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Role</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Last Login</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-soc-bg/50 transition-colors">
                <td className="px-6 py-4 font-medium text-soc-text">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-soc-blue/20 flex items-center justify-center text-soc-blue font-bold">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <div>{user.displayName || 'Unknown'}</div>
                      <div className="text-xs text-soc-muted">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    user.role === 'admin' ? 'bg-soc-red/10 text-soc-red' : 'bg-soc-blue/10 text-soc-blue'
                  }`}>
                    {user.role === 'admin' && <Shield className="w-3 h-3" />}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-soc-muted">
                  {user.lastLogin ? `${formatDistanceToNow(new Date(user.lastLogin))} ago` : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(user)}
                      className="p-1.5 text-soc-muted hover:text-soc-blue hover:bg-soc-blue/10 rounded-lg transition-colors"
                      title="Edit Role"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-1.5 text-soc-muted hover:text-soc-red hover:bg-soc-red/10 rounded-lg transition-colors"
                      title="Delete User Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-soc-surface border border-soc-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-soc-border flex justify-between items-center bg-soc-bg/50">
                <h3 className="font-bold flex items-center gap-2 text-soc-text">
                  <Edit2 className="w-5 h-5 text-soc-blue" />
                  Edit User Role
                </h3>
                <button onClick={handleCloseModal} className="p-1 hover:bg-soc-border rounded-md transition-colors text-soc-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-soc-muted tracking-widest ml-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ role: e.target.value })}
                    className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-sm text-soc-text outline-none focus:border-soc-blue/50"
                  >
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-bold text-soc-text hover:bg-soc-border rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-bold bg-soc-blue text-white hover:bg-soc-blue/90 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
