import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import SupplierForm from '../../components/forms/SupplierForm';
import { Supplier } from '../../types';
import { invoke } from '@tauri-apps/api/core';

const SupplierManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const suppliersData = await inventoryService.getSuppliers();
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      showError('Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await inventoryService.deleteSupplier(supplierId);
      setSuppliers(suppliers.filter(supplier => supplier.id !== supplierId));
      showSuccess('Supplier deleted successfully');
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      showError('Failed to delete supplier');
    }
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setShowForm(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSupplier(null);
  };

  const handleFormSave = (supplier: Supplier) => {
    if (editingSupplier) {
      // Update existing supplier
      setSuppliers(suppliers.map(s => s.id === supplier.id ? supplier : s));
    } else {
      // Add new supplier
      setSuppliers([...suppliers, supplier]);
    }
  };

  const handleContactSupplier = async (supplier: Supplier, method: 'phone' | 'email') => {
    try {
      if (method === 'phone' && supplier.phone) {
        // Use Tauri's shell command to open external links
        await invoke('open_url', { url: `tel:${supplier.phone}` });
      } else if (method === 'email' && supplier.email) {
        const subject = encodeURIComponent(`Inquiry from ISMS`);
        const body = encodeURIComponent(`Dear ${supplier.contact_name || supplier.name},\n\nI hope this email finds you well. I am reaching out regarding our business partnership and potential orders.\n\nPlease let me know your availability for a discussion.\n\nBest regards,\n[Your Name]\n[Your Company]`);
        await invoke('open_url', { url: `mailto:${supplier.email}?subject=${subject}&body=${body}` });
      }
    } catch (error) {
      console.error('Failed to open external link:', error);
      // Fallback to window.open for development
      if (method === 'phone' && supplier.phone) {
        window.open(`tel:${supplier.phone}`, '_blank');
      } else if (method === 'email' && supplier.email) {
        const subject = encodeURIComponent(`Inquiry from ISMS`);
        const body = encodeURIComponent(`Dear ${supplier.contact_name || supplier.name},\n\nI hope this email finds you well. I am reaching out regarding our business partnership and potential orders.\n\nPlease let me know your availability for a discussion.\n\nBest regards,\n[Your Name]\n[Your Company]`);
        window.open(`mailto:${supplier.email}?subject=${subject}&body=${body}`, '_blank');
      }
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your suppliers and vendor relationships.
          </p>
        </div>
        <Button onClick={handleAddSupplier}>
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Supplier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {suppliers.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Suppliers</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                {suppliers.length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">With Contact Info</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {suppliers.filter(s => s.email || s.phone).length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-6">
        <input
          type="text"
          placeholder="Search suppliers by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </Card>

      {/* Suppliers Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {supplier.name}
                      </div>
                      {supplier.contact_name && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Contact: {supplier.contact_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white space-y-1">
                      {supplier.email && (
                        <div className="flex items-center">
                          <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <button
                            onClick={() => handleContactSupplier(supplier, 'email')}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                            title="Send email"
                          >
                            {supplier.email}
                          </button>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center">
                          <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <button
                            onClick={() => handleContactSupplier(supplier, 'phone')}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                            title="Call phone"
                          >
                            {supplier.phone}
                          </button>
                        </div>
                      )}
                      {!supplier.email && !supplier.phone && (
                        <span className="text-gray-400">No contact info</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {supplier.address || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSupplier(supplier)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No suppliers found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new supplier.'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Supplier Form Modal */}
      <SupplierForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSave={handleFormSave}
        supplier={editingSupplier}
      />
    </div>
  );
};

export default SupplierManagement;
