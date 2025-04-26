import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, FileText, Check, X } from 'lucide-react';
import Papa from 'papaparse';
import { useCartStore } from '../store/cartStore';
import { useBulkOrderStore } from '../store/bulkOrderStore';

interface BeneficiaryData {
  name: string;
  phone_number: string;
  address: string;
  errors?: string[];
}

interface BulkOrderUploadProps {
  onClose?: () => void;
}

export const BulkOrderUpload: React.FC<BulkOrderUploadProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { items, total } = useCartStore();
  const { createBulkOrder } = useBulkOrderStore();
  
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryData[]>([]);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState<'ngo' | 'charity' | 'business' | 'individual'>('ngo');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('validating');
    setError(null);

    Papa.parse(file, {
      complete: (results) => {
        try {
          const data = results.data as string[][];
          // Skip header row and validate data
          const validatedBeneficiaries = data.slice(1)
            .filter(row => row.length >= 3 && row[0]) // Ensure row has required fields
            .map(row => {
              const beneficiary: BeneficiaryData = {
                name: row[0]?.trim() || '',
                phone_number: row[1]?.trim() || '',
                address: row[2]?.trim() || '',
                errors: []
              };

              // Validate each field
              if (!beneficiary.name) {
                beneficiary.errors?.push('Name is required');
              }
              if (beneficiary.phone_number && !/^\+?[\d\s-]{10,}$/.test(beneficiary.phone_number)) {
                beneficiary.errors?.push('Invalid phone number format');
              }
              if (!beneficiary.address) {
                beneficiary.errors?.push('Address is required');
              }

              return beneficiary;
            });

          const hasErrors = validatedBeneficiaries.some(b => b.errors?.length);
          setUploadStatus(hasErrors ? 'invalid' : 'valid');
          setBeneficiaries(validatedBeneficiaries);

          if (hasErrors) {
            setError('Some beneficiary records contain errors. Please review and correct them.');
          }
        } catch (error) {
          setUploadStatus('invalid');
          setError('Failed to parse CSV file. Please ensure it follows the correct format.');
        }
      },
      error: (error) => {
        setUploadStatus('invalid');
        setError(`Failed to read CSV file: ${error.message}`);
      }
    });
  };

  const handleSubmit = async () => {
    if (!organizationName) {
      setError('Organization name is required');
      return;
    }

    if (beneficiaries.length === 0) {
      setError('At least one beneficiary is required');
      return;
    }

    if (beneficiaries.some(b => b.errors?.length)) {
      setError('Please fix all validation errors before submitting');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createBulkOrder({
        organization_name: organizationName,
        organization_type: organizationType,
        total_amount: total(),
        beneficiaries: beneficiaries.map(b => ({
          name: b.name,
          contact_info: b.phone_number,
          allocation_details: {
            address: b.address,
            items: items.map(item => ({
              product_id: item.productId,
              quantity: item.quantity,
              unit_price: item.price
            }))
          }
        }))
      });

      if (onClose) onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Name,Phone Number,Delivery Address\nJohn Doe,+2341234567890,123 Main St Lagos";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_order_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Bulk Order Upload</h2>

      {/* Organization Details */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Organization Name
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Organization Type
              <span className="text-red-500">*</span>
            </label>
            <select
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="ngo">NGO</option>
              <option value="charity">Charity</option>
              <option value="business">Business</option>
              <option value="individual">Individual</option>
            </select>
          </div>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Beneficiary List</h3>
          <button
            onClick={downloadTemplate}
            className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center"
          >
            <FileText className="h-4 w-4 mr-1" />
            Download Template
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload CSV File
          </button>
          <p className="mt-2 text-sm text-gray-500">
            Upload a CSV file containing beneficiary details
          </p>
        </div>

        {/* Upload Status */}
        {uploadStatus !== 'idle' && (
          <div className={`mt-4 p-4 rounded-lg ${
            uploadStatus === 'valid' ? 'bg-green-50' : 
            uploadStatus === 'invalid' ? 'bg-red-50' : 
            'bg-yellow-50'
          }`}>
            <div className="flex items-center">
              {uploadStatus === 'valid' && <Check className="h-5 w-5 text-green-500 mr-2" />}
              {uploadStatus === 'invalid' && <X className="h-5 w-5 text-red-500 mr-2" />}
              {uploadStatus === 'validating' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500 mr-2"></div>
              )}
              <span className={
                uploadStatus === 'valid' ? 'text-green-700' :
                uploadStatus === 'invalid' ? 'text-red-700' :
                'text-yellow-700'
              }>
                {uploadStatus === 'valid' && 'File validated successfully'}
                {uploadStatus === 'invalid' && 'Validation failed'}
                {uploadStatus === 'validating' && 'Validating file...'}
              </span>
            </div>
          </div>
        )}

        {/* Beneficiary List */}
        {beneficiaries.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Uploaded Beneficiaries ({beneficiaries.length})
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {beneficiaries.map((beneficiary, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {beneficiary.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {beneficiary.phone_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {beneficiary.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {beneficiary.errors?.length ? (
                          <div className="text-red-600 text-sm">
                            {beneficiary.errors.join(', ')}
                          </div>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span>₦{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total per Beneficiary</span>
                <span>₦{total().toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-2">
                <span>Total for {beneficiaries.length} Beneficiaries</span>
                <span>₦{(total() * beneficiaries.length).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <div className="flex items-center text-red-800">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => onClose?.()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading || uploadStatus !== 'valid'}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Create Bulk Order'}
        </button>
      </div>
    </div>
  );
};