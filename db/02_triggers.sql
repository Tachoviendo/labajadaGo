-- Triggers de stock - Kiosco La Bajada
-- Postgres
-- el stock se maneja desde la base, la api no lo descuenta ni lo repone a mano

-- al agregar un item a un pedido se descuenta su cantidad del stock del producto.
-- si no alcanza, se cancela toda la operacion (check_violation, la api lo devuelve como 409).
-- un pedido que ya se carga cancelado (ej: datos de prueba) no descuenta nada
CREATE FUNCTION descontar_stock() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT estado FROM pedido WHERE id = NEW.pedido_id) = 'cancelado' THEN
        RETURN NEW;
    END IF;

    UPDATE producto SET stock = stock - NEW.cantidad
    WHERE id = NEW.producto_id AND stock >= NEW.cantidad;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'stock insuficiente para el producto %', NEW.producto_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedido_item_descontar_stock
AFTER INSERT ON pedido_item
FOR EACH ROW EXECUTE FUNCTION descontar_stock();

-- al cancelar un pedido se devuelve al stock lo que tenia cada producto
CREATE FUNCTION reponer_stock() RETURNS TRIGGER AS $$
BEGIN
    UPDATE producto p SET stock = p.stock + i.cantidad
    FROM (
        SELECT producto_id, SUM(cantidad) AS cantidad
        FROM pedido_item WHERE pedido_id = NEW.id
        GROUP BY producto_id
    ) i
    WHERE p.id = i.producto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedido_reponer_stock
AFTER UPDATE OF estado ON pedido
FOR EACH ROW
WHEN (NEW.estado = 'cancelado' AND OLD.estado <> 'cancelado')
EXECUTE FUNCTION reponer_stock();
