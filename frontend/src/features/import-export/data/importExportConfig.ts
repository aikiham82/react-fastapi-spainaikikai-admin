export interface ColumnOption {
  key: string;
  label: string;
}

export type ImportExportKind = 'members' | 'licenses' | 'insurances' | 'payments';

export interface KindConfig {
  label: string;
  entityLabel: string;
  columns: ColumnOption[];
  importHint?: string;
  superAdminOnly: boolean;
}

const MEMBER_COLUMNS: ColumnOption[] = [
  { key: 'id', label: 'Código' },
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name_1', label: '1.er apellido' },
  { key: 'last_name_2', label: '2.º apellido' },
  { key: 'dni', label: 'DNI' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'birth_date', label: 'Fecha de nacimiento' },
  { key: 'address', label: 'Dirección' },
  { key: 'city', label: 'Ciudad' },
  { key: 'province', label: 'Provincia' },
  { key: 'postal_code', label: 'Código postal' },
  { key: 'country', label: 'País' },
  { key: 'club_id', label: 'Club' },
  { key: 'status', label: 'Estado' },
  { key: 'created_at', label: 'Fecha de creación' },
];

const LICENSE_COLUMNS: ColumnOption[] = [
  { key: 'license_number', label: 'Nº de licencia' },
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name_1', label: '1.er apellido' },
  { key: 'last_name_2', label: '2.º apellido' },
  { key: 'dni', label: 'DNI' },
  { key: 'club', label: 'Club' },
  { key: 'technical_grade', label: 'Grado técnico' },
  { key: 'instructor_category', label: 'Categoría de instructor' },
  { key: 'age_category', label: 'Categoría de edad' },
  { key: 'status', label: 'Estado' },
  { key: 'issue_date', label: 'Fecha de emisión' },
  { key: 'expiration_date', label: 'Fecha de caducidad' },
  { key: 'is_renewed', label: 'Renovada' },
];

const INSURANCE_COLUMNS: ColumnOption[] = [
  { key: 'policy_number', label: 'Nº de póliza' },
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name_1', label: '1.er apellido' },
  { key: 'last_name_2', label: '2.º apellido' },
  { key: 'dni', label: 'DNI' },
  { key: 'birth_date', label: 'Fecha de nacimiento' },
  { key: 'club', label: 'Club' },
  { key: 'insurance_type', label: 'Tipo de seguro' },
  { key: 'insurance_company', label: 'Compañía' },
  { key: 'coverage_amount', label: 'Cobertura' },
  { key: 'status', label: 'Estado' },
  { key: 'start_date', label: 'Fecha de inicio' },
  { key: 'end_date', label: 'Fecha de fin' },
];

const PAYMENT_COLUMNS: ColumnOption[] = [
  { key: 'club', label: 'Club' },
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name_1', label: '1.er apellido' },
  { key: 'last_name_2', label: '2.º apellido' },
  { key: 'dni', label: 'DNI' },
  { key: 'payment_type', label: 'Tipo de pago' },
  { key: 'concept', label: 'Concepto' },
  { key: 'amount', label: 'Monto' },
  { key: 'status', label: 'Estado' },
  { key: 'payment_year', label: 'Año' },
];

export const KIND_CONFIG: Record<ImportExportKind, KindConfig> = {
  members: {
    label: 'Miembros',
    entityLabel: 'miembros',
    columns: MEMBER_COLUMNS,
    superAdminOnly: false,
  },
  licenses: {
    label: 'Licencias',
    entityLabel: 'licencias',
    columns: LICENSE_COLUMNS,
    importHint: 'Cada fila necesita el DNI del miembro.',
    superAdminOnly: true,
  },
  insurances: {
    label: 'Seguros',
    entityLabel: 'seguros',
    columns: INSURANCE_COLUMNS,
    importHint: 'Cada fila necesita el DNI del miembro.',
    superAdminOnly: true,
  },
  payments: {
    label: 'Pagos',
    entityLabel: 'pagos',
    columns: PAYMENT_COLUMNS,
    importHint: 'Columnas: DNI, Tipo de pago, Año, Monto, Estado, Concepto.',
    superAdminOnly: true,
  },
};

const KIND_ORDER: ImportExportKind[] = ['members', 'licenses', 'insurances', 'payments'];

export const availableKinds = (isSuperAdmin: boolean): ImportExportKind[] =>
  KIND_ORDER.filter((kind) => isSuperAdmin || !KIND_CONFIG[kind].superAdminOnly);

export interface ExportFilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export const EXPORT_FILTERS: Partial<Record<ImportExportKind, ExportFilterConfig[]>> = {
  licenses: [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'active', label: 'Activa' },
        { value: 'expired', label: 'Expirada' },
        { value: 'pending', label: 'Pendiente' },
      ],
    },
    {
      key: 'technical_grade',
      label: 'Grado técnico',
      options: [
        { value: 'dan', label: 'Dan' },
        { value: 'kyu', label: 'Kyu' },
      ],
    },
    {
      key: 'age_category',
      label: 'Categoría de edad',
      options: [
        { value: 'adulto', label: 'Adulto' },
        { value: 'infantil', label: 'Infantil' },
      ],
    },
  ],
  insurances: [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'expired', label: 'Expirado' },
      ],
    },
    {
      key: 'insurance_type',
      label: 'Tipo de seguro',
      options: [
        { value: 'accident', label: 'Accidente' },
        { value: 'civil_liability', label: 'Responsabilidad civil' },
      ],
    },
  ],
};
