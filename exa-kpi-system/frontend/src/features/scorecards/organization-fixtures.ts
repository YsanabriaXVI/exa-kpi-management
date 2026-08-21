/** Temporary Organization boundary. Replace with the future Organization contract. */
export type OrganizationEmployeeOption = { id: string; name: string; company: string };
export type OrganizationDepartmentOption = { id: string; companyExternalId: string; name: string; employees: OrganizationEmployeeOption[] };
const departmentNames = ["Administración", "Finanzas", "Maintain & Repair", "Process", "SAC (Servicio al Cliente)", "Pricing", "Invoicement", "Operations", "Recursos Humanos"];
const people = ["Andrea Morales", "Carlos Ramírez", "Fernanda López", "Jorge Castillo", "Mariana Torres", "Luis Hernández", "Paola Mendoza", "Ricardo Salazar", "Daniela Cruz", "Miguel Navarro", "Sofía Reyes", "Alejandro Vargas", "Valeria Ortega", "Eduardo Flores", "Camila Ríos", "Roberto Silva", "Natalia Pineda", "Héctor Guzmán"];
export function temporaryOrganizationScope(companies: Array<{ id: string; name: string }>): OrganizationDepartmentOption[] {
  if (!companies.length) return [];
  return departmentNames.map((name, index) => { const company = companies[index % companies.length]; return { id: String(2001 + index), companyExternalId: company.id, name, employees: [0, 1].map((offset) => ({ id: String(1001 + index * 2 + offset), name: people[index * 2 + offset], company: company.name })) }; });
}
