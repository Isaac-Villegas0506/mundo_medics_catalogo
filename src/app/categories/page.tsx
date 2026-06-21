import CategoriesClient from './CategoriesClient';
import { getCategoriesPageData } from '@/lib/catalog-data';

export const revalidate = 60;

export default async function CategoriesPage() {
  const data = await getCategoriesPageData();

  return (
    <CategoriesClient
      initialCategories={data.categories}
      whatsappNumber={data.settings.whatsapp_number}
    />
  );
}
