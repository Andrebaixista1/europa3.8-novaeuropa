import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

const BatchQueryDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
      setUploadStatus('idle');
      setResults(null);
    }
  };

  const handleUpload = () => {
    if (!fileName) return;
    
    setIsLoading(true);
    
    // Simulate processing
    setTimeout(() => {
      setIsLoading(false);
      setUploadStatus('success');
      
      // Mock results
      setResults([
        { id: 1, status: 'Processed', result: 'Valid Entry' },
        { id: 2, status: 'Processed', result: 'Invalid Format' },
        { id: 3, status: 'Processed', result: 'Valid Entry' },
        { id: 4, status: 'Processed', result: 'Valid Entry' },
        { id: 5, status: 'Processed', result: 'Missing Data' },
      ]);
    }, 2000);
  };

  const handleReset = () => {
    setFileName(null);
    setUploadStatus('idle');
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Batch Query Dashboard" />
      
      <div className="container mx-auto px-4 py-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white rounded-xl shadow-apple p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Upload Batch File</h2>
            <p className="text-neutral-600 mb-6">
              Upload a CSV or Excel file with your data for batch processing. Results will be displayed below.
            </p>
            
            <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center">
              <div className="mb-4 flex justify-center">
                <Upload size={32} className="text-primary-600" />
              </div>
              <p className="mb-4 text-neutral-600">
                {fileName ? `Selected file: ${fileName}` : 'Drag and drop your file here, or click to browse'}
              </p>
              <div className="flex justify-center">
                <input
                  type="file"
                  id="fileUpload"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                />
                <label htmlFor="fileUpload">
                  <Button
                    variant="secondary"
                    className="cursor-pointer mr-2"
                    icon={<FileText size={18} />}
                  >
                    Browse Files
                  </Button>
                </label>
                {fileName && (
                  <Button
                    variant="primary"
                    onClick={handleUpload}
                    disabled={isLoading}
                    icon={isLoading ? <LoadingSpinner size="sm" /> : null}
                  >
                    {isLoading ? 'Processing...' : 'Process File'}
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {uploadStatus === 'success' && results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-apple p-6"
            >
              <div className="flex items-center mb-4">
                <CheckCircle className="text-success-500 mr-2" size={20} />
                <h3 className="text-xl font-semibold">Batch Processing Results</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {results.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{item.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.status}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.result === 'Valid Entry'
                                ? 'bg-success-500 bg-opacity-10 text-success-500'
                                : 'bg-warning-500 bg-opacity-10 text-warning-500'
                            }`}
                          >
                            {item.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button variant="secondary" onClick={handleReset}>
                  Process Another File
                </Button>
              </div>
            </motion.div>
          )}
          
          {uploadStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-error-500 bg-opacity-10 text-error-500 rounded-xl p-6 flex items-start"
            >
              <AlertCircle className="mr-2 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h3 className="font-semibold mb-1">Error Processing File</h3>
                <p>There was an issue processing your file. Please check the format and try again.</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default BatchQueryDashboard;