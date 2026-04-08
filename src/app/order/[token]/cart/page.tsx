import { getOrderPageData } from '@/lib/use-cases/customer-menu';
import { ClosedView } from '../_components/ClosedView';
import { InvalidTokenView } from '../_components/InvalidTokenView';
import { CartView } from './_components/CartView';

export const dynamic = 'force-dynamic';

export default async function CartPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getOrderPageData(token);

  if (result.kind === 'not_found') {
    return <InvalidTokenView />;
  }

  if (result.kind === 'closed') {
    return <ClosedView />;
  }

  return (
    <CartView
      token={token}
      storeId={result.table.store_id}
      tableId={result.table.id}
      tableNumber={result.table.table_number}
    />
  );
}
