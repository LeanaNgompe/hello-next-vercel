import { NextRequest, NextResponse } from 'next/server';

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

    const data = await response.json();
    if (!response.ok) return NextResponse.json(data, { status: response.status });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
