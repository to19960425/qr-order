import { getOrderPageData } from '@/lib/use-cases/customer-menu';
import { ClosedView } from './_components/ClosedView';
import { InvalidTokenView } from './_components/InvalidTokenView';
import { MenuView } from './_components/MenuView';

export const dynamic = 'force-dynamic';

export default async function OrderPage({
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
    <MenuView
      token={token}
      tableNumber={result.table.table_number}
      categories={result.categories}
      menuItemsByCategory={result.menuItemsByCategory}
    />
  );
}
