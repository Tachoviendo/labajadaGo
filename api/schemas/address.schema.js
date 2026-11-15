import { Type } from "@fastify/type-provider-typebox";

// un cliente puede tener varias direcciones

// db/01_schema.sql todavia no persiste es_predeterminada; queda pendiente.
export const AddressSchema = Type.Object({
  id: Type.Integer(),
  usuarioId: Type.Integer(),
  calle: Type.String(),
  numero: Type.Union([Type.String(), Type.Null()]),
  ciudad: Type.String(),
  referencia: Type.Union([Type.String(), Type.Null()]),
  //punto marcado en el mapa. null solo en direcciones viejas o anonimizadas
  lat: Type.Union([Type.Number(), Type.Null()]),
  lng: Type.Union([Type.Number(), Type.Null()]),
  esPredeterminada: Type.Boolean(),
});

const Latitud = Type.Number({ minimum: -90, maximum: 90, description: "Latitud (WGS84)" });
const Longitud = Type.Number({ minimum: -180, maximum: 180, description: "Longitud (WGS84)" });

//las coordenadas son obligatorias: son el destino del repartidor en el mapa
export const AddressCreateBody = Type.Object({
  calle: Type.String({ minLength: 2, maxLength: 150 }),
  numero: Type.Optional(Type.String({ maxLength: 20 })),
  ciudad: Type.String({ minLength: 2, maxLength: 100 }),
  referencia: Type.Optional(Type.String({ maxLength: 200 })),
  lat: Latitud,
  lng: Longitud,
  esPredeterminada: Type.Optional(Type.Boolean({ default: false })),
});

export const AddressUpdateBody = Type.Partial(AddressCreateBody, {
  minProperties: 1,
});
