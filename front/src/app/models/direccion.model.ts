//mismo contrato que la api, ver docs/api/direcciones.md

//api/schemas/address.schema.js -> AddressSchema
export type Direccion = {
  id: number;
  usuarioId: number;
  calle: string;
  numero: string | null;
  ciudad: string;
  referencia: string | null;
  esPredeterminada: boolean;
};

//api/schemas/address.schema.js -> AddressCreateBody (esPredeterminada todavia no se puede activar)
export type CrearDireccionBody = {
  calle: string;
  numero?: string;
  ciudad: string;
  referencia?: string;
};

//api/schemas/address.schema.js -> AddressUpdateBody
export type ActualizarDireccionBody = Partial<CrearDireccionBody>;
