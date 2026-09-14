require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);
// ======================================================
// AUTENTICACIÓN
// ======================================================

// Las sesiones NO se guardan en memoria.
// Esto es importante en Render porque una instancia puede reiniciarse
// o entrar en sleep; una Map se perdería y desloguearía a la Cocina.
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;
const CLAVE_SESION = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;

if (!CLAVE_SESION) {
    throw new Error("Falta SESSION_SECRET o ADMIN_PASSWORD para firmar las sesiones.");
}

function codificarBase64Url(texto) {
    return Buffer.from(texto, "utf8").toString("base64url");
}

function firmarSesion(expira) {
    return crypto
        .createHmac("sha256", CLAVE_SESION)
        .update(String(expira))
        .digest("base64url");
}

function crearSesion() {
    const expira = Date.now() + DURACION_SESION_MS;
    return `${codificarBase64Url(String(expira))}.${firmarSesion(expira)}`;
}

function validarSesion(token) {
    if (!token) return null;

    const partes = token.split(".");
    if (partes.length !== 2) return null;

    let expira;

    try {
        expira = Number(Buffer.from(partes[0], "base64url").toString("utf8"));
    } catch {
        return null;
    }

    if (!Number.isSafeInteger(expira) || Date.now() > expira) {
        return null;
    }

    const firmaEsperada = firmarSesion(expira);
    const firmaRecibida = partes[1];

    const a = Buffer.from(firmaRecibida);
    const b = Buffer.from(firmaEsperada);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return null;
    }

    return { expira };
}

function obtenerToken(req) {
    const cookies = req.headers.cookie || "";

    const cookie = cookies
        .split(";")
        .map(c => c.trim())
        .find(c => c.startsWith("sesion="));

    return cookie ? cookie.substring("sesion=".length) : null;
}

function requiereAuth(req, res, next) {
    const token = obtenerToken(req);
    const sesion = validarSesion(token);

    if (!sesion) {
        return res.status(401).json({
            ok: false,
            mensaje: "No autorizado o sesión expirada."
        });
    }

    next();
}

app.use(express.json());
// ======================================================
// LOGIN
// ======================================================

app.post("/api/login", (req, res) => {
    const { usuario, password } = req.body || {};

    if (
        usuario !== process.env.ADMIN_USER ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            ok: false,
            mensaje: "Usuario o contraseña incorrectos."
        });
    }

    const token = crearSesion();

    const secure = process.env.NODE_ENV === "production"
        ? " Secure;"
        : "";

    res.setHeader(
        "Set-Cookie",
        `sesion=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DURACION_SESION_MS / 1000};${secure}`
    );

    res.json({
        ok: true
    });
});

app.post("/api/logout", (req, res) => {
    const token = obtenerToken(req);

    res.setHeader(
        "Set-Cookie",
        "sesion=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    );

    res.json({
        ok: true
    });
});

app.get("/api/sesion", (req, res) => {
    const token = obtenerToken(req);
    const sesion = validarSesion(token);

    if (!sesion) {
        return res.status(401).json({
            ok: false
        });
    }

    res.json({
        ok: true
    });
});
// ======================================================
// PROTEGER PÁGINAS
// ======================================================

app.get("/", (req, res, next) => {
    const token = obtenerToken(req);

    if (!validarSesion(token)) {
return res.redirect("/login.html?redirect=/");    }

    next();
});

app.get("/index.html", (req, res, next) => {
    const token = obtenerToken(req);

    if (!validarSesion(token)) {
        return res.sendFile(path.join(__dirname, "public", "login.html"));
    }

    next();
});

app.get("/cocina.html", (req, res, next) => {
    const token = obtenerToken(req);

    if (!validarSesion(token)) {
        return res.redirect("/login.html?redirect=/cocina.html");
    }

    next();
});
app.use(express.static(path.join(__dirname, "public")));

const TIEMPO_PREPARACION_MINUTOS = 20;
const CAPACIDAD_HORNEADO_EMPANADAS = 156; // 108 eléctricos + 48 horno de barro

let clientesCocina = [];

// ======================================================
// CONVERSIÓN BASE DE DATOS -> FORMATO DE LA APLICACIÓN
// ======================================================

function convertirPedido(row) {
    return {
        id: row.id,
        numero: row.numero,
        fechaOperativa: row.fecha_operativa,
        destino: row.destino,
        cliente: row.cliente || "",
        modoRetiro: row.modo_retiro,
        retiroAt: row.retiro_at,
        creadoAt: row.creado_at,
        productos: Array.isArray(row.productos) ? row.productos : [],
        observacion: row.observacion || "",
        estado: row.estado,
        listoAt: row.listo_at,
        entregadoAt: row.entregado_at,
        anuladoAt: row.anulado_at,
        motivoAnulacion: row.motivo_anulacion || ""
    };
}

function cantidadEmpanadas(pedido) {
    if (!Array.isArray(pedido.productos)) return 0;

    return pedido.productos.reduce((total, producto) => {
        const nombre = String(producto.nombre || "").toLowerCase();
        const tipo = String(producto.tipo || "").toLowerCase();

        if (tipo === "empanada" || nombre.includes("empanada")) {
            const cantidad = Number(producto.cantidad);
            return total + (Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0);
        }

        return total;
    }, 0);
}

function calcularDemoraEmpanadas(pedidos) {
    const ahora = new Date();

    const horaArgentina = Number(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Argentina/Buenos_Aires",
            hour: "2-digit",
            hour12: false
        }).format(ahora)
    );

    const diaArgentina = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
        weekday: "short"
    }).format(ahora);

    // El horno de barro funciona solamente los domingos
    // de 11:00 a 16:00.
    const esDomingo = diaArgentina === "Sun";
    const hornoBarroActivo =
        esDomingo &&
        horaArgentina >= 11 &&
        horaArgentina < 16;

    const capacidadPorTanda = hornoBarroActivo ? 156 : 108;

    const activos = pedidos.filter(p =>
        p.estado !== "entregado" &&
        p.estado !== "anulado" &&
        p.modoRetiro !== "programado"
    );

    const totalEmpanadas = activos.reduce(
        (sum, pedido) => sum + cantidadEmpanadas(pedido),
        0
    );

    const lotes = Math.ceil(totalEmpanadas / capacidadPorTanda);

    return Math.max(
        TIEMPO_PREPARACION_MINUTOS,
        lotes * TIEMPO_PREPARACION_MINUTOS
    );
}

