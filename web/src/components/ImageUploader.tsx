'use client';

// Phase AD Step 2 (2026-04-23): 공용 이미지 업로더
//   기존 AnswerSheetCard 내부 구현을 추출해 ReviewStage / /meeting / AnswerSheetCard
//   3곳에서 재사용 가능하도록 공용화.
//
//   책임:
//     - 파일 선택 (드래그 미지원 — 기존 AnswerSheetCard 동일)
//     - 형식 / 크기 / 개수 검증
//     - 업로드 콜백 호출 (호출자가 pre-session 또는 sandbox-session API 결정)
//     - 썸네일 미리보기 + 개별 삭제
//     - 에러 표시
//
//   호출자 책임:
//     - onUpload(file) 구현 (어느 엔드포인트 / 어느 sessionFolder 전달할지)
//     - onChange(paths) 받아서 wrappedPrompt / submitAnswer 등에 사용

import { useRef, useState, useEffect } from 'react';

export type UploadedAttachment = {
  path: string;
  filename: string;
  originalName: string;
  size: number;
};

type InternalUploaded = UploadedAttachment & { previewUrl: string };

interface Props {
  onUpload: (file: File) => Promise<UploadedAttachment>;
  onChange?: (paths: string[]) => void;
  // Phase AD Step 10-2 (2026-04-23): 단일 업로드 성공 시점에 호출 (자동 분석 트리거용)
  // onChange 는 전체 path 배열 통지 / onUploadComplete 는 새로 추가된 1건만 통지
  onUploadComplete?: (uploaded: UploadedAttachment) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  title?: string;
  helperText?: string;
  className?: string;
}

const DEFAULT_MAX_FILES = 3;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export default function ImageUploader({
  onUpload,
  onChange,
  onUploadComplete,
  disabled,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  title = '📎 참고 자료 (선택)',
  helperText = '레퍼런스 디자인·화면 스크린샷이 있으면 올려주세요. 포비가 꼭 참고해요.',
  className,
}: Props) {
  const [uploads, setUploads] = useState<InternalUploaded[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 부모 통지
  useEffect(() => {
    onChange?.(uploads.map((u) => u.path));
  }, [uploads, onChange]);

  // 언마운트 시 blob URL 정리
  useEffect(() => {
    return () => {
      uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxSizeMb = Math.round(maxSizeBytes / 1024 / 1024);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;
    setUploadError(null);

    for (const file of files) {
      if (uploads.length >= maxFiles) {
        setUploadError(`최대 ${maxFiles}장까지만 올릴 수 있어요`);
        break;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError(`${file.name}: 이미지(PNG/JPG/WEBP)만 가능해요`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        setUploadError(`${file.name}: ${maxSizeMb}MB 초과`);
        continue;
      }
      setUploading(true);
      try {
        const result = await onUpload(file);
        const previewUrl = URL.createObjectURL(file);
        setUploads((prev) => [...prev, { ...result, previewUrl }]);
        onUploadComplete?.(result);
      } catch (err: any) {
        setUploadError(err?.message ?? '업로드 실패');
      } finally {
        setUploading(false);
      }
    }
  };

  const removeUpload = (idx: number) => {
    setUploads((prev) => {
      const victim = prev[idx];
      if (victim) URL.revokeObjectURL(victim.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  return (
    <div
      className={[
        'rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50',
        className ?? '',
      ].join(' ')}
      data-testid="image-uploader"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        <span className="text-xs text-slate-400">
          {uploads.length}/{maxFiles}장 · 최대 {maxSizeMb}MB · PNG/JPG/WEBP
        </span>
      </div>
      {helperText && (
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}

      {uploads.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploads.map((u, i) => (
            <div
              key={u.path}
              className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u.previewUrl}
                alt={u.originalName}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeUpload(i)}
                disabled={disabled}
                className="absolute right-0 top-0 rounded-bl-md bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || uploads.length >= maxFiles}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {uploading
            ? '⏳ 업로드 중...'
            : uploads.length >= maxFiles
              ? `최대 ${maxFiles}장 도달`
              : '+ 이미지 추가'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleFilePick}
          className="hidden"
        />
        {uploadError && (
          <span className="text-xs text-rose-600 dark:text-rose-400">⚠️ {uploadError}</span>
        )}
      </div>
    </div>
  );
}
