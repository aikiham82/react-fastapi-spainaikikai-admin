import { usePermissions } from '@/core/hooks/usePermissions';
import { availableKinds } from '../data/importExportConfig';
import { ExportSection } from './ExportSection';
import { ImportSection } from './ImportSection';

export const ImportExportPage = () => {
  const { isAssociationAdmin } = usePermissions();
  const kinds = availableKinds(isAssociationAdmin());

  return (
    <div className="grid max-w-5xl items-start gap-4 lg:grid-cols-2">
      <ExportSection kinds={kinds} />
      <ImportSection kinds={kinds} />
    </div>
  );
};
