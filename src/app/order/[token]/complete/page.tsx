import Link from 'next/link';
import { getOrderPageData } from '@/lib/use-cases/customer-menu';
import { InvalidTokenView } from '../_components/InvalidTokenView';

export const dynamic = 'force-dynamic';

export default async function CompletePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getOrderPageData(token);

  if (result.kind === 'not_found') {
    return <InvalidTokenView />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-cafe-foreground">
        ご注文ありがとうございました
      </h1>
      <p className="mt-4 text-base text-cafe-foreground">
        商品をお席までお持ちします。
        <br />
        少々お待ちください。
      </p>
      <Link
        href={`/order/${token}`}
        className="mt-8 inline-block rounded-full bg-cafe-accent px-6 py-3 text-sm font-semibold text-white shadow active:opacity-80"
      >
        メニューに戻る
      </Link>
    </div>
  );
}
