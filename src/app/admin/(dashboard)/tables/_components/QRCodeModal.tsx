'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DownloadIcon } from 'lucide-react';

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: number;
  token: string;
}

function getOrderUrl(token: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${baseUrl}/order/${token}`;
}

export function QRCodeModal({
  open,
  onOpenChange,
  tableNumber,
  token,
}: QRCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    const url = getOrderUrl(token);
    QRCode.toDataURL(url, { width: 300, margin: 2 }).then((d) => {
      if (!cancelled) setDataUrl(d);
    });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  async function handleDownloadPdf() {
    const url = getOrderUrl(token);
    const qrDataUrl = await QRCode.toDataURL(url, { width: 600, margin: 2 });

    const { jsPDF } = await import('jspdf');
    // A6: 105mm x 148mm
    const doc = new jsPDF({ format: [105, 148], unit: 'mm' });

    // Title
    doc.setFontSize(24);
    doc.text(`Table ${tableNumber}`, 105 / 2, 28, { align: 'center' });

    // QR Code (centered, 60mm x 60mm)
    const qrSize = 60;
    const qrX = (105 - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, 42, qrSize, qrSize);

    // Instructions
    doc.setFontSize(14);
    doc.text('Scan QR code', 105 / 2, 116, { align: 'center' });
    doc.text('to order', 105 / 2, 124, { align: 'center' });

    doc.save(`table-${tableNumber}.pdf`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>テーブル {tableNumber} — QRコード</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`テーブル${tableNumber}のQRコード`}
              width={240}
              height={240}
            />
          ) : (
            <div className="flex size-60 items-center justify-center text-muted-foreground">
              読み込み中...
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleDownloadPdf}>
            <DownloadIcon data-icon="inline-start" />
            PDFダウンロード
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
