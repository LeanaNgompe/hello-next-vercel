import { 
  PresignedUrlResponse, 
  RegisterImageResponse, 
  CaptionRecord 
} from './types';
import { supabase } from '@/lib/supabase/client';

export class PipelineService {
  private static async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
    };
  }

  /** Step 1: Request presigned URL from our secure proxy */
  static async getPresignedUrl(fileType: string): Promise<PresignedUrlResponse> {
    const res = await fetch('/api/pipeline?step=generate-url', {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ contentType: fileType }),
    });
    if (!res.ok) throw new Error('Failed to generate upload URL');
    return res.json();
  }

  /** Step 2: Direct client-side upload to S3 */
  static async uploadToS3(url: string, file: File): Promise<void> {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) throw new Error('Image upload failed');
  }

  /** Step 3: Register the uploaded image URL via proxy */
  static async registerImage(cdnUrl: string): Promise<RegisterImageResponse> {
    const res = await fetch('/api/pipeline?step=register', {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
    });
    if (!res.ok) throw new Error('Failed to register image');
    return res.json();
  }

  /** Step 4: Generate captions via proxy */
  static async generateCaptions(imageId: string): Promise<CaptionRecord[]> {
    const res = await fetch('/api/pipeline?step=generate-captions', {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ imageId }),
    });
    if (!res.ok) throw new Error('Caption generation failed');
    return res.json();
  }
}
