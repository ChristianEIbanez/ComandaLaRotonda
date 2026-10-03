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
app.get("/estadisticas.html",(req,res,next)=>{
    const token=obtenerToken(req);
    if(!token||!validarSesion(token)) return res.redirect("/login.html?redirect=/estadisticas.html");
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

    clientesCocina = clientesCocina.filter(cliente => {
        if (cliente.res.writableEnded || cliente.res.destroyed) return false;

        try {
            cliente.res.write(mensaje);
            return true;
        } catch {
            return false;
        }
    });
}

// ======================================================
// HEARTBEAT SSE
// ======================================================

// Mantiene viva la conexión con Cocina y evita que Render
// o un proxy cierre la conexión por inactividad.
setInterval(() => {
    clientesCocina = clientesCocina.filter(cliente => {
        if (cliente.res.writableEnded || cliente.res.destroyed) {
            return false;
        }

        try {
            cliente.res.write(": heartbeat\n\n");
            return true;
        } catch {
            return false;
        }
    });
}, 20000);

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
        cliente: String(body.cliente || "").trim(),
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

        const cliente = String(body.cliente || "").trim();

        if (
            body.destino === "Para llevar" &&
            !cliente
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Para llevar requiere el nombre del cliente."
            });
        }

        if (cliente.length > 20) {
            return res.status(400).json({
                ok: false,
                mensaje: "El nombre del cliente no puede superar 20 caracteres."
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
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    res.flushHeaders?.();

    req.setTimeout(0);
    res.setTimeout(0);

    res.write("retry: 3000\n\n");

    const cliente = { res };
    clientesCocina.push(cliente);

    try {
        const pedidos = await obtenerPedidosActivos();
        res.write(
            `data: ${JSON.stringify({ tipo: "inicio", pedidos })}\n\n`
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
        clientesCocina = clientesCocina.filter(c => c !== cliente);
    });
});

// ======================================================
// MENSAJE DIRECTO A COCINA (NO ES UN PEDIDO)
// ======================================================

app.post("/api/cocina/mensaje", requiereAuth, async (req, res) => {
    try {
        const mensaje = String(req.body?.mensaje || "")
            .replace(/\s+/g, " ")
            .trim();

        if (!mensaje) {
            return res.status(400).json({
                ok: false,
                mensaje: "El mensaje no puede estar vacío."
            });
        }

        if (mensaje.length > 180) {
            return res.status(400).json({
                ok: false,
                mensaje: "El mensaje no puede superar 180 caracteres."
            });
        }

        const evento = {
            tipo: "mensaje",
            id: crypto.randomUUID(),
            mensaje,
            creadoAt: new Date().toISOString()
        };

        emitir(evento);

        res.json({
            ok: true,
            evento
        });

    } catch (error) {
        console.error("Error enviando mensaje a cocina:", error);

        res.status(500).json({
            ok: false,
            mensaje: "No se pudo enviar el mensaje a cocina."
        });
    }
});

// ======================================================
// AVISAR AL COMANDERO QUE UN PEDIDO YA ESTÁ LISTO
// No cambia el estado del pedido. Solo emite un aviso en tiempo real.
// ======================================================

app.post("/api/comandero/mensaje-listo", requiereAuth, async (req, res) => {
    try {
        const id = Number(req.body?.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "ID de pedido inválido."
            });
        }

        const { data, error } = await supabase
            .from("pedidos")
            .select("id, numero, estado")
            .eq("id", id)
            .eq("fecha_operativa", fechaOperativaHoy())
            .eq("estado", "listo")
            .single();

        if (error || !data) {
            return res.status(409).json({
                ok: false,
                mensaje: "El pedido ya no figura como listo o no corresponde al día operativo actual."
            });
        }

        const evento = {
            tipo: "mensaje_comandero",
            id: crypto.randomUUID(),
            pedidoId: data.id,
            mensaje: `PEDIDO #${data.numero} LISTO`,
            creadoAt: new Date().toISOString()
        };

        emitir(evento);

        res.json({
            ok: true,
            evento
        });

    } catch (error) {
        console.error("Error avisando al comandero:", error);

        res.status(500).json({
            ok: false,
            mensaje: "No se pudo avisar al comandero."
        });
    }
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
// ANÁLISIS HISTÓRICO DE VENTAS
// Cantidades y pedidos entregados. No utiliza precios.
// ======================================================
function validarFechaAnalisis(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ""))) return null;
    const fecha = new Date(valor + "T12:00:00-03:00");
    if (Number.isNaN(fecha.getTime())) return null;
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric", month: "2-digit", day: "2-digit"
    }).format(fecha) === valor ? valor : null;
}
function diaSemanaAnalisis(fechaISO) {
    const [y,m,d] = fechaISO.split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires", weekday: "long"
    }).format(new Date(Date.UTC(y,m-1,d,12)));
}
app.get("/api/estadisticas/analisis", requiereAuth, async (req,res) => {
    try {
        const desde=validarFechaAnalisis(req.query.desde);
        const hasta=validarFechaAnalisis(req.query.hasta);

        if(!desde||!hasta||desde>hasta){
            return res.status(400).json({ok:false,mensaje:"Rango de fechas inválido."});
        }

        const inicio=new Date(desde+"T00:00:00-03:00");
        const fin=new Date(hasta+"T23:59:59.999-03:00");
        const duracionMs=fin-inicio;

        if(duracionMs>366*24*60*60*1000){
            return res.status(400).json({ok:false,mensaje:"El rango máximo es de 366 días."});
        }

        // Período anterior de igual duración, inmediatamente anterior al seleccionado.
        const diasPeriodo=Math.round(duracionMs/(24*60*60*1000))+1;
        const anteriorHasta=new Date(inicio.getTime()-1);
        const anteriorDesde=new Date(inicio.getTime()-diasPeriodo*24*60*60*1000);

        const fechaISOArgentina=fecha=>{
            return new Intl.DateTimeFormat("en-CA",{
                timeZone:"America/Argentina/Buenos_Aires",
                year:"numeric",month:"2-digit",day:"2-digit"
            }).format(fecha);
        };

        const desdeAnterior=fechaISOArgentina(anteriorDesde);
        const hastaAnterior=fechaISOArgentina(anteriorHasta);

        const {data,error}=await supabase.from("pedidos")
            .select("fecha_operativa, creado_at, productos")
            .gte("fecha_operativa",desdeAnterior)
            .lte("fecha_operativa",hasta)
            .eq("estado","entregado")
            .order("fecha_operativa",{ascending:true});

        if(error) throw error;

        const nombres=["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];
        const semana=new Map(nombres.map(d=>[d,{dia:d,cantidadDias:0,pedidos:0,unidades:0}]));
        const productos=new Map();
        const porSemana=new Map(nombres.map(d=>[d,new Map()]));
        const dias=new Map();
        const horas=Array.from({length:24},(_,h)=>({hora:h,pedidos:0,unidades:0}));
        const actualSet=new Set();

        for(let h=0;h<24;h++){
            horas[h].hora=h;
        }

        for(const pedido of data||[]){
            const fecha=pedido.fecha_operativa;
            if(!fecha) continue;

            const esActual=fecha>=desde && fecha<=hasta;
            const esAnterior=fecha>=desdeAnterior && fecha<=hastaAnterior;
            if(!esActual && !esAnterior) continue;

            if(!esActual) continue;

            actualSet.add(fecha);

            const dia=diaSemanaAnalisis(fecha);

            if(!dias.has(fecha)){
                dias.set(fecha,{fecha,diaSemana:dia,pedidos:0,unidades:0});
            }

            dias.get(fecha).pedidos++;

            const sw=semana.get(dia);
            if(sw) sw.pedidos++;

            if(pedido.creado_at){
                const partesHora=new Intl.DateTimeFormat("en-US",{
                    timeZone:"America/Argentina/Buenos_Aires",
                    hour:"2-digit",
                    hour12:false
                }).formatToParts(new Date(pedido.creado_at));

                const horaParte=partesHora.find(p=>p.type==="hour")?.value;
                const hora=Number(horaParte);

                if(Number.isInteger(hora) && hora>=0 && hora<=23){
                    horas[hora].pedidos++;
                }
            }

            const lista=Array.isArray(pedido.productos)?pedido.productos:[];
            const productosEnPedido=new Set();

            for(const p of lista){
                const nombre=String(p?.nombre||"").trim();
                const cantidad=Number(p?.cantidad);

                if(!nombre||!Number.isFinite(cantidad)||cantidad<=0) continue;

                dias.get(fecha).unidades+=cantidad;

                if(!productos.has(nombre)){
                    productos.set(nombre,{nombre,unidades:0,pedidos:0});
                }

                productos.get(nombre).unidades+=cantidad;

                if(!productosEnPedido.has(nombre)){
                    productos.get(nombre).pedidos++;
                    productosEnPedido.add(nombre);
                }

                if(sw){
                    const mapa=porSemana.get(dia);
                    mapa.set(nombre,(mapa.get(nombre)||0)+cantidad);
                    sw.unidades+=cantidad;
                }

                // La cantidad vendida por hora se asigna a la hora del pedido.
                if(pedido.creado_at){
                    const partesHora=new Intl.DateTimeFormat("en-US",{
                        timeZone:"America/Argentina/Buenos_Aires",
                        hour:"2-digit",
                        hour12:false
                    }).formatToParts(new Date(pedido.creado_at));

                    const horaParte=partesHora.find(p=>p.type==="hour")?.value;
                    const hora=Number(horaParte);

                    if(Number.isInteger(hora) && hora>=0 && hora<=23){
                        horas[hora].unidades+=cantidad;
                    }
                }
            }
        }

        // Obtener totales del período anterior sin mezclar sus productos con el período actual.
        let anteriorPedidos=0;
        let anteriorUnidades=0;

        for(const pedido of data||[]){
            const fecha=pedido.fecha_operativa;
            if(!fecha || fecha<desdeAnterior || fecha>hastaAnterior) continue;

            anteriorPedidos++;

            const lista=Array.isArray(pedido.productos)?pedido.productos:[];
            for(const p of lista){
                const cantidad=Number(p?.cantidad);
                if(Number.isFinite(cantidad) && cantidad>0){
                    anteriorUnidades+=cantidad;
                }
            }
        }

        const cursor=new Date(desde+"T12:00:00-03:00");
        const fechaFin=new Date(hasta+"T12:00:00-03:00");

        while(cursor<=fechaFin){
            const fecha=fechaISOArgentina(cursor);

            if(!dias.has(fecha)){
                dias.set(fecha,{
                    fecha,
                    diaSemana:diaSemanaAnalisis(fecha),
                    pedidos:0,
                    unidades:0
                });
            }

            cursor.setUTCDate(cursor.getUTCDate()+1);
        }

        for(const d of dias.values()){
            const sw=semana.get(d.diaSemana);
            if(sw) sw.cantidadDias++;
        }

        const diasArray=[...dias.values()].sort((a,b)=>a.fecha.localeCompare(b.fecha));

        const rankingDias=diasArray
            .filter(x=>x.unidades>0||x.pedidos>0)
            .sort((a,b)=>b.unidades-a.unidades||b.pedidos-a.pedidos||a.fecha.localeCompare(b.fecha))
            .map((x,n)=>({puesto:n+1,...x}));

        const semanaArray=nombres.map(d=>{
            const x=semana.get(d);
            return {
                ...x,
                promedioPedidos:x.cantidadDias?Number((x.pedidos/x.cantidadDias).toFixed(2)):0,
                promedioUnidades:x.cantidadDias?Number((x.unidades/x.cantidadDias).toFixed(2)):0
            };
        });

        const totalUnidades=diasArray.reduce((s,x)=>s+x.unidades,0);

        const productosArray=[...productos.values()]
            .sort((a,b)=>b.unidades-a.unidades||b.pedidos-a.pedidos||a.nombre.localeCompare(b.nombre,"es"))
            .map((x,n)=>({
                puesto:n+1,
                ...x,
                porcentajeTotal:totalUnidades?Number((x.unidades/totalUnidades*100).toFixed(1)):0
            }));

        const productosPorDiaSemana={};
        for(const d of nombres){
            productosPorDiaSemana[d]=[...porSemana.get(d).entries()]
                .map(([producto,unidades])=>({producto,unidades}))
                .sort((a,b)=>b.unidades-a.unidades||a.producto.localeCompare(b.producto,"es"));
        }

        const ventasPorHora=horas.map(x=>({
            ...x,
            etiqueta:String(x.hora).padStart(2,"0")+":00"
        }));

        const variacionUnidades=anteriorUnidades
            ? Number(((totalUnidades-anteriorUnidades)/anteriorUnidades*100).toFixed(1))
            : null;

        const variacionPedidos=anteriorPedidos
            ? Number(((data.filter(p=>p.fecha_operativa>=desde&&p.fecha_operativa<=hasta).length-anteriorPedidos)/anteriorPedidos*100).toFixed(1))
            : null;

        res.json({
            ok:true,
            desde,
            hasta,
            desdeAnterior,
            hastaAnterior,
            totalPedidos:(data||[]).filter(p=>p.fecha_operativa>=desde&&p.fecha_operativa<=hasta).length,
            totalUnidades,
            anteriorPedidos,
            anteriorUnidades,
            variacionPedidos,
            variacionUnidades,
            dias:diasArray,
            rankingDias,
            semana:semanaArray,
            productos:productosArray,
            productosPorDiaSemana,
            ventasPorHora
        });
    } catch(error) {
        console.error("Error en análisis histórico:",error);
        res.status(500).json({ok:false,mensaje:"No se pudo obtener el análisis histórico."});
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