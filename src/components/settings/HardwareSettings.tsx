import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface Device {
  id: string;
  name: string;
  type: 'printer' | 'scanner';
  status: 'connected' | 'disconnected';
}

const HardwareSettings: React.FC = () => {
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedScanner, setSelectedScanner] = useState<string>('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  // In a real implementation, this would scan for actual hardware devices
  const scanForDevices = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual hardware scanning
      // For now, we'll show a message that no devices were found
      setDevices([]);
      toast.success('Device scan completed');
    } catch (error) {
      toast.error('Failed to scan for devices');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = () => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first');
      return;
    }

    const printer = devices.find(p => p.id === selectedPrinter && p.type === 'printer');
    if (printer) {
      toast.success(`Test print sent to ${printer.name}!`);
    } else {
      toast.error('Selected printer not found');
    }
  };

  const handleTestScan = () => {
    if (!selectedScanner) {
      toast.error('Please select a scanner first');
      return;
    }

    const scanner = devices.find(s => s.id === selectedScanner && s.type === 'scanner');
    if (scanner) {
      toast.success(`Scanner test completed for ${scanner.name}!`);
    } else {
      toast.error('Selected scanner not found');
    }
  };

  const handlePrintBarcode = (productName: string) => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first');
      return;
    }

    toast.success(`Barcode for "${productName}" sent to printer!`);
  };

  return (
    <div className="space-y-6">
      {/* Device Scanner */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hardware Devices</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan for connected printers and barcode scanners
              </p>
              <Button
                onClick={scanForDevices}
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Scanning...' : 'Scan for Devices'}
              </Button>
            </div>

            {devices.length === 0 && !loading && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">No hardware devices found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Click "Scan for Devices" to search for connected hardware
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Label Printer Settings */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Label Printer</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Printer
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a printer...</option>
                {devices.filter(device => device.type === 'printer').map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name} ({printer.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleTestPrint}
                disabled={!selectedPrinter}
                variant="outline"
              >
                Test Print
              </Button>

              <Button
                onClick={() => handlePrintBarcode('Sample Product')}
                disabled={!selectedPrinter}
                variant="outline"
              >
                Print Sample Barcode
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Receipt Printer Settings */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receipt Printer</h3>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
              <h4 className="font-medium text-green-800 dark:text-green-400 mb-2">Standard OS Print</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Receipts are printed using the standard browser print dialog (window.print()).
                This allows users to select any printer available on their system.
              </p>
            </div>

            <Button
              onClick={() => {
                // Test receipt printing
                const receiptContent = `
                  <div style="font-family: monospace; width: 300px; margin: 0 auto; padding: 20px;">
                    <h2 style="text-align: center; margin: 0;">ISMS Store</h2>
                    <p style="text-align: center; margin: 5px 0;">Sample Receipt</p>
                    <hr style="margin: 10px 0;">
                    <p style="margin: 2px 0;">Date: ${new Date().toLocaleDateString()}</p>
                    <p style="margin: 2px 0;">Time: ${new Date().toLocaleTimeString()}</p>
                    <hr style="margin: 10px 0;">
                    <p style="margin: 2px 0;">Sample Item 1 ............ $10.00</p>
                    <p style="margin: 2px 0;">Sample Item 2 ............ $15.00</p>
                    <hr style="margin: 10px 0;">
                    <p style="margin: 5px 0;"><strong>Total: $25.00</strong></p>
                    <p style="text-align: center; margin: 10px 0;">Thank you!</p>
                  </div>
                `;

                const printWindow = window.open('', '_blank', 'width=400,height=600');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Test Receipt</title>
                        <style>
                          body { margin: 0; padding: 0; }
                          @media print { body { margin: 0; } }
                        </style>
                      </head>
                      <body>${receiptContent}</body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                  printWindow.close();
                }

                toast.success('Receipt print dialog opened!');
              }}
              variant="outline"
            >
              Test Receipt Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Barcode Scanner Settings */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Barcode Scanner</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Scanner
              </label>
              <select
                value={selectedScanner}
                onChange={(e) => setSelectedScanner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a scanner...</option>
                {devices.filter(device => device.type === 'scanner').map((scanner) => (
                  <option key={scanner.id} value={scanner.id}>
                    {scanner.name} ({scanner.status})
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleTestScan}
              disabled={!selectedScanner}
              variant="outline"
            >
              Test Scanner
            </Button>

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>HID Keyboard Emulation:</strong> Most barcode scanners work as keyboard input devices.
                Scanned barcodes are automatically captured by the global keyboard listener in the POS interface.
              </p>
            </div>
          </div>
        </div>
      </Card>


    </div>
  );
};

export default HardwareSettings;
