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

const sesiones = new Map();
const DURACION_SESION_MS = 12 * 60 * 60 * 1000;

function crearSesion() {
    const token = crypto.randomBytes(32).toString("hex");

    sesiones.set(token, {
        expira: Date.now() + DURACION_SESION_MS
    });

    return token;
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

    if (!token || !sesiones.has(token)) {
        return res.status(401).json({
            ok: false,
            mensaje: "No autorizado."
        });
    }

    const sesion = sesiones.get(token);

    if (Date.now() > sesion.expira) {
        sesiones.delete(token);

        return res.status(401).json({
            ok: false,
            mensaje: "La sesión expiró."
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

    if (token) {
        sesiones.delete(token);
    }

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

    if (!token || !sesiones.has(token)) {
        return res.status(401).json({
            ok: false
        });
    }

    const sesion = sesiones.get(token);

    if (Date.now() > sesion.expira) {
        sesiones.delete(token);

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

    if (!token || !sesiones.has(token)) {
        return res.redirect("/login.html?redirect=/cocina.html");
    }

    next();
});

app.get("/index.html", (req, res, next) => {
    const token = obtenerToken(req);

    if (!token || !sesiones.has(token)) {
        return res.sendFile(path.join(__dirname, "public", "login.html"));
    }

    next();
});

app.get("/cocina.html", (req, res, next) => {
    const token = obtenerToken(req);

    if (!token || !sesiones.has(token)) {
        return res.sendFile(path.join(__dirname, "public", "login.html"));
    }

    next();
});
app.use(express.static(path.join(__dirname, "public")));

const TIEMPO_PREPARACION_MINUTOS = 20;

let clientesCocina = [];

// ======================================================
// CONVERSIÓN BASE DE DATOS -> FORMATO DE LA APLICACIÓN
// ======================================================

function convertirPedido(row) {
    return {
        numero: row.numero,
        destino: row.destino,
        cliente: row.cliente || "",
        modoRetiro: row.modo_retiro,
        retiroAt: row.retiro_at,
        creadoAt: row.creado_at,
        productos: Array.isArray(row.productos) ? row.productos : [],
        observacion: row.observacion || "",
        estado: row.estado,
        listoAt: row.listo_at,
        entregadoAt: row.entregado_at
    };
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
// OBTENER PEDIDOS ACTIVOS
// ======================================================

async function obtenerPedidosActivos() {
    const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .neq("estado", "entregado")
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
                mensaje: "Para llevar requiere nombre y apellido."
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

        emitir({
            tipo: "nuevo",
            pedido
        });

        res.json({
            ok: true,
            pedido
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
// MARCAR PEDIDO COMO LISTO
// ======================================================

app.post("/api/pedidos/:numero/listo", requiereAuth, async (req, res) => {
    try {
        const numero = Number(req.params.numero);

        if (!Number.isInteger(numero)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Número de pedido inválido."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .update({
                estado: "listo",
                listo_at: new Date().toISOString()
            })
            .eq("numero", numero)
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
// MARCAR PEDIDO COMO ENTREGADO
// ======================================================

app.post("/api/pedidos/:numero/entregado", requiereAuth, async (req, res) => {
    try {
        const numero = Number(req.params.numero);

        if (!Number.isInteger(numero)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Número de pedido inválido."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .update({
                estado: "entregado",
                entregado_at: new Date().toISOString()
            })
            .eq("numero", numero)
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