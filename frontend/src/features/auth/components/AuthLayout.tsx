import type { ReactNode } from 'react';

interface AuthHeadingProps {
  title: string;
  children?: ReactNode;
}

export const AuthHeading = ({ title, children }: AuthHeadingProps) => (
  <div>
    <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
    {children && <div className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{children}</div>}
  </div>
);

interface AuthLayoutProps {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
}

export const AuthLayout = ({ title, description, children }: AuthLayoutProps) => (
  <div className="grid min-h-dvh bg-card lg:grid-cols-2">
    <aside className="hidden flex-col justify-between border-r border-border bg-background p-12 lg:flex">
      <img src="/logo.jpg" alt="Spain Aikikai" className="size-56 mix-blend-multiply" />
      <div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">Spain Aikikai</p>
        <p className="mt-2 text-base text-muted-foreground">Gestión de clubs, licencias y pagos.</p>
      </div>
    </aside>

    <main className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-20">
      <div className="mx-auto flex w-full max-w-md flex-col gap-7">
        <div className="flex items-center gap-3 lg:hidden">
          <img src="/logo.jpg" alt="" className="size-14 mix-blend-multiply" />
          <div>
            <p className="font-semibold text-foreground">Spain Aikikai</p>
            <p className="text-sm text-muted-foreground">Gestión de clubs</p>
          </div>
        </div>
        {title && <AuthHeading title={title}>{description}</AuthHeading>}
        {children}
      </div>
    </main>
  </div>
);
