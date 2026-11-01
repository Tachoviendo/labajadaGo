-- Datos de prueba - Kiosco La Bajada

INSERT INTO usuario (nombre, email, password, telefono, rol) VALUES
('Marcos Dueno', 'marcos@labajada.com', 'scrypt$16384$8$1$F3dpXK-tBJTw_Sz8aLPGQw$SZfEA68IJQUbM7VcOlOUhwvJZ7YibR1ZKWzlhMeYeTMN0HcEDBQjklE26PzZCzLigD7j1e1oMoCUgSkcOY7ElA', '099111111', 'dueno'),
('Lucia Cajera', 'lucia@labajada.com', 'scrypt$16384$8$1$QLmd9Nl31dLLZ2i4I5Mzng$cRIVSocNKUD1d5wxqmTd6iVe1b6z3gDeDLW3yZovYRPa9g-rFjq8T8bj2TDsVXNnwaR51aHf1pzR1wzIWomRdA', '099222222', 'cajero'),
('Juan Cliente', 'juan@gmail.com', 'scrypt$16384$8$1$bZKkerV9UMGTyMYbrnMSSQ$6MzGFaKj8IfEYilnCZcwqBaPEERRJSPilpwFNzUH1gbUHR0SAKjW9oeoc9rx83RnjRXXZgfZg0fPnelahlJw8A', '099333333', 'cliente'),
('Ana Cliente', 'ana@gmail.com', 'scrypt$16384$8$1$ctGysG0GhW8n-7imyGi1Qw$bx1GWuzag5C4x5R01XngxYwV96CDoZkHBWJ9bTmjMQaNQjWtMzydi1HslgioVpTXz6GqWM4xOfycgXrXpGVmjw', '099444444', 'cliente');

INSERT INTO direccion (calle, numero, ciudad, referencia) VALUES
('18 de Julio', '1234', 'Bella Union', 'Casa con porton azul'),
('Artigas', '567', 'Bella Union', 'Al lado de la plaza'),
('Rivera', '89', 'Bella Union', NULL);

INSERT INTO categoria (nombre, descripcion) VALUES
('Bebidas', 'Gaseosas, jugos y aguas'),
('Snacks', 'Papas fritas, palitos, etc'),
('Golosinas', 'Chocolates y caramelos');

INSERT INTO producto (nombre, descripcion, precio, categoria, imagen_url, stock) VALUES
('Coca Cola 500ml', 'Gaseosa cola', 85, 'Bebidas', NULL, 40),
('Agua saborizada', 'Agua con gas sabor pomelo', 60, 'bebidas', NULL, 25),
('Papas Lays', 'Papas fritas clasicas', 90, 'Snacks', NULL, 30),
('Alfajor Cofler', 'Alfajor de chocolate', 55, 'Golosinas', NULL, 50),
('Chocolate Aguila', 'Chocolate con leche', 70, 'golosinas', NULL, 20);

-- carrito de Juan con 2 productos
INSERT INTO carrito (usuario_id) VALUES (3);
INSERT INTO carrito_item (carrito_id, producto_id, cantidad) VALUES
(1, 1, 2),
(1, 3, 1),
(1, 1, 1);

-- pedido confirmado de Ana
INSERT INTO pedido (usuario_id, direccion_id, estado, metodo_pago, total) VALUES
(4, 2, 'preparando', 'mercadopago', 210);

INSERT INTO pedido_item (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario) VALUES
(1, 4, 'Alfajor Cofler', 2, 55),
(1, 2, 'Agua saborizada', 1, 60),
(1, 3, 'Papas Lays', 1, 90);

INSERT INTO pedido_estado_historial (pedido_id, estado, usuario_id) VALUES
(1, 'realizado', 4),
(1, 'preparando', 2);

INSERT INTO pago (pedido_id, metodo, estado, referencia_externa) VALUES
(1, 'mercadopago', 'pagado', 'MP-000123456');
