import { getStoreId } from '@/lib/store';
import { getCategories, getMenuItemsByCategory } from '@/lib/use-cases/menu';
import { MenuManagement } from './_components/MenuManagement';

export default async function MenuPage() {
  const storeId = await getStoreId();
  const [categories, menuItemsByCategory] = await Promise.all([
    getCategories(storeId),
    getMenuItemsByCategory(storeId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">メニュー管理</h1>
      <MenuManagement
        categories={categories}
        menuItemsByCategory={menuItemsByCategory}
      />
    </div>
  );
}
