-- Script de creacion de base de datos - Kiosco La Bajada
-- Postgres

CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente'
        CHECK (rol IN ('cliente', 'cajero', 'dueno')),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT now()
);

CREATE TABLE direccion (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id),
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
    categoria_id INTEGER NOT NULL REFERENCES categoria(id),
    imagen_url VARCHAR(300),
    -- el stock lo descuentan y reponen los triggers de 02_triggers.sql
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- un carrito por usuario
CREATE TABLE carrito (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now()
);

-- productos del carrito
-- un producto aparece una sola vez por carrito
CREATE TABLE carrito_item (
    id SERIAL PRIMARY KEY,
    carrito_id INTEGER NOT NULL REFERENCES carrito(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES producto(id),
    cantidad INTEGER NOT NULL CHECK (cantidad >= 1),
    CONSTRAINT carrito_item_carrito_producto_unique
        UNIQUE (carrito_id, producto_id)
);


-- la direccion se copia en el pedido para que no cambie si el usuario despues edita la suya
CREATE TABLE pedido (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    direccion_id INTEGER NOT NULL REFERENCES direccion(id),
    direccion_calle VARCHAR(150) NOT NULL,
    direccion_numero VARCHAR(20),
    direccion_ciudad VARCHAR(100) NOT NULL,
    direccion_referencia VARCHAR(200),
    fecha_creacion TIMESTAMP DEFAULT now(),
    estado VARCHAR(20) NOT NULL DEFAULT 'realizado'
        CHECK (estado IN ('realizado', 'preparando', 'en_reparto', 'entregado', 'cancelado')),
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('mercadopago', 'pos')),
    total INTEGER NOT NULL
);

CREATE TABLE pedido_item (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedido(id),
    producto_id INTEGER NOT NULL REFERENCES producto(id),
    nombre_producto VARCHAR(150) NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario INTEGER NOT NULL
);

CREATE TABLE pedido_estado_historial (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedido(id),
    estado VARCHAR(20) NOT NULL
        CHECK (estado IN ('realizado', 'preparando', 'en_reparto', 'entregado', 'cancelado')),
    fecha TIMESTAMP DEFAULT now(),
    usuario_id INTEGER REFERENCES usuario(id)
);

-- un pedido puede tener varios pagos (ej: uno rechazado y despues uno pagado)
CREATE TABLE pago (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedido(id),
    metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('mercadopago', 'pos')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'pagado', 'rechazado')),
    referencia_externa VARCHAR(150),
    fecha_pago TIMESTAMP,
    registrado_por INTEGER REFERENCES usuario(id)
);
