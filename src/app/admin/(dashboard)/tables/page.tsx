import { getStoreId } from '@/lib/store';
import { getTables } from '@/lib/use-cases/tables';
import { TableManagement } from './_components/TableManagement';

export default async function TablesPage() {
  const storeId = await getStoreId();
  const tables = await getTables(storeId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">席管理</h1>
      <TableManagement tables={tables} />
    </div>
  );
}
