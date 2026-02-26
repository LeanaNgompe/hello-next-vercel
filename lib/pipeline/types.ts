export type PipelineStatus = 'idle' | 'uploading' | 'registering' | 'generating' | 'success' | 'error';

export interface PresignedUrlResponse {
  presignedUrl: string;
  cdnUrl: string;
}

export interface RegisterImageResponse {
  imageId: string;
  now: number;
}

export interface CaptionRecord {
  id: string;
  content: string;
  confidence?: number;
}

export interface PipelineError {
  message: string;
  step: PipelineStatus;
}

export interface PipelineState {
  status: PipelineStatus;
  progress: number;
  imageId: string | null;
  captions: CaptionRecord[];
  error: string | null;
}
