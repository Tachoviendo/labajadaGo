-- Datos de prueba - Kiosco La Bajada
-- corre despues de 02_triggers.sql: los items de pedidos no cancelados descuentan stock

-- ids: 1 dueño, 2 cajera, 3 y 4 clientes, 5 repartidor (contraseñas en el README)
INSERT INTO usuario (nombre, email, password, telefono, rol) VALUES
('Marcos Dueno', 'marcos@labajada.com', 'scrypt$16384$8$1$F3dpXK-tBJTw_Sz8aLPGQw$SZfEA68IJQUbM7VcOlOUhwvJZ7YibR1ZKWzlhMeYeTMN0HcEDBQjklE26PzZCzLigD7j1e1oMoCUgSkcOY7ElA', '099111111', 'dueno'),
('Lucia Cajera', 'lucia@labajada.com', 'scrypt$16384$8$1$QLmd9Nl31dLLZ2i4I5Mzng$cRIVSocNKUD1d5wxqmTd6iVe1b6z3gDeDLW3yZovYRPa9g-rFjq8T8bj2TDsVXNnwaR51aHf1pzR1wzIWomRdA', '099222222', 'cajero'),
('Juan Cliente', 'juan@gmail.com', 'scrypt$16384$8$1$bZKkerV9UMGTyMYbrnMSSQ$6MzGFaKj8IfEYilnCZcwqBaPEERRJSPilpwFNzUH1gbUHR0SAKjW9oeoc9rx83RnjRXXZgfZg0fPnelahlJw8A', '099333333', 'cliente'),
('Ana Cliente', 'ana@gmail.com', 'scrypt$16384$8$1$ctGysG0GhW8n-7imyGi1Qw$bx1GWuzag5C4x5R01XngxYwV96CDoZkHBWJ9bTmjMQaNQjWtMzydi1HslgioVpTXz6GqWM4xOfycgXrXpGVmjw', '099444444', 'cliente'),
('Pedro Repartidor', 'pedro@labajada.com', 'scrypt$16384$8$1$pT6VIEhotjVgj-8PnJROig$4dq5QPmvLZ0w-cNauI0sJPDAMiYOaPaSz-iDLzOvRo0UTyl5CD72iCGzwChMuZQCszp3a2-DiSBvJ5fscFS3dw', '099555555', 'repartidor');

-- cada direccion pertenece a un cliente (Juan tiene dos).
-- el local esta en la plaza Artigas de Salto (LOCAL_LAT/LOCAL_LNG del .env);
-- las coordenadas de las direcciones son puntos aproximados a pocas cuadras
INSERT INTO direccion (usuario_id, calle, numero, ciudad, referencia, lat, lng) VALUES
(3, '18 de Julio', '1234', 'Salto', 'Casa con porton azul', -31.38530, -57.95520),
(4, 'Artigas', '567', 'Salto', 'Al lado de la plaza', -31.39370, -57.96380),
(3, 'Rivera', '89', 'Salto', NULL, -31.38010, -57.96550);

INSERT INTO categoria (nombre, descripcion) VALUES
('Bebidas', 'Gaseosas, jugos y aguas'),
('Snacks', 'Papas fritas, palitos, etc'),
('Golosinas', 'Chocolates y caramelos'),
('Galletitas', 'Galletitas dulces y saladas'),
('Lacteos', 'Leche, yogures y chocolatadas'),
('Almacen', 'Yerba, azucar y otros basicos');