// ======================================================
// EMITIR EVENTOS A COCINA
// ======================================================

function emitir(evento) {
    const mensaje = `data: ${JSON.stringify(evento)}\n\n`;

    clientesCocina.forEach(cliente => {
        try {
            cliente.res.write(mensaje);
        } catch (error) {
            // La conexión se cerrará por el evento "close"
        }
    });
}

// ======================================================
// FECHA OPERATIVA (ARGENTINA)
// ======================================================

function fechaOperativaHoy() {
    const ahora = new Date();
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false
    }).formatToParts(ahora);

    const obtener = tipo => partes.find(p => p.type === tipo)?.value;
    const hora = Number(obtener("hour"));
    const fecha = `${obtener("year")}-${obtener("month")}-${obtener("day")}`;

    if (hora < 2) {
        const anterior = new Date(`${fecha}T12:00:00-03:00`);
        anterior.setDate(anterior.getDate() - 1);
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Argentina/Buenos_Aires",
            year: "numeric", month: "2-digit", day: "2-digit"
        }).format(anterior);
    }

    return fecha;
}

// ======================================================
// OBTENER PEDIDOS ACTIVOS
// ======================================================

async function obtenerPedidosActivos() {
    const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("fecha_operativa", fechaOperativaHoy())
        .not("estado", "in", "(entregado,anulado)")
        .order("numero", { ascending: true });

    if (error) {
        throw error;
    }

    return data.map(convertirPedido);
}

// ======================================================
// PREPARAR PEDIDO
// ======================================================

function prepararDatosPedido(body) {
    let retiroAt = null;

    if (
        body.modoRetiro === "programado" &&
        body.retiroFecha &&
        body.retiroHora
    ) {
        // Argentina = UTC-3
        retiroAt = new Date(
            `${body.retiroFecha}T${body.retiroHora}:00-03:00`
        );

        if (Number.isNaN(retiroAt.getTime())) {
            retiroAt = null;
        }
    }

    return {
        destino: body.destino,
        cliente: body.cliente || "",
        modo_retiro: body.modoRetiro || "ahora",
        retiro_at: retiroAt ? retiroAt.toISOString() : null,
        productos: Array.isArray(body.productos)
            ? body.productos
            : [],
        observacion: body.observacion || "",
        estado: "pendiente"
    };
}

// ======================================================
// CREAR PEDIDO
// ======================================================

