import React, { useRef, useState, useCallback } from 'react';
import postService from '../../services/post.service';
import Icon from '../../components/common/Icon';

interface Props { value: string; onChange: (url: string) => void; disabled?: boolean; }

const ImageUploadInput: React.FC<Props> = ({ value, onChange, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(''); setUploading(true);
    try { const url = await postService.uploadImage(file); onChange(url); }
    catch (err: any) { setError(err?.response?.data?.error || 'Upload failed. Try again.'); }
    finally { setUploading(false); }
  }, [onChange]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = '';
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0]; if (file) handleFile(file);
  };

  return (
    <div className='img-upload'>
      {value && (
        <div className='img-upload-preview'>
          <img src={value} alt='Featured' className='img-upload-thumb' />
          <div className='img-upload-actions'>
            <button type='button' className='img-upload-btn-replace' disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>Replace</button>
            <button type='button' className='img-upload-btn-remove' disabled={disabled || uploading} onClick={() => { onChange(''); setError(''); }}>Remove</button>
          </div>
        </div>
      )}
      {!value && (
        <div
          className={'img-upload-zone' + (dragOver ? ' dragover' : '') + (uploading ? ' busy' : '')}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          role='button' tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        >
          {uploading ? (
            <><Icon name="progress_activity" size={24} color="#3B6E96" className="img-upload-icon spin" /><span className='img-upload-label'>Uploading…</span></>
          ) : (
            <><Icon name="add_photo_alternate" size={24} color="#3B6E96" className="img-upload-icon" /><span className='img-upload-label'>Click or drag image here</span><span className='img-upload-hint'>JPEG, PNG, GIF, WebP · max 10 MB</span></>
          )}
        </div>
      )}
      {error && <p className='img-upload-error'>{error}</p>}
      <input ref={inputRef} type='file' accept='image/jpeg,image/png,image/gif,image/webp' style={{display:'none'}} onChange={onInput} disabled={disabled || uploading} />
    </div>
  );
};

export default ImageUploadInput;