-- producto.categoria_id sigue el orden de la tabla categoria: 1 Bebidas, 2 Snacks, 3 Golosinas, 4 Galletitas, 5 Lacteos, 6 Almacen
INSERT INTO producto (nombre, descripcion, precio, categoria_id, imagen_url, stock) VALUES
('Coca Cola 500ml', 'Gaseosa cola', 85, 1, NULL, 40),
('Agua saborizada', 'Agua con gas sabor pomelo', 60, 1, NULL, 25),
('Papas Lays', 'Papas fritas clasicas', 90, 2, NULL, 30),
('Alfajor Cofler', 'Alfajor de chocolate', 55, 3, NULL, 50),
('Chocolate Aguila', 'Chocolate con leche', 70, 3, NULL, 20),
('Sprite 500ml', 'Gaseosa lima limon', 85, 1, NULL, 30),
('Fanta 500ml', 'Gaseosa naranja', 85, 1, NULL, 30),
('Agua Salus 1L', 'Agua mineral sin gas', 65, 1, NULL, 40),
('Jugo de naranja 1L', 'Jugo de naranja en caja', 95, 1, NULL, 15),
('Gatorade 500ml', 'Bebida isotonica', 110, 1, NULL, 12),
('Doritos', 'Snack de maiz sabor queso', 95, 2, NULL, 25),
('Palitos de queso', 'Palitos salados', 60, 2, NULL, 35),
('Mani salado', 'Mani tostado con sal', 50, 2, NULL, 40),
('Chizitos', 'Snack de maiz inflado', 55, 2, NULL, 30),
('Pringles original', 'Papas en tubo', 180, 2, NULL, 10),
('Alfajor de maicena', 'Alfajor con dulce de leche y coco', 45, 3, NULL, 60),
('Chicles de menta', 'Paquete de chicles', 35, 3, NULL, 80),
('Caramelos masticables', 'Bolsita de caramelos frutales', 25, 3, NULL, 100),
('Bon o Bon', 'Bombon de chocolate y mani', 30, 3, NULL, 70),
('Turron de mani', 'Turron chico', 20, 3, NULL, 50),
('Galletitas Oreo', 'Galletitas de chocolate rellenas', 75, 4, NULL, 30),
('Galletitas de vainilla', 'Galletitas dulces', 65, 4, NULL, 25),
('Bizcochos salados', 'Bizcochos de grasa', 55, 4, NULL, 20),
('Galletas de arroz', 'Galletas de arroz integral', 70, 4, NULL, 15),
('Leche entera 1L', 'Leche en sachet', 52, 5, NULL, 30),
('Yogur bebible frutilla', 'Yogur de 1L', 60, 5, NULL, 20),
('Chocolatada 1L', 'Leche chocolatada', 58, 5, NULL, 25),
('Yerba 1kg', 'Yerba mate tradicional', 290, 6, NULL, 15),
('Azucar 1kg', 'Azucar blanca', 75, 6, NULL, 20),
('Pan lactal', 'Pan de molde blanco', 120, 6, NULL, 10);

-- uno inactivo para probar el filtro activo=false del dueño
INSERT INTO producto (nombre, descripcion, precio, categoria_id, imagen_url, stock, activo) VALUES
('Gaseosa de pomelo 2L', 'Ya no se vende', 140, 1, NULL, 0, FALSE);

-- carrito de Juan con 2 productos. el carrito tiene id propio,
-- asi que los items se cuelgan del id que genera el insert
INSERT INTO carrito (usuario_id) VALUES (3);
INSERT INTO carrito_item (carrito_id, producto_id, cantidad) VALUES
((SELECT id FROM carrito WHERE usuario_id = 3), 1, 3),
((SELECT id FROM carrito WHERE usuario_id = 3), 3, 1);

-- pedidos de cada cliente en distintos estados. la direccion (con sus coordenadas) se copia
-- en el pedido y el total es la suma de sus items. el 1 queda en preparando para que el
-- repartidor lo pueda recoger; el 2 y el 4 ya los tiene Pedro (repartidor 5)
INSERT INTO pedido (usuario_id, direccion_id, direccion_calle, direccion_numero, direccion_ciudad,
                    direccion_referencia, direccion_lat, direccion_lng, fecha_creacion, estado,
                    metodo_pago, total, repartidor_id) VALUES
