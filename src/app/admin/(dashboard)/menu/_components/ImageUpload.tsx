'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { validateImageFile } from '@/lib/validations/image';
import { ImageIcon, XIcon } from 'lucide-react';

type ImageUploadProps = {
  currentImageUrl?: string | null;
  onFileChange: (file: File | null) => void;
};

function isBlobUrl(url: string | null): boolean {
  return !!url && url.startsWith('blob:');
}

export function ImageUpload({ currentImageUrl, onFileChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  // アンマウント時にblob URLを解放
  useEffect(() => {
    return () => {
      if (isBlobUrl(preview)) URL.revokeObjectURL(preview!);
    };
  }, [preview]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      onFileChange(null);
      return;
    }

    const result = validateImageFile({ size: file.size, type: file.type });
    if (!result.valid) {
      setError(result.error);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // 前のblob URLを解放してから新しいものを作成
    if (isBlobUrl(preview)) URL.revokeObjectURL(preview!);
    setPreview(URL.createObjectURL(file));
    onFileChange(file);
  }

  function handleRemove() {
    if (isBlobUrl(preview)) URL.revokeObjectURL(preview!);
    setPreview(currentImageUrl ?? null);
    setError(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      {preview && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="プレビュー"
            className="h-32 w-32 rounded-lg object-cover"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute -top-1 -right-1 bg-background shadow"
            onClick={handleRemove}
          >
            <XIcon className="size-3" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="size-4" />
          画像を選択
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