app.post("/api/pedidos", requiereAuth, async (req, res) => {
    try {
        const body = req.body || {};

        if (!body.destino) {
            return res.status(400).json({
                ok: false,
                mensaje: "Falta el destino."
            });
        }

        if (
            body.destino === "Para llevar" &&
            !String(body.cliente || "").trim()
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Para llevar requiere el nombre del cliente."
            });
        }

        if (
            body.modoRetiro === "programado" &&
            (!body.retiroFecha || !body.retiroHora)
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Falta una fecha y hora de retiro válidas."
            });
        }

        const datosPedido = prepararDatosPedido(body);

        if (
            datosPedido.modo_retiro === "programado" &&
            !datosPedido.retiro_at
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Falta una fecha y hora de retiro válidas."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .insert(datosPedido)
            .select("*")
            .single();

        if (error) {
            console.error("Error creando pedido:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo guardar el pedido."
            });
        }

        const pedido = convertirPedido(data);

        const pedidosActivos = await obtenerPedidosActivos();
        const cantidadNueva = cantidadEmpanadas(pedido);
        const demoraEmpanadas = cantidadNueva > 0
            ? calcularDemoraEmpanadas(pedidosActivos)
            : 0;

        emitir({
            tipo: "nuevo",
            pedido
        });

        res.json({
            ok: true,
            pedido,
            demoraEmpanadas
        });

    } catch (error) {
        console.error("Error inesperado creando pedido:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor."
        });
    }
});

// ======================================================
// OBTENER PEDIDOS
// ======================================================

app.get("/api/pedidos", requiereAuth, async (req, res) => {
    try {
        const pedidos = await obtenerPedidosActivos();

        res.json(pedidos);

    } catch (error) {
        console.error("Error obteniendo pedidos:", error);

        res.status(500).json({
            ok: false,
            mensaje: "No se pudieron obtener los pedidos."
        });
    }
});

// ======================================================
// HISTORIAL DE PEDIDOS FINALIZADOS DEL DÍA
// ======================================================

app.get("/api/pedidos/historial", requiereAuth, async (req, res) => {
    try {
        const fechaSolicitada = String(req.query.fecha || fechaOperativaHoy());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaSolicitada)) {
            return res.status(400).json({ ok: false, mensaje: "Fecha de historial inválida." });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .select("*")
            .eq("fecha_operativa", fechaSolicitada)
            .in("estado", ["entregado", "anulado"])
            .order("creado_at", { ascending: false });

        if (error) {
            console.error("Error obteniendo historial:", error);
            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo obtener el historial."
            });
        }

        res.json(data.map(convertirPedido));
    } catch (error) {
        console.error("Error inesperado obteniendo historial:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor."
        });
    }
});

// ======================================================
// CONEXIÓN EN TIEMPO REAL CON COCINA
// ======================================================

app.get("/api/cocina", requiereAuth, async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders?.();

    const cliente = { res };

    clientesCocina.push(cliente);

    try {
        const pedidos = await obtenerPedidosActivos();

        res.write(
            `data: ${JSON.stringify({
                tipo: "inicio",
                pedidos
            })}\n\n`
        );

    } catch (error) {
        console.error("Error cargando cocina:", error);

        res.write(
            `data: ${JSON.stringify({
                tipo: "error",
                mensaje: "No se pudieron cargar los pedidos."
            })}\n\n`
        );
    }

    req.on("close", () => {
        clientesCocina = clientesCocina.filter(
            c => c !== cliente
        );
    });
});

// ======================================================
// PONER PEDIDO EN MARCHA
// ======================================================

app.post("/api/pedidos/:id/marchar", requiereAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "ID de pedido inválido."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .update({ estado: "en_marcha" })
            .eq("id", id)
            .eq("fecha_operativa", fechaOperativaHoy())
            .eq("estado", "pendiente")
            .select("*")
            .single();

        if (error) {
            console.error("Error poniendo pedido en marcha:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo poner el pedido en marcha."
            });
        }

        const pedido = convertirPedido(data);

        emitir({
            tipo: "estado",
            pedido
        });

        res.json({
            ok: true,
            pedido
        });

    } catch (error) {
        console.error("Error inesperado poniendo pedido en marcha:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor."
        });
    }
});

// ======================================================
// MARCAR PEDIDO COMO LISTO
// ======================================================

app.post("/api/pedidos/:id/listo", requiereAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "ID de pedido inválido."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .update({
                estado: "listo",
                listo_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("fecha_operativa", fechaOperativaHoy())
            .eq("estado", "en_marcha")
            .select("*")
            .single();

        if (error) {
            console.error("Error marcando pedido como listo:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo actualizar el pedido."
            });
        }

        const pedido = convertirPedido(data);

        emitir({
            tipo: "estado",
            pedido
        });

        res.json({
            ok: true,
            pedido
        });

    } catch (error) {
        console.error("Error inesperado:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor."
        });
    }
});