(4, 2, 'Artigas', '567', 'Salto', 'Al lado de la plaza', -31.39370, -57.96380, now() - interval '1 day', 'preparando', 'mercadopago', 260, NULL),
(4, 2, 'Artigas', '567', 'Salto', 'Al lado de la plaza', -31.39370, -57.96380, now() - interval '10 days', 'entregado', 'pos', 440, 5),
(3, 1, '18 de Julio', '1234', 'Salto', 'Casa con porton azul', -31.38530, -57.95520, now() - interval '2 hours', 'realizado', 'pos', 265, NULL),
(3, 3, 'Rivera', '89', 'Salto', NULL, -31.38010, -57.96550, now() - interval '3 days', 'en_reparto', 'mercadopago', 202, 5),
(3, 1, '18 de Julio', '1234', 'Salto', 'Casa con porton azul', -31.38530, -57.95520, now() - interval '20 days', 'cancelado', 'mercadopago', 180, NULL);

INSERT INTO pedido_item (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario) VALUES
(1, 4, 'Alfajor Cofler', 2, 55),
(1, 2, 'Agua saborizada', 1, 60),
(1, 3, 'Papas Lays', 1, 90),
(2, 28, 'Yerba 1kg', 1, 290),
(2, 29, 'Azucar 1kg', 2, 75),
(3, 1, 'Coca Cola 500ml', 2, 85),
(3, 11, 'Doritos', 1, 95),
(4, 21, 'Galletitas Oreo', 2, 75),
(4, 25, 'Leche entera 1L', 1, 52),
(5, 15, 'Pringles original', 1, 180);

INSERT INTO pedido_estado_historial (pedido_id, estado, fecha, usuario_id) VALUES
(1, 'realizado', now() - interval '1 day', 4),
(1, 'preparando', now() - interval '20 hours', 2),
(2, 'realizado', now() - interval '10 days', 4),
(2, 'preparando', now() - interval '10 days' + interval '1 hour', 2),
(2, 'en_reparto', now() - interval '10 days' + interval '2 hours', 5),
(2, 'entregado', now() - interval '10 days' + interval '3 hours', 5),
(3, 'realizado', now() - interval '2 hours', 3),
(4, 'realizado', now() - interval '3 days', 3),
(4, 'preparando', now() - interval '3 days' + interval '1 hour', 1),
(4, 'en_reparto', now() - interval '3 days' + interval '2 hours', 5),
(5, 'realizado', now() - interval '20 days', 3),
(5, 'cancelado', now() - interval '20 days' + interval '1 hour', 3);

-- el pedido 4 tuvo un pago rechazado antes del pagado (un pedido puede tener varios pagos)
INSERT INTO pago (pedido_id, metodo, estado, referencia_externa, fecha_pago, registrado_por) VALUES
(1, 'mercadopago', 'pagado', 'MP-000123456', now() - interval '1 day', NULL),
(2, 'pos', 'pagado', 'POS-000001', now() - interval '10 days' + interval '3 hours', 5),
(3, 'pos', 'pendiente', NULL, NULL, NULL),
(4, 'mercadopago', 'rechazado', 'MP-000123457', NULL, NULL),
(4, 'mercadopago', 'pagado', 'MP-000123458', now() - interval '3 days', NULL),
(5, 'mercadopago', 'rechazado', 'MP-000123459', NULL, NULL);

-- recorridos de ejemplo del repartidor, desde el local (plaza Artigas) hasta la casa del cliente.
-- el 2 es un reparto terminado; el 4 sigue en_reparto, con el ultimo punto a mitad de camino
INSERT INTO pedido_ubicacion (pedido_id, lat, lng, fecha) VALUES
(2, -31.38876, -57.96062, now() - interval '10 days' + interval '2 hours'),
(2, -31.39030, -57.96150, now() - interval '10 days' + interval '2 hours 5 minutes'),
(2, -31.39200, -57.96260, now() - interval '10 days' + interval '2 hours 10 minutes'),
(2, -31.39370, -57.96380, now() - interval '10 days' + interval '2 hours 15 minutes'),
(4, -31.38876, -57.96062, now() - interval '3 days' + interval '2 hours'),
(4, -31.38700, -57.96210, now() - interval '3 days' + interval '2 hours 4 minutes'),
(4, -31.38520, -57.96340, now() - interval '3 days' + interval '2 hours 8 minutes');
