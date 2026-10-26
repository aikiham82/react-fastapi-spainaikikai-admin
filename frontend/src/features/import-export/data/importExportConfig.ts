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
  { key: 'id', label: 'ID' },
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name_1', label: '1er Apellido' },
  { key: 'last_name_2', label: '2do Apellido' },
  { key: 'dni', label: 'DNI' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'birth_date', label: 'Fecha Nacimiento' },
  { key: 'address', label: 'Dirección' },
  { key: 'city', label: 'Ciudad' },
  { key: 'province', label: 'Provincia' },
  { key: 'postal_code', label: 'Código Postal' },
  { key: 'country', label: 'País' },
  { key: 'club_id', label: 'Club' },
  { key: 'status', label: 'Estado' },
  { key: 'created_at', label: 'Fecha Creación' },
];

const LICENSE_COLUMNS: ColumnOption[] = [
  { key: 'license_number', label: 'Nº Licencia' },
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name_1', label: '1er Apellido' },
  { key: 'last_name_2', label: '2do Apellido' },
  { key: 'dni', label: 'DNI' },
  { key: 'club', label: 'Club' },
  { key: 'technical_grade', label: 'Grado Técnico' },
  { key: 'instructor_category', label: 'Cat. Instructor' },
  { key: 'age_category', label: 'Cat. Edad' },
  { key: 'status', label: 'Estado' },
  { key: 'issue_date', label: 'Fecha Emisión' },
  { key: 'expiration_date', label: 'Fecha Expiración' },
  { key: 'is_renewed', label: 'Renovada' },
];

const INSURANCE_COLUMNS: ColumnOption[] = [
  { key: 'policy_number', label: 'Nº Póliza' },
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name_1', label: '1er Apellido' },
  { key: 'last_name_2', label: '2do Apellido' },
  { key: 'dni', label: 'DNI' },
  { key: 'birth_date', label: 'Fecha Nacimiento' },
  { key: 'club', label: 'Club' },
  { key: 'insurance_type', label: 'Tipo Seguro' },
  { key: 'insurance_company', label: 'Compañía' },
  { key: 'coverage_amount', label: 'Cobertura' },
  { key: 'status', label: 'Estado' },
  { key: 'start_date', label: 'Fecha Inicio' },
  { key: 'end_date', label: 'Fecha Fin' },
];

const PAYMENT_COLUMNS: ColumnOption[] = [
  { key: 'club', label: 'Club' },
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name_1', label: '1er Apellido' },
  { key: 'last_name_2', label: '2do Apellido' },
  { key: 'dni', label: 'DNI' },
  { key: 'payment_type', label: 'Tipo Pago' },
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
    importHint: 'Columnas: DNI, Tipo Pago, Año, Monto, Estado, Concepto.',
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
