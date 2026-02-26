import { useState, useCallback } from 'react';
import { PipelineService } from '@/lib/pipeline/service';
import { PipelineStatus, CaptionRecord, PipelineState } from '@/lib/pipeline/types';

export function useCaptionPipeline() {
  const [state, setState] = useState<PipelineState>({
    status: 'idle',
    progress: 0,
    imageId: null,
    captions: [],
    error: null,
  });

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, imageId: null, captions: [], error: null });
  }, []);

  const startPipeline = async (file: File) => {
    if (state.status !== 'idle' && state.status !== 'error') return;

    try {
      // Step 1: Get Presigned URL
      setState(s => ({ ...s, status: 'uploading', progress: 10, error: null }));
      const { presignedUrl, cdnUrl } = await PipelineService.getPresignedUrl(file.type);
      
      // Step 2: Direct Upload
      setState(s => ({ ...s, progress: 30 }));
      await PipelineService.uploadToS3(presignedUrl, file);

      // Step 3: Register Image
      setState(s => ({ ...s, status: 'registering', progress: 60 }));
      const { imageId } = await PipelineService.registerImage(cdnUrl);
      setState(s => ({ ...s, imageId }));

      // Step 4: Generate Captions
      setState(s => ({ ...s, status: 'generating', progress: 85 }));
      const captions = await PipelineService.generateCaptions(imageId);

      setState(s => ({ ...s, status: 'success', progress: 100, captions }));
    } catch (err: any) {
      setState(s => ({ 
        ...s, 
        status: 'error', 
        error: err.message || 'An unexpected error occurred' 
      }));
    }
  };

  return { ...state, startPipeline, reset };
}
