import { Link } from 'react-router-dom';
import { House } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/list-controls';

export const NotFoundPage = () => (
  <EmptyState
    title="Esta página no existe"
    description="Puede que el enlace esté mal escrito o ya no se use."
    action={
      <Button asChild>
        <Link to="/">
          <House className="size-4" aria-hidden="true" />
          Ir a Inicio
        </Link>
      </Button>
    }
  />
);

export default NotFoundPage;
