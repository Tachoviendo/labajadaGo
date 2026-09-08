-- Script de creacion de base de datos - Kiosco La Bajada
-- Postgres

CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(20) NOT NULL,
    telefono VARCHAR(30),
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT now()
);

CREATE TABLE direccion (
    id SERIAL PRIMARY KEY,
    calle VARCHAR(150) NOT NULL,
    numero VARCHAR(20),
    ciudad VARCHAR(100) NOT NULL,
    referencia VARCHAR(200)
);

CREATE TABLE categoria (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

CREATE TABLE producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500),
    precio INTEGER NOT NULL,
    categoria VARCHAR(100),
    imagen_url VARCHAR(300),
    stock INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE carrito (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id),
    fecha_actualizacion TIMESTAMP DEFAULT now()
);

CREATE TABLE carrito_item (
    id SERIAL PRIMARY KEY,
    carrito_id INTEGER NOT NULL REFERENCES carrito(id),
    producto_id INTEGER NOT NULL REFERENCES producto(id),
    cantidad INTEGER NOT NULL
);

CREATE TABLE pedido (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    direccion_id INTEGER NOT NULL REFERENCES direccion(id),
    fecha_creacion TIMESTAMP DEFAULT now(),
    estado VARCHAR(20) NOT NULL DEFAULT 'realizado',
    metodo_pago VARCHAR(20) NOT NULL,
    total INTEGER NOT NULL
);

CREATE TABLE pedido_item (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedido(id),
    producto_id INTEGER NOT NULL REFERENCES producto(id),
    cantidad INTEGER NOT NULL,
    precio_unitario INTEGER NOT NULL
);

CREATE TABLE pedido_estado_historial (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedido(id),
    estado VARCHAR(20) NOT NULL,
    fecha TIMESTAMP DEFAULT now(),
    usuario_id INTEGER REFERENCES usuario(id)
);

CREATE TABLE pago (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedido(id),
    metodo VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    referencia_externa VARCHAR(150),
    fecha_pago TIMESTAMP,
    registrado_por INTEGER REFERENCES usuario(id)
);
