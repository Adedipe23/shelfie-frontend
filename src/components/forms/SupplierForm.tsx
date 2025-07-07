import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { Supplier } from '../../types';

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  supplier?: Supplier | null;
}

const SupplierForm: React.FC<SupplierFormProps> = ({
  isOpen,
  onClose,
  onSave,
  supplier
}) => {
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contact_name: supplier.contact_name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
      });
    } else {
      setFormData({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
      });
    }
    setErrors({});
  }, [supplier, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let savedSupplier: Supplier;
      
      if (supplier) {
        // Update existing supplier
        savedSupplier = await inventoryService.updateSupplier(supplier.id, formData);
        showSuccess('Supplier updated successfully');
      } else {
        // Create new supplier
        savedSupplier = await inventoryService.createSupplier(formData);
        showSuccess('Supplier created successfully');
      }
      
      onSave(savedSupplier);
      onClose();
    } catch (error) {
      console.error('Failed to save supplier:', error);
      showError('Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Edit Supplier' : 'Add New Supplier'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Supplier Name"
            value={formData.name}
            onChange={(value) => handleInputChange('name', value)}
            error={errors.name}
            required
            placeholder="Enter supplier name"
          />
        </div>

        <div>
          <Input
            label="Contact Name"
            value={formData.contact_name}
            onChange={(value) => handleInputChange('contact_name', value)}
            error={errors.contact_name}
            required
            placeholder="Enter contact person name"
          />
        </div>

        <div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => handleInputChange('email', value)}
            error={errors.email}
            placeholder="Enter email address"
          />
        </div>

        <div>
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(value) => handleInputChange('phone', value)}
            error={errors.phone}
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <Input
            label="Address"
            value={formData.address}
            onChange={(value) => handleInputChange('address', value)}
            error={errors.address}
            placeholder="Enter supplier address"
            multiline
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            {supplier ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierForm;
