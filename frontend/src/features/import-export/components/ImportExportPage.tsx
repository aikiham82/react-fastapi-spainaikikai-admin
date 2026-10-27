import { usePermissions } from '@/core/hooks/usePermissions';
import { availableKinds } from '../data/importExportConfig';
import { ExportSection } from './ExportSection';
import { ImportSection } from './ImportSection';

export const ImportExportPage = () => {
  const { isAssociationAdmin } = usePermissions();
  const kinds = availableKinds(isAssociationAdmin());

  return (
    <div className="mx-auto max-w-3xl divide-y divide-border">
      <div className="pb-10">
        <ExportSection kinds={kinds} />
      </div>
      <div className="pt-10">
        <ImportSection kinds={kinds} />
      </div>
    </div>
  );
};