// ======================================================
// ANULAR PEDIDO
// ======================================================

app.post("/api/pedidos/:id/anular", requiereAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const motivo = String(req.body?.motivo || "").trim();

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "ID de pedido inválido."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .update({
                estado: "anulado",
                anulado_at: new Date().toISOString(),
                motivo_anulacion: motivo
            })
            .eq("id", id)
            .eq("fecha_operativa", fechaOperativaHoy())
            .in("estado", ["pendiente", "en_marcha", "listo"])
            .select("*")
            .single();

        if (error) {
            console.error("Error anulando pedido:", error);
            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo anular el pedido."
            });
        }

        const pedido = convertirPedido(data);
        emitir({ tipo: "estado", pedido });

        res.json({ ok: true, pedido });
    } catch (error) {
        console.error("Error inesperado anulando pedido:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor."
        });
    }
});

// ======================================================
// MARCAR PEDIDO COMO ENTREGADO
// ======================================================

app.post("/api/pedidos/:id/entregado", requiereAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "ID de pedido inválido."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .update({
                estado: "entregado",
                entregado_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("fecha_operativa", fechaOperativaHoy())
            .eq("estado", "listo")
            .select("*")
            .single();

        if (error) {
            console.error("Error marcando pedido como entregado:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo actualizar el pedido."
            });
        }

        const pedido = convertirPedido(data);

        emitir({
            tipo: "estado",
            pedido
        });

        res.json({
            ok: true,
            pedido
        });

    } catch (error) {
        console.error("Error inesperado:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor."
        });
    }
});

// ======================================================
// CORREGIR ENTREGA ACCIDENTAL
// ENTREGADO -> LISTO
// ======================================================

app.post("/api/pedidos/:id/corregir-entrega", requiereAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "ID de pedido inválido."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .update({
                estado: "listo",
                listo_at: new Date().toISOString(),
                entregado_at: null
            })
            .eq("id", id)
            .eq("fecha_operativa", fechaOperativaHoy())
            .eq("estado", "entregado")
            .select("*")
            .single();

        if (error) {
            console.error("Error corrigiendo entrega:", error);

            return res.status(409).json({
                ok: false,
                mensaje: "El pedido ya no figura como entregado o no puede corregirse."
            });
        }

        const pedido = convertirPedido(data);

        emitir({
            tipo: "estado",
            pedido
        });

        res.json({
            ok: true,
            pedido
        });

    } catch (error) {
        console.error("Error inesperado corrigiendo entrega:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor."
        });
    }
});

// ======================================================
// ESTADÍSTICAS DE COMIDA VENDIDA DEL DÍA
// ======================================================

app.get("/api/estadisticas/comida-hoy", requiereAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("pedidos")
            .select("productos")
            .eq("fecha_operativa", fechaOperativaHoy())
            .eq("estado", "entregado");

        if (error) {
            console.error("Error obteniendo estadísticas de comida:", error);
            return res.status(500).json({
                ok: false,
                mensaje: "No se pudieron obtener las estadísticas de comida."
            });
        }

        const cantidades = new Map();
        let totalUnidades = 0;

        for (const pedido of data || []) {
            const productos = Array.isArray(pedido.productos) ? pedido.productos : [];

            for (const producto of productos) {
                const nombre = String(producto?.nombre || "").trim();
                const cantidad = Number(producto?.cantidad);

                if (!nombre || !Number.isFinite(cantidad) || cantidad <= 0) {
                    continue;
                }

                cantidades.set(
                    nombre,
                    (cantidades.get(nombre) || 0) + cantidad
                );

                totalUnidades += cantidad;
            }
        }

        const productosVendidos = [...cantidades.entries()]
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) =>
                b.cantidad - a.cantidad ||
                a.nombre.localeCompare(b.nombre, "es")
            );

        res.json({
            ok: true,
            totalPedidosEntregados: (data || []).length,
            totalUnidades,
            productosVendidos
        });

    } catch (error) {
        console.error("Error inesperado obteniendo estadísticas de comida:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor."
        });
    }
});

// ======================================================
// COMPROBAR CONEXIÓN CON SUPABASE
// ======================================================

async function probarConexionSupabase() {
    const { error } = await supabase
        .from("pedidos")
        .select("id")
        .limit(1);

    if (error) {
        console.error("❌ Error conectando con Supabase:");
        console.error(error.message);
        return;
    }

    console.log("✅ Conexión con Supabase correcta.");
}

// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(PORT, "0.0.0.0", async () => {
    console.log(
        `Sistema de comandas funcionando en http://localhost:${PORT}`
    );

    await probarConexionSupabase();
});