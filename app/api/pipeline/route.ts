import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Increase timeout for long-running AI tasks

const BASE_URL = 'https://api.almostcrackd.ai/pipeline';
const AUTH_TOKEN = process.env.ALMOSTCRACKD_TOKEN;

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const step = searchParams.get('step');
  const authHeader = req.headers.get('Authorization');
  
  try {
    const body = await req.json();
    let endpoint = '';

    switch (step) {
      case 'generate-url':
        endpoint = `${BASE_URL}/generate-presigned-url`;
        break;
      case 'register':
        endpoint = `${BASE_URL}/upload-image-from-url`;
        break;
      case 'generate-captions':
        endpoint = `${BASE_URL}/generate-captions`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Handle non-JSON responses (like upstream 502/504 HTML pages)
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: text.slice(0, 100) || 'Upstream service error (No JSON response)' };
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || data.message || `API error: ${response.status}` },
        { status: response.status === 502 ? 502 : response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Pipeline API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
