import { NextResponse, type NextRequest } from 'next/server';
import { paid } from '@/lib/paid';
import { getNetwork } from '@/lib/config';
import { buildTipIntent, getTipJarAddress } from '@/lib/tipjar';

export const runtime = 'nodejs';

/** Paid: build approve + tip calldata / cast commands for UsdcTipJar. */
export const GET = paid('/api/tip-intent', async (req: NextRequest): Promise<NextResponse> => {
  const tipJar = getTipJarAddress();
  if (!tipJar) {
    return NextResponse.json(
      { error: 'Tip jar not deployed yet. Set NEXT_PUBLIC_TIP_JAR_ADDRESS after contracts/deploy.sh.' },
      { status: 503 },
    );
  }

  const amountRaw = req.nextUrl.searchParams.get('amount') ?? '0.5';
  const note = req.nextUrl.searchParams.get('note') ?? 'tip via arc-usdc-tipjar';
  const amount = Number(amountRaw);
  if (!(amount > 0) || !Number.isFinite(amount) || amount > 1_000_000) {
    return NextResponse.json({ error: 'amount must be a positive USDC number (e.g. 0.5)' }, { status: 400 });
  }

  const network = getNetwork();
  const intent = buildTipIntent({ tipJar, network, amountUsdc: amount, note });
  return NextResponse.json(intent);
});
