import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/nps/links/qrcode?url=...&filename=...
 * Gera QR code da URL e retorna a imagem para download (evita CORS no front).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const npsUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'qrcode.png';

    if (!npsUrl) {
      return NextResponse.json({ error: 'Parâmetro url é obrigatório' }, { status: 400 });
    }

    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(npsUrl)}`;
    const res = await fetch(qrApiUrl);

    if (!res.ok) {
      return NextResponse.json({ error: 'Falha ao gerar QR code' }, { status: 502 });
    }

    const blob = await res.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = safeName.endsWith('.png') ? safeName : `${safeName}.png`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${finalName}"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar QR code:', error);
    return NextResponse.json({ error: 'Erro ao gerar QR code' }, { status: 500 });
  }
}
