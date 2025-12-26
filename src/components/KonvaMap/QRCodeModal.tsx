import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaTimes, FaPrint, FaDownload } from 'react-icons/fa';
import type { MapBoxData } from './MapBox';

// Production URL for QR codes
const PRODUCTION_URL = 'https://software.iegroup.gr';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  box: MapBoxData;
  baseUrl?: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  box,
  baseUrl = PRODUCTION_URL,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Generate the URL that the QR code will point to
  const qrUrl = `${baseUrl}/map?box=${box.id}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${box.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: white;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
            }
            .qr-code {
              padding: 20px;
              background: white;
              border: 3px solid #141418;
              border-radius: 16px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .box-name {
              font-size: 24px;
              font-weight: bold;
              color: #141418;
              margin-bottom: 8px;
            }
            .box-color {
              width: 20px;
              height: 20px;
              border-radius: 6px;
              display: inline-block;
              margin-right: 8px;
              vertical-align: middle;
            }
            .scan-text {
              font-size: 14px;
              color: #666;
              margin-top: 16px;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">
              ${printContent.querySelector('.qr-svg-container')?.innerHTML || ''}
            </div>
            <div class="box-name">
              <span class="box-color" style="background-color: ${box.color};"></span>
              ${box.name}
            </div>
            ${box.description ? `<div style="color: #666; font-size: 14px; margin-top: 8px;">${box.description}</div>` : ''}
            <div class="scan-text">Scan to view box details</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    const svg = printRef.current?.querySelector('svg');
    if (!svg) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2; // 2x for better quality
      canvas.height = img.height * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = `qr-${box.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#141418]/95 backdrop-blur-xl border border-[#2a2a35] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[fadeSlideIn_0.2s_ease-out]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ea2127]/50 to-transparent" />

        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: box.color }}
              >
                {box.name.charAt(0).toUpperCase()}
              </div>
              QR Code
            </h2>
            <button
              onClick={onClose}
              className="text-[#6b6b7a] hover:text-white transition-colors p-2 hover:bg-[#2a2a35] rounded-lg"
            >
              <FaTimes />
            </button>
          </div>

          {/* QR Code Display */}
          <div ref={printRef} className="flex flex-col items-center">
            <div className="qr-svg-container p-6 bg-white rounded-2xl shadow-lg mb-4">
              <QRCodeSVG
                value={qrUrl}
                size={200}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#141418"
              />
            </div>

            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: box.color }}
                />
                {box.name}
              </h3>
              {box.description && (
                <p className="text-sm text-[#8b8b9a] mt-1">{box.description}</p>
              )}
            </div>

            <p className="text-xs text-[#6b6b7a] text-center mb-6">
              Scan this QR code to view box details in the app
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1f] hover:bg-[#252530] text-white rounded-xl font-medium transition-all border border-[#2a2a35]"
            >
              <FaPrint className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#ea2127] to-[#d11920] hover:from-[#ff3b42] hover:to-[#ea2127] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#ea2127]/20"
            >
              <FaDownload className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
