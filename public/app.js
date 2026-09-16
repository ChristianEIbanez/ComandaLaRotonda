let destinoSeleccionado = null;
let pedidoActual = [];

let productoConfigurando = null;
let cantidadConfigurando = 1;
let editandoProductoIndex = null;

let modoRetiro = "ahora";

// =====================================================
// PRODUCTOS
// =====================================================

const productos = [
    {categoria:"empanadas",nombre:"Empanada de carne",tipo:"empanada"},
    {categoria:"empanadas",nombre:"Empanada de pollo",tipo:"empanada"},
    {categoria:"empanadas",nombre:"Empanada de jamón y queso",tipo:"empanada"},
    {categoria:"empanadas",nombre:"Empanada capresse",tipo:"empanada"},
    {categoria:"empanadas",nombre:"Empanada sfija",tipo:"empanada"},

    {categoria:"sandwiches",nombre:"Sándwich Mila Común",ingredientes:["Milanesa de carne","Lechuga","Tomate","Papas fritas"],modificaciones:true,aderezo:true,huevo:true,aji:true},
    {categoria:"sandwiches",nombre:"Sándwich Mila Especial",ingredientes:["Milanesa de carne","Jamón","Queso","Lechuga","Tomate","Papas fritas"],modificaciones:true,aderezo:true,huevo:true,aji:true},
    {categoria:"sandwiches",nombre:"Sándwich Mila de Pollo",ingredientes:["Milanesa de pollo","Lechuga","Tomate","Papas fritas"],modificaciones:true,aderezo:true,huevo:true,aji:true},
    {categoria:"sandwiches",nombre:"Sándwich Mila de Pollo Especial",ingredientes:["Milanesa de pollo","Jamón","Queso","Lechuga","Tomate","Papas fritas"],modificaciones:true,aderezo:true,huevo:true,aji:true},
    {categoria:"sandwiches",nombre:"Sándwich de Lomo Especial",ingredientes:["Lomo","Jamón","Queso","Lechuga","Tomate","Papas fritas"],modificaciones:true,aderezo:true,huevo:true,aji:true},

    {categoria:"hamburguesas",nombre:"Hamburguesa Simple",ingredientes:["Medallón de carne","Lechuga","Tomate","Papas fritas"],modificaciones:true,aderezo:true,huevo:true,aji:true},
    {categoria:"hamburguesas",nombre:"Hamburguesa Especial Simple",ingredientes:["1 medallón de carne","Lechuga","Tomate","Jamón","Queso","Papas fritas"],modificaciones:true,aderezo:true,huevo:true,aji:true},
    {categoria:"hamburguesas",nombre:"Hamburguesa Especial Doble",ingredientes:["2 medallones de carne","Lechuga","Tomate","Jamón","Queso","Papas fritas"],modificaciones:true,aderezo:true,huevo:true,aji:true},

    {categoria:"platos",nombre:"Milanesa de carne AL PLATO",ingredientes:["Milanesa de carne"],guarnicion:true,modificaciones:true,huevo:true,aji:true},
    {categoria:"platos",nombre:"Milanesa de carne napolitana AL PLATO",ingredientes:["Milanesa de carne","Jamón","Queso"],guarnicion:true,modificaciones:true,huevo:true,aji:true},
    {categoria:"platos",nombre:"Milanesa de pollo AL PLATO",ingredientes:["Milanesa de pollo"],guarnicion:true,modificaciones:true,huevo:true,aji:true},
    {categoria:"platos",nombre:"Milanesa de pollo napolitana AL PLATO",ingredientes:["Milanesa de pollo","Jamón","Queso"],guarnicion:true,modificaciones:true,huevo:true,aji:true},
    {categoria:"platos",nombre:"Omelet",tipo:"cerrado"},

    {categoria:"miga",nombre:"Miga Jamón y Queso",tipo:"cerrado"},
    {categoria:"miga",nombre:"Miga Salame y Queso",tipo:"cerrado"},
    {categoria:"miga",nombre:"Miga Ternera y Queso",tipo:"cerrado"},

    {categoria:"baguettes",nombre:"Baguette Jamón y Queso",ingredientes:["Jamón","Queso"],modificaciones:true,aderezo:true,huevo:false,aji:false},
    {categoria:"baguettes",nombre:"Baguette Salame y Queso",ingredientes:["Salame","Queso"],modificaciones:true,aderezo:true,huevo:false,aji:false},
    {categoria:"baguettes",nombre:"Baguette Ternera y Queso",ingredientes:["Ternera","Queso"],modificaciones:true,aderezo:true,huevo:false,aji:false},

    {categoria:"tartas",nombre:"Tarta Jamón y Queso",tipo:"cerrado"},
    {categoria:"tartas",nombre:"Tarta Jamón, Queso y Huevo",tipo:"cerrado"},
    {categoria:"tartas",nombre:"Tarta de Verdura",tipo:"cerrado"},
    {categoria:"tartas",nombre:"Tarta Caprese",tipo:"cerrado"},

    {categoria:"pizzas",nombre:"Pizza Muzarella",tipo:"cerrado"},
    {categoria:"pizzas",nombre:"Pizza Especial",tipo:"cerrado"}
];

// =====================================================
// DESTINOS
// =====================================================

document.querySelectorAll(".destino, .destino-llevar").forEach(boton => {
    boton.addEventListener("click", () => seleccionarDestino(boton.dataset.destino, boton));
});

function seleccionarDestino(destino, boton) {
    document.querySelectorAll(".destino, .destino-llevar").forEach(b => b.classList.remove("seleccionado"));
    boton.classList.add("seleccionado");

    destinoSeleccionado = destino;

    document.getElementById("pedidoDestino").textContent = "Destino: " + destino;

    const esLlevar = destino === "Para llevar";
    document.getElementById("clienteBox").style.display = esLlevar ? "block" : "none";
    document.getElementById("retiroBox").style.display = esLlevar ? "block" : "none";

    if (!esLlevar) {
        modoRetiro = "ahora";
        document.getElementById("cliente").value = "";
        document.getElementById("programadoBox").classList.remove("visible");
        document.querySelectorAll(".retiro-opcion").forEach(b => b.classList.remove("activa"));
        document.querySelector('.retiro-opcion[data-modo="ahora"]').classList.add("activa");
    }
}

document.getElementById("botonMasMesas").addEventListener("click", () => {
    const mesas = document.getElementById("mesasExtra");
    const boton = document.getElementById("botonMasMesas");
    mesas.classList.toggle("visible");

    if (mesas.classList.contains("visible")) {
        boton.textContent = "− OCULTAR MESAS";
        boton.classList.add("activo");
    } else {
        boton.textContent = "+ MÁS MESAS";
        boton.classList.remove("activo");
    }
});

// =====================================================
// RETIRO
// =====================================================

document.querySelectorAll(".retiro-opcion").forEach(boton => {
    boton.addEventListener("click", () => {
        modoRetiro = boton.dataset.modo;

        document.querySelectorAll(".retiro-opcion").forEach(b => b.classList.remove("activa"));
        boton.classList.add("activa");

        document.getElementById("programadoBox")
            .classList.toggle("visible", modoRetiro === "programado");
    });
});

// =====================================================
// CATEGORÍAS
// =====================================================

document.querySelectorAll(".categoria").forEach(boton => {
    boton.addEventListener("click", () => {
        document.querySelectorAll(".categoria").forEach(b => b.classList.remove("seleccionada"));
        boton.classList.add("seleccionada");
        mostrarProductos(boton.dataset.categoria);
    });
});

function mostrarProductos(categoria) {
    const contenedor = document.getElementById("productos");
    contenedor.innerHTML = "";

    productos.filter(p => p.categoria === categoria).forEach(producto => {
        const boton = document.createElement("button");
        boton.className = "producto";
        boton.textContent = producto.nombre;
        boton.addEventListener("click", () => abrirConfiguracion(producto));
        contenedor.appendChild(boton);
    });
}

// =====================================================
// MODAL
// =====================================================

function abrirConfiguracion(producto, existente = null, indice = null) {
    productoConfigurando = producto;
    editandoProductoIndex = indice;

    cantidadConfigurando = existente
        ? existente.cantidad
        : producto.tipo === "empanada" ? 0 : 1;

    const contenido = document.getElementById("modalContenido");
    contenido.innerHTML = "";

    document.getElementById("modalTitulo").textContent =
        editandoProductoIndex !== null ? "Editar " + producto.nombre : producto.nombre;

    const cantidadTitulo = document.createElement("div");
    cantidadTitulo.className = "subtitulo";
    cantidadTitulo.textContent = "Cantidad";
    contenido.appendChild(cantidadTitulo);

    const cantidadBox = document.createElement("div");
    cantidadBox.style.cssText = "display:flex;align-items:center;justify-content:center;gap:15px;margin-bottom:20px";

    const menos = document.createElement("button");
    menos.textContent = "−";
    menos.style.cssText = "font-size:25px;padding:8px 18px";

    const numero = document.createElement("span");
    numero.id = "cantidadNumero";
    numero.textContent = cantidadConfigurando;
    numero.style.cssText = "font-size:28px;font-weight:bold;min-width:45px;text-align:center";

    const mas = document.createElement("button");
    mas.textContent = "+";
    mas.style.cssText = "font-size:25px;padding:8px 18px";

    menos.addEventListener("click", () => {
        if (cantidadConfigurando > 0) {
            cantidadConfigurando--;
            numero.textContent = cantidadConfigurando;
        }
    });

    mas.addEventListener("click", () => {
        cantidadConfigurando++;
        numero.textContent = cantidadConfigurando;
    });

    cantidadBox.append(menos, numero, mas);
    contenido.appendChild(cantidadBox);

    if (producto.tipo === "empanada") {
        const rapidos = document.createElement("div");
        rapidos.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px";

        [6,12].forEach(valor => {
            const b = document.createElement("button");
            b.textContent = "+ " + valor;
            b.className = "rapido";
            b.addEventListener("click", () => {
                cantidadConfigurando += valor;
                numero.textContent = cantidadConfigurando;
            });
            rapidos.appendChild(b);
        });

        contenido.appendChild(rapidos);

        const subtitulo = document.createElement("div");
        subtitulo.className = "preparacion-titulo";
        subtitulo.textContent = "PREPARACIÓN DE LA EMPANADA";
        contenido.appendChild(subtitulo);

        const preparacion = document.createElement("div");
        preparacion.className = "guarniciones";

        ["HORNEADAS","CRUDAS"].forEach(tipo => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "guarnicion";
            b.dataset.preparacion = tipo;
            b.textContent = tipo;

            if ((existente?.preparacion || "HORNEADAS") === tipo) {
                b.classList.add("seleccionada");
            }

            b.addEventListener("click", () => {
                preparacion.querySelectorAll(".guarnicion").forEach(x => x.classList.remove("seleccionada"));
                b.classList.add("seleccionada");
            });

            preparacion.appendChild(b);
        });

        contenido.appendChild(preparacion);
    }

    if (producto.ingredientes && producto.modificaciones) {
        const receta = document.createElement("div");
        receta.className = "receta";
        receta.textContent = "Desmarcá solamente lo que el cliente quiera sacar.";
        contenido.appendChild(receta);

        const subtitulo = document.createElement("div");
        subtitulo.className = "subtitulo";
        subtitulo.textContent = "Ingredientes";
        contenido.appendChild(subtitulo);

        producto.ingredientes.forEach(ingrediente => {
            const opcion = document.createElement("label");
            opcion.className = "opcion";

            const checked = existente
                ? !existente.modificaciones.includes("Sin " + ingrediente)
                : true;

            opcion.innerHTML = `
                <input type="checkbox" class="ingrediente" data-ingrediente="${escapeHtml(ingrediente)}" ${checked ? "checked" : ""}>
                <span>${escapeHtml(ingrediente)}</span>
            `;

            contenido.appendChild(opcion);
        });
    }

    if (producto.guarnicion) {
        const subtitulo = document.createElement("div");
        subtitulo.className = "subtitulo";
        subtitulo.textContent = "Guarnición";
        contenido.appendChild(subtitulo);

        const guarniciones = document.createElement("div");
        guarniciones.className = "guarniciones";

        ["Papas fritas","Ensalada"].forEach(nombre => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "guarnicion";
            b.dataset.guarnicion = nombre;
            b.textContent = nombre;

            if (existente?.guarnicion === nombre) b.classList.add("seleccionada");

            b.addEventListener("click", () => {
                guarniciones.querySelectorAll(".guarnicion").forEach(x => x.classList.remove("seleccionada"));
                b.classList.add("seleccionada");
            });

            guarniciones.appendChild(b);
        });

        contenido.appendChild(guarniciones);
    }

    if (producto.aderezo) {
        const opcion = document.createElement("label");
        opcion.className = "opcion";
        const marcado = existente?.modificaciones.includes("SIN ADEREZO");
        opcion.innerHTML = `
            <input type="checkbox" id="sinAderezo" ${marcado ? "checked" : ""}>
            <span>SIN ADEREZO</span>
        `;
        contenido.appendChild(opcion);
    }

    if (producto.huevo) {
        const opcion = document.createElement("label");
        opcion.className = "opcion";
        const marcado = existente?.adicionales.includes("Huevo");
        opcion.innerHTML = `
            <input type="checkbox" id="agregarHuevo" ${marcado ? "checked" : ""}>
            <span>+ Huevo</span>
        `;
        contenido.appendChild(opcion);
    }

    if (producto.aji) {
        const opcion = document.createElement("label");
        opcion.className = "opcion";
        const marcado = existente?.adicionales.includes("Ají");
        opcion.innerHTML = `
            <input type="checkbox" id="agregarAji" ${marcado ? "checked" : ""}>
            <span>+ Ají</span>
        `;
        contenido.appendChild(opcion);
    }

    document.getElementById("confirmarModal").textContent =
        editandoProductoIndex !== null ? "Guardar cambios" : "Agregar";

    document.getElementById("modalFondo").style.display = "flex";
}

function cerrarModal() {
    document.getElementById("modalFondo").style.display = "none";
    productoConfigurando = null;
    editandoProductoIndex = null;
}

document.getElementById("cancelarModal").addEventListener("click", cerrarModal);

document.getElementById("confirmarModal").addEventListener("click", () => {
    if (!productoConfigurando) return;

    if (cantidadConfigurando <= 0) {
        alert("La cantidad debe ser mayor a 0.");
        return;
    }

    const producto = productoConfigurando;
    const modificaciones = [];
    const adicionales = [];

    document.querySelectorAll(".ingrediente").forEach(input => {
        if (!input.checked) modificaciones.push("Sin " + input.dataset.ingrediente);
    });

    const seleccionada = document.querySelector(".guarnicion.seleccionada");
    let guarnicion = null;

    if (producto.guarnicion) {
        if (!seleccionada) {
            alert("Tenés que elegir Papas fritas o Ensalada.");
            return;
        }
        guarnicion = seleccionada.dataset.guarnicion;
    }

    const sinAderezo = document.getElementById("sinAderezo");
    if (sinAderezo?.checked) modificaciones.push("SIN ADEREZO");

    const huevo = document.getElementById("agregarHuevo");
    if (huevo?.checked) adicionales.push("Huevo");

    const aji = document.getElementById("agregarAji");
    if (aji?.checked) adicionales.push("Ají");

    let preparacion = null;
    if (producto.tipo === "empanada") {
        preparacion = document.querySelector("[data-preparacion].seleccionada")?.dataset.preparacion || "HORNEADAS";
    }

    const final = {
        nombre: producto.nombre,
        cantidad: cantidadConfigurando,
        modificaciones,
        adicionales,
        guarnicion,
        preparacion
    };

    if (editandoProductoIndex !== null) {
        pedidoActual[editandoProductoIndex] = final;
    } else {
        agregarProducto(final);
    }

    cerrarModal();
    mostrarPedido();
});

function agregarProducto(producto) {
    const existente = pedidoActual.find(item =>
        item.nombre === producto.nombre &&
        JSON.stringify(item.modificaciones) === JSON.stringify(producto.modificaciones) &&
        JSON.stringify(item.adicionales) === JSON.stringify(producto.adicionales) &&
        item.guarnicion === producto.guarnicion &&
        item.preparacion === producto.preparacion
    );

    if (existente) existente.cantidad += producto.cantidad;
    else pedidoActual.push(producto);
}

function mostrarPedido() {
    const lista = document.getElementById("listaPedido");
    lista.innerHTML = "";

    if (!pedidoActual.length) {
        lista.innerHTML = "<p>No hay productos agregados.</p>";
        actualizarDemoraEmpanadas();
        return;
    }

    pedidoActual.forEach((producto, index) => {
        const div = document.createElement("div");
        div.className = "item-pedido";

        let detalles = [];

        if (producto.preparacion) {
            detalles.push(producto.preparacion);
        }

        if (producto.guarnicion) {
            detalles.push("Guarnición: " + producto.guarnicion);
        }

        detalles.push(...(producto.modificaciones || []));
        detalles.push(
            ...(producto.adicionales || []).map(a => "+ " + a)
        );

        div.innerHTML = `
            <strong>${producto.cantidad} × ${escapeHtml(producto.nombre)}</strong>
            ${
                detalles.length
                    ? `<div class="modificaciones">${detalles.map(escapeHtml).join("<br>")}</div>`
                    : ""
            }
            <button class="editar" onclick="editarProducto(${index})">
                Editar
            </button>
            <button class="eliminar" onclick="eliminarProducto(${index})">
                Eliminar
            </button>
        `;

        lista.appendChild(div);
    });

    actualizarDemoraEmpanadas();
}
function editarProducto(index) {
    const pedido = pedidoActual[index];
    const producto = productos.find(p => p.nombre === pedido.nombre);
    if (producto) abrirConfiguracion(producto,pedido,index);
}

function eliminarProducto(index) {
    pedidoActual.splice(index,1);
    mostrarPedido();
}

// =====================================================
// ENVIAR
// =====================================================

document.getElementById("enviar").addEventListener("click", async () => {
    const mensaje = document.getElementById("mensaje");

    if (!destinoSeleccionado) {
        mensaje.textContent = "⚠️ Seleccioná una mesa o Para llevar.";
        return;
    }

    if (!pedidoActual.length) {
        mensaje.textContent = "⚠️ Agregá un producto.";
        return;
    }

    let cliente = "";
    if (destinoSeleccionado === "Para llevar") {
        cliente = document.getElementById("cliente").value.trim();

        if (!cliente) {
            mensaje.textContent = "⚠️ Ingresá el nombre del cliente.";
            document.getElementById("cliente").focus();
            return;
        }
    }

    let retiroFecha = null;
    let retiroHora = null;

    if (destinoSeleccionado === "Para llevar" && modoRetiro === "programado") {
        retiroFecha = document.getElementById("retiroFecha").value;
        retiroHora = document.getElementById("retiroHora").value;

        if (!retiroFecha || !retiroHora) {
            mensaje.textContent = "⚠️ Indicá la fecha y hora de retiro.";
            return;
        }

        const fecha = new Date(`${retiroFecha}T${retiroHora}:00`);
        if (fecha <= new Date()) {
            mensaje.textContent = "⚠️ El horario programado debe ser futuro.";
            return;
        }
    }

    try {
        const respuesta = await fetch("/api/pedidos",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                destino:destinoSeleccionado,
                cliente,
                modoRetiro,
                retiroFecha,
                retiroHora,
                productos:pedidoActual,
                observacion:document.getElementById("observacion").value.trim()
            })
        });

        const resultado = await respuesta.json();

        if (!resultado.ok) {
            mensaje.textContent = "⚠️ " + resultado.mensaje;
            return;
        }

        const pedidoCreado = resultado.pedido;
        const textoConfirmacion = resultado.demoraEmpanadas > 0
            ? `🥟 Pedido #${pedidoCreado.numero} enviado a cocina. Demora estimada de empanadas: ${resultado.demoraEmpanadas} minutos.`
            : `✅ Pedido #${pedidoCreado.numero} enviado a cocina.`;

        mensaje.textContent = textoConfirmacion;

        const deseaImprimir = confirm(
            `Pedido #${pedidoCreado.numero} enviado a cocina.\n\n¿Deseás imprimir el ticket para el cliente?`
        );

        if (deseaImprimir) {
            imprimirTicket(pedidoCreado);
        }

        pedidoActual = [];
        destinoSeleccionado = null;
        modoRetiro = "ahora";

        document.querySelectorAll(".destino,.destino-llevar").forEach(b => b.classList.remove("seleccionado"));
        document.getElementById("pedidoDestino").textContent = "Seleccioná una mesa o Para llevar";
        document.getElementById("cliente").value = "";
        document.getElementById("observacion").value = "";
        document.getElementById("retiroFecha").value = "";
        document.getElementById("retiroHora").value = "";
        document.getElementById("clienteBox").style.display = "none";
        document.getElementById("retiroBox").style.display = "none";
        document.getElementById("programadoBox").classList.remove("visible");
        document.querySelectorAll(".retiro-opcion").forEach(b => b.classList.remove("activa"));
        document.querySelector('.retiro-opcion[data-modo="ahora"]').classList.add("activa");

        mostrarPedido();
    } catch (error) {
        console.error(error);
        mensaje.textContent = "❌ No se pudo enviar el pedido.";
    }
});

function escapeHtml(text) {
    return String(text ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}

function formatearFechaHoraTicket(fecha) {
    if (!fecha) return "";

    return new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(fecha));
}

function construirDetalleTicket(producto) {
    const detalles = [];

    if (producto.preparacion) detalles.push(producto.preparacion);
    if (producto.guarnicion) detalles.push("Guarnición: " + producto.guarnicion);
    detalles.push(...(producto.modificaciones || []));
    detalles.push(...(producto.adicionales || []).map(a => "+ " + a));

    return detalles;
}

function imprimirTicket(pedido) {
    if (!pedido) return;

    const ventana = window.open("", "_blank", "width=420,height=700");

    if (!ventana) {
        alert("El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes para este sitio.");
        return;
    }

    const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
    const fechaHora = formatearFechaHoraTicket(pedido.creadoAt);
    const partesFecha = fechaHora.split(", ");
    const fecha = partesFecha[0] || "";
    const hora = partesFecha[1] || "";

    const productosHtml = productos.map(producto => {
        const detalles = construirDetalleTicket(producto);

        return `
            <div class="producto">
                <div><strong>${Number(producto.cantidad) || 0} ×</strong> ${escapeHtml(producto.nombre || "")}</div>
                ${detalles.length ? `<div class="detalle">${detalles.map(escapeHtml).join("<br>")}</div>` : ""}
            </div>
        `;
    }).join("");

    const retiro = pedido.modoRetiro === "programado" && pedido.retiroAt
        ? `<div class="bloque"><strong>RETIRO PROGRAMADO</strong><br>${escapeHtml(formatearFechaHoraTicket(pedido.retiroAt))}</div>`
        : `<div class="bloque"><strong>${escapeHtml(pedido.modoRetiro === "ahora" ? "PARA LLEVAR" : pedido.modoRetiro || "")}</strong></div>`;

    ventana.document.write(`
        <!doctype html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>Pedido #${escapeHtml(pedido.numero)}</title>
            <style>
                @page { size: 58mm auto; margin: 0; }
                * { box-sizing: border-box; }
                html, body { margin: 0; padding: 0; width: 58mm; }
                body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.35; padding: 4mm 3mm; color: #000; }
                .cabecera { text-align: center; font-weight: 900; font-size: 15px; margin-bottom: 8px; }
                .numero { text-align: center; font-weight: 900; font-size: 22px; margin: 5px 0 8px; }
                .fecha { text-align: center; font-size: 11px; margin-bottom: 8px; }
                .cliente { font-size: 15px; font-weight: 900; text-align: center; margin: 8px 0; }
                .separador { border-top: 1px dashed #000; margin: 8px 0; }
                .producto { margin: 7px 0; }
                .detalle { font-size: 10px; margin: 2px 0 0 16px; }
                .bloque { text-align: center; margin: 8px 0; font-size: 12px; }
                .observacion { margin-top: 8px; font-size: 11px; }
                .pie { text-align: center; font-size: 10px; margin-top: 12px; }
            </style>
        </head>
        <body>
            <div class="cabecera">DRUGSTORE LA ROTONDA</div>
            <div class="separador"></div>
            <div class="numero">PEDIDO #${escapeHtml(pedido.numero)}</div>
            <div class="fecha">FECHA: ${escapeHtml(fecha)}<br>HORA: ${escapeHtml(hora)}</div>
            ${pedido.cliente ? `<div class="cliente">${escapeHtml(pedido.cliente)}</div>` : ""}
            <div class="separador"></div>
            ${productosHtml || "<div>Sin productos</div>"}
            ${pedido.observacion ? `<div class="observacion"><strong>OBSERVACIÓN:</strong><br>${escapeHtml(pedido.observacion)}</div>` : ""}
            ${retiro}
            <div class="separador"></div>
            <div class="pie">GRACIAS POR SU COMPRA</div>
        </body>
        </html>
    `);

    ventana.document.close();
    ventana.focus();

    setTimeout(() => {
        ventana.print();
        ventana.close();
    }, 250);
}

document.querySelector('.categoria[data-categoria="empanadas"]').click();
mostrarPedido();

// Cerrar sesión desde Comandas
const botonCerrarSesion = document.getElementById("cerrarSesion");
if (botonCerrarSesion) {
    botonCerrarSesion.addEventListener("click", async () => {
        botonCerrarSesion.disabled = true;
        botonCerrarSesion.textContent = "Cerrando...";
        try {
            await fetch("/api/logout", { method: "POST" });
        } finally {
            window.location.href = "/login.html?redirect=/";
        }
    });
}

// =====================================================
// =====================================================
// PEDIDOS DE HOY + HISTORIAL - COMANDAS
// =====================================================
let pedidosHoy = [];
let historialPedidos = [];
let fechaHistorialSeleccionada = null;

function fechaOperativaCliente() {
    const ahora = new Date();
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", hour12: false
    }).formatToParts(ahora);
    const obtener = tipo => partes.find(p => p.type === tipo)?.value;
    const hora = Number(obtener("hour"));
    const base = new Date(`${obtener("year")}-${obtener("month")}-${obtener("day")}T12:00:00-03:00`);
    if (hora < 2) base.setDate(base.getDate() - 1);
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(base);
}

function formatearFechaOperativa(fecha) {
    const [y,m,d] = fecha.split("-");
    return `${d}/${m}/${y}`;
}

function obtenerContenedorPedidosHoy() {
    const contenedor = document.getElementById("pedidosHoyLista");
    if (contenedor) return contenedor;

    console.error("No existe #pedidosHoyLista en index.html.");
    return null;
}

function obtenerContenedorHistorial() {
    let historial = document.getElementById("historialPedidosLista");
    if (historial) return historial;

    const box = document.getElementById("pedidosHoyBox");
    if (!box) return null;

    const titulo = document.createElement("div");
    titulo.id = "historialPedidosTitulo";
    titulo.style.cssText = "font-size:18px;font-weight:800;margin:18px 0 10px;";
    titulo.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <span>📋 HISTORIAL · <span id="historialPedidosFechaTexto">HOY</span> · <span id="historialPedidosCantidad">0</span></span>
            <span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;">
                <input id="historialFecha" type="date" style="padding:6px 8px;border:1px solid #ccc;border-radius:7px;font:inherit;">
                <button id="historialHoy" type="button" style="padding:6px 9px;border:1px solid #bbb;border-radius:7px;background:#fff;cursor:pointer;font-weight:700;">HOY</button>
            </span>
        </div>`;

    historial = document.createElement("div");
    historial.id = "historialPedidosLista";

    box.appendChild(titulo);
    box.appendChild(historial);

    const fechaInput = document.getElementById("historialFecha");
    const botonHoy = document.getElementById("historialHoy");
    fechaHistorialSeleccionada = fechaOperativaCliente();
    if (fechaInput) fechaInput.value = fechaHistorialSeleccionada;

    if (fechaInput) {
        fechaInput.addEventListener("change", () => {
            fechaHistorialSeleccionada = fechaInput.value || fechaOperativaCliente();
            cargarHistorialPedidos(fechaHistorialSeleccionada);
        });
    }
    if (botonHoy) {
        botonHoy.addEventListener("click", () => {
            fechaHistorialSeleccionada = fechaOperativaCliente();
            if (fechaInput) fechaInput.value = fechaHistorialSeleccionada;
            cargarHistorialPedidos(fechaHistorialSeleccionada);
        });
    }

    return historial;
}

function mostrarPedidosHoy() {
    const contenedor = obtenerContenedorPedidosHoy();
    if (!contenedor) return;

    const activos = [...pedidosHoy].sort((a, b) => Number(a.numero) - Number(b.numero));

    if (!activos.length) {
        contenedor.innerHTML = `
            <div style="padding:12px;background:#f5f5f5;border-radius:10px;color:#777;text-align:center;">
                No hay pedidos activos.
            </div>
        `;
        return;
    }

    contenedor.innerHTML = activos.map(pedido => {
        const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
        const estadoTexto = {
            pendiente: "POR PREPARAR",
            en_marcha: "EN MARCHA",
            listo: "LISTO"
        }[pedido.estado] || pedido.estado;
        const estadoColor = {
            pendiente: "#fff3cd",
            en_marcha: "#dbeafe",
            listo: "#dcfce7"
        }[pedido.estado] || "#f5f5f5";

        return `
            <div style="border:1px solid #ddd;border-radius:12px;padding:12px;margin-bottom:10px;background:white;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
                    <strong style="font-size:20px;">#${pedido.numero}</strong>
                    <span style="background:${estadoColor};padding:5px 8px;border-radius:7px;font-size:12px;font-weight:800;">${estadoTexto}</span>
                </div>
                <div style="font-weight:700;margin-bottom:6px;">
                    ${escapeHtml(pedido.destino || "")}${pedido.cliente ? " — " + escapeHtml(pedido.cliente) : ""}
                </div>
                <div style="font-size:14px;line-height:1.4;margin-bottom:8px;">
                    ${productos.map(producto => `<div><strong>${producto.cantidad} ×</strong> ${escapeHtml(producto.nombre || "")}</div>`).join("")}
                </div>
                ${pedido.observacion ? `<div style="background:#fff7ed;border-left:4px solid #f97316;padding:7px;margin-bottom:8px;font-size:13px;"><strong>Obs.:</strong> ${escapeHtml(pedido.observacion)}</div>` : ""}
                ${pedido.estado === "listo" ? `<button type="button" onclick="marcarEntregadoDesdeComandas(${pedido.id})" style="width:100%;padding:10px;border:0;border-radius:8px;background:#15803d;color:white;font-weight:800;cursor:pointer;">📦 PEDIDO ENTREGADO</button>` : ""}
                <button type="button" onclick="anularPedidoDesdeComandas(${pedido.id}, ${pedido.numero})" style="width:100%;padding:9px;border:0;border-radius:8px;background:#dc2626;color:white;font-weight:800;cursor:pointer;margin-top:8px;">ANULAR PEDIDO</button>
            </div>
        `;
    }).join("");
}

function escaparTextoHistorial(valor) {
    return escapeHtml(String(valor ?? ""));
}

let pedidosHistorialExpandidos = new Set();

function alternarDetalleHistorial(id) {
    if (pedidosHistorialExpandidos.has(id)) {
        pedidosHistorialExpandidos.delete(id);
    } else {
        pedidosHistorialExpandidos.add(id);
    }
    mostrarHistorialPedidos();
}

function formatoFechaHoraHistorial(iso) {
    if (!iso) return "—";

    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return "—";

    return fecha.toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function obtenerContenedorEstadisticasComida() {
    let contenedor = document.getElementById("estadisticasComidaHoy");
    if (contenedor) return contenedor;

    const box = document.getElementById("pedidosHoyBox");
    if (!box) return null;

    contenedor = document.createElement("div");
    contenedor.id = "estadisticasComidaHoy";
    contenedor.style.cssText = "margin-top:18px;padding-top:16px;border-top:1px solid #ddd;";
    box.appendChild(contenedor);

    return contenedor;
}

function mostrarEstadisticasComida(datos) {
    const contenedor = obtenerContenedorEstadisticasComida();
    if (!contenedor) return;

    if (!datos || !datos.ok) {
        contenedor.innerHTML = `
            <div style="font-size:18px;font-weight:800;margin-bottom:10px;">🍽️ COMIDA VENDIDA HOY</div>
            <div style="padding:10px;background:#f5f5f5;border-radius:10px;color:#777;text-align:center;">
                No se pudieron cargar las estadísticas.
            </div>
        `;
        return;
    }

    const productos = Array.isArray(datos.productosVendidos)
        ? datos.productosVendidos
        : [];

    contenedor.innerHTML = `
        <div style="font-size:18px;font-weight:800;margin-bottom:10px;">🍽️ COMIDA VENDIDA HOY</div>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;">
            <div style="padding:10px;background:#f5f5f5;border-radius:10px;text-align:center;">
                <div style="font-size:12px;color:#666;font-weight:700;">PEDIDOS ENTREGADOS</div>
                <div style="font-size:24px;font-weight:900;">${Number(datos.totalPedidosEntregados) || 0}</div>
            </div>
            <div style="padding:10px;background:#f5f5f5;border-radius:10px;text-align:center;">
                <div style="font-size:12px;color:#666;font-weight:700;">UNIDADES VENDIDAS</div>
                <div style="font-size:24px;font-weight:900;">${Number(datos.totalUnidades) || 0}</div>
            </div>
        </div>

        ${productos.length ? `
            <div style="border:1px solid #ddd;border-radius:10px;background:#fff;overflow:hidden;">
                ${productos.map(producto => `
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 11px;border-bottom:1px solid #eee;">
                        <span style="font-weight:700;">${escaparTextoHistorial(producto.nombre)}</span>
                        <strong style="font-size:18px;white-space:nowrap;">${Number(producto.cantidad) || 0} ×</strong>
                    </div>
                `).join("")}
            </div>
        ` : `
            <div style="padding:10px;background:#f5f5f5;border-radius:10px;color:#777;text-align:center;">
                Todavía no hay comida vendida registrada.
            </div>
        `}
    `;
}

async function cargarEstadisticasComida() {
    try {
        const respuesta = await fetch("/api/estadisticas/comida-hoy");
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            console.error("Error cargando estadísticas de comida:", resultado);
            mostrarEstadisticasComida({ ok: false });
            return;
        }

        mostrarEstadisticasComida(resultado);
    } catch (error) {
        console.error("Error cargando estadísticas de comida:", error);
        mostrarEstadisticasComida({ ok: false });
    }
}

function mostrarHistorialPedidos() {
    const historial = obtenerContenedorHistorial();
    if (!historial) return;

    const cantidad = document.getElementById("historialPedidosCantidad");
    const lista = [...historialPedidos].sort((a, b) => Number(b.numero) - Number(a.numero));
    const limite = 5;
    const mostrandoTodos = historial.dataset.mostrandoTodos === "true";
    const visibles = mostrandoTodos ? lista : lista.slice(0, limite);

    if (cantidad) cantidad.textContent = lista.length;
    const fechaTexto = document.getElementById("historialPedidosFechaTexto");
    if (fechaTexto) {
        const hoy = fechaOperativaCliente();
        fechaTexto.textContent = fechaHistorialSeleccionada === hoy
            ? "HOY"
            : formatearFechaOperativa(fechaHistorialSeleccionada);
    }

    if (!lista.length) {
        historial.innerHTML = `<div style="padding:12px;background:#f5f5f5;border-radius:10px;color:#777;text-align:center;">Todavía no hay pedidos finalizados.</div>`;
        return;
    }

    historial.innerHTML = `
        <div style="max-height:360px;overflow-y:auto;padding-right:3px;">
            ${visibles.map(pedido => {
                const expandido = pedidosHistorialExpandidos.has(pedido.id);
                const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
                const esAnulado = pedido.estado === "anulado";
                const estado = esAnulado ? "❌ ANULADO" : "✅ ENTREGADO";

                return `
                    <div style="border:1px solid #ddd;border-radius:10px;margin-bottom:8px;background:#fafafa;overflow:hidden;">
                        <button type="button"
                            onclick="alternarDetalleHistorial(${pedido.id})"
                            style="width:100%;border:0;background:transparent;padding:11px;text-align:left;cursor:pointer;font:inherit;">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                <div>
                                    <strong style="font-size:16px;">#${pedido.numero}</strong>
                                    <span style="margin-left:8px;font-size:12px;font-weight:800;">${estado}</span>
                                </div>
                                <span style="font-size:16px;color:#666;">${expandido ? "▲" : "▼"}</span>
                            </div>
                            <div style="font-size:13px;margin-top:4px;color:#444;">
                                ${escaparTextoHistorial(pedido.destino || "")}${pedido.cliente ? " — " + escaparTextoHistorial(pedido.cliente) : ""}
                            </div>
                        </button>

                        ${expandido ? `
                            <div style="border-top:1px solid #e1e1e1;padding:11px;background:#fff;">
                                <div style="font-size:13px;font-weight:800;margin-bottom:7px;">DETALLE DEL PEDIDO</div>

                                <div style="display:grid;gap:6px;margin-bottom:10px;font-size:13px;">
                                    <div style="padding:7px 9px;background:#f5f5f5;border-radius:7px;">
                                        <strong>Creado:</strong> ${formatoFechaHoraHistorial(pedido.creadoAt)}
                                    </div>
                                    ${esAnulado ? `
                                        <div style="padding:8px 9px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:7px;font-weight:800;">
                                            <strong>Anulado:</strong> ${formatoFechaHoraHistorial(pedido.anuladoAt)}
                                        </div>
                                    ` : `
                                        <div style="padding:8px 9px;background:#dcfce7;border-left:4px solid #16a34a;border-radius:7px;font-weight:900;">
                                            <strong>ENTREGADO:</strong> ${formatoFechaHoraHistorial(pedido.entregadoAt)}
                                        </div>
                                    `}
                                </div>

                                <div style="font-size:14px;line-height:1.55;">
                                    ${productos.length ? productos.map(producto => `
                                        <div style="padding:7px 0;border-bottom:1px solid #eee;">
                                            <div><strong>${Number(producto.cantidad) || 0} ×</strong> ${escaparTextoHistorial(producto.nombre || "")}</div>
                                            ${Array.isArray(producto.modificaciones) && producto.modificaciones.length ? `<div style="font-size:12px;color:#b45309;margin-top:2px;">Modificaciones: ${producto.modificaciones.map(escaparTextoHistorial).join(", ")}</div>` : ""}
                                            ${Array.isArray(producto.adicionales) && producto.adicionales.length ? `<div style="font-size:12px;color:#166534;margin-top:2px;">Adicionales: ${producto.adicionales.map(escaparTextoHistorial).join(", ")}</div>` : ""}
                                            ${producto.guarnicion ? `<div style="font-size:12px;color:#555;margin-top:2px;">Guarnición: ${escaparTextoHistorial(producto.guarnicion)}</div>` : ""}
                                            ${producto.preparacion ? `<div style="font-size:12px;color:#555;margin-top:2px;">Preparación: ${escaparTextoHistorial(producto.preparacion)}</div>` : ""}
                                        </div>
                                    `).join("") : `<div style="color:#777;">Sin productos registrados.</div>`}
                                </div>

                                ${pedido.observacion ? `<div style="margin-top:9px;padding:8px;background:#fff7ed;border-left:4px solid #f97316;font-size:13px;"><strong>Observación:</strong> ${escaparTextoHistorial(pedido.observacion)}</div>` : ""}
                                ${pedido.cliente ? `<div style="margin-top:8px;font-size:13px;"><strong>Cliente:</strong> ${escaparTextoHistorial(pedido.cliente)}</div>` : ""}
                                <div style="margin-top:4px;font-size:13px;"><strong>Destino:</strong> ${escaparTextoHistorial(pedido.destino || "")}</div>

                                ${!esAnulado ? `
                                    <button type="button"
                                        onclick="corregirEntregaDesdeHistorial(${pedido.id}, ${pedido.numero})"
                                        style="width:100%;padding:10px;margin-top:12px;border:1px solid #f59e0b;border-radius:8px;background:#fffbeb;color:#92400e;font-weight:900;cursor:pointer;">
                                        ↩ CORREGIR ENTREGA
                                    </button>
                                ` : ""}
                            </div>
                        ` : ""}
                    </div>
                `;
            }).join("")}
        </div>
        ${lista.length > limite ? `
            <button type="button" id="botonVerTodosPedidos" style="width:100%;padding:10px;margin-top:4px;border:1px solid #bbb;border-radius:8px;background:#fff;font-weight:800;cursor:pointer;">
                ${mostrandoTodos ? "OCULTAR PEDIDOS ANTERIORES" : `VER TODOS LOS PEDIDOS (${lista.length})`}
            </button>
        ` : ""}
    `;

    const boton = document.getElementById("botonVerTodosPedidos");
    if (boton) {
        boton.addEventListener("click", () => {
            historial.dataset.mostrandoTodos = mostrandoTodos ? "false" : "true";
            mostrarHistorialPedidos();
        });
    }
}

async function cargarPedidosHoy() {
    try {
        const respuesta = await fetch("/api/pedidos");
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            console.error("Error cargando pedidos activos:", resultado);
            return;
        }

        pedidosHoy = Array.isArray(resultado) ? resultado : (resultado.pedidos || []);
        mostrarPedidosHoy();
    } catch (error) {
        console.error("Error cargando pedidos activos:", error);
    }
}

async function cargarHistorialPedidos(fecha = null) {
    try {
        const fechaSeleccionada = fecha || fechaHistorialSeleccionada || fechaOperativaCliente();
        fechaHistorialSeleccionada = fechaSeleccionada;
        const respuesta = await fetch(`/api/pedidos/historial?fecha=${encodeURIComponent(fechaSeleccionada)}`);
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            console.error("Error cargando historial:", resultado);
            return;
        }

        historialPedidos = Array.isArray(resultado) ? resultado : (resultado.pedidos || []);
        mostrarHistorialPedidos();
    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

async function marcarEntregadoDesdeComandas(id) {
    try {
        const respuesta = await fetch(`/api/pedidos/${id}/entregado`, { method: "POST" });
        const resultado = await respuesta.json();

        if (!resultado.ok) {
            alert(resultado.mensaje || "No se pudo marcar el pedido como entregado.");
            return;
        }

        const pedidoEntregado = resultado.pedido;
        if (pedidoEntregado) {
            pedidosHoy = pedidosHoy.filter(pedido => pedido.id !== pedidoEntregado.id);
            historialPedidos = [
                pedidoEntregado,
                ...historialPedidos.filter(pedido => pedido.id !== pedidoEntregado.id)
            ];
            mostrarPedidosHoy();
            mostrarHistorialPedidos();
            cargarEstadisticasComida();
        } else {
            await Promise.all([cargarPedidosHoy(), cargarHistorialPedidos(), cargarEstadisticasComida()]);
        }
    } catch (error) {
        console.error(error);
        alert("No se pudo conectar con el servidor.");
    }
}

async function corregirEntregaDesdeHistorial(id, numero) {
    const confirmar = confirm(
        `¿Corregir la entrega del pedido #${numero}?\n\n` +
        "El pedido volverá a LISTO y podrá entregarse nuevamente."
    );

    if (!confirmar) return;

    try {
        const respuesta = await fetch(`/api/pedidos/${id}/corregir-entrega`, {
            method: "POST"
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            alert(resultado.mensaje || "No se pudo corregir la entrega.");
            return;
        }

        const pedidoCorregido = resultado.pedido;

        if (pedidoCorregido) {
            historialPedidos = historialPedidos.filter(
                pedido => pedido.id !== pedidoCorregido.id
            );

            pedidosHoy = [
                pedidoCorregido,
                ...pedidosHoy.filter(pedido => pedido.id !== pedidoCorregido.id)
            ];

            mostrarPedidosHoy();
            mostrarHistorialPedidos();
            cargarEstadisticasComida();
        } else {
            await Promise.all([
                cargarPedidosHoy(),
                cargarHistorialPedidos(),
                cargarEstadisticasComida()
            ]);
        }

    } catch (error) {
        console.error(error);
        alert("No se pudo conectar con el servidor.");
    }
}

async function anularPedidoDesdeComandas(id, numero) {
    const confirmar = confirm(`¿Anular el pedido #${numero}?\n\nEl pedido saldrá de la operación y quedará registrado como ANULADO. Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    try {
        const respuesta = await fetch(`/api/pedidos/${id}/anular`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ motivo: "" })
        });
        const resultado = await respuesta.json();

        if (!resultado.ok) {
            alert(resultado.mensaje || "No se pudo anular el pedido.");
            return;
        }

        const pedidoAnulado = resultado.pedido;
        if (pedidoAnulado) {
            pedidosHoy = pedidosHoy.filter(pedido => pedido.id !== pedidoAnulado.id);
            historialPedidos = [
                pedidoAnulado,
                ...historialPedidos.filter(pedido => pedido.id !== pedidoAnulado.id)
            ];
            mostrarPedidosHoy();
            mostrarHistorialPedidos();
            cargarEstadisticasComida();
        } else {
            await Promise.all([cargarPedidosHoy(), cargarHistorialPedidos(), cargarEstadisticasComida()]);
        }
    } catch (error) {
        console.error(error);
        alert("No se pudo conectar con el servidor.");
    }
}

function conectarPedidosHoyTiempoReal() {
    const fuente = new EventSource("/api/cocina");

    fuente.onmessage = event => {
        try {
            const data = JSON.parse(event.data);

            if (data.tipo === "inicio") {
                pedidosHoy = Array.isArray(data.pedidos) ? data.pedidos : [];
                mostrarPedidosHoy();
                return;
            }

            if (data.pedido) {
                const pedido = data.pedido;

                if (pedido.estado === "entregado" || pedido.estado === "anulado") {
                    pedidosHoy = pedidosHoy.filter(p => p.id !== pedido.id);
                    historialPedidos = [
                        pedido,
                        ...historialPedidos.filter(p => p.id !== pedido.id)
                    ];
                    mostrarPedidosHoy();
                    mostrarHistorialPedidos();
                    cargarEstadisticasComida();
                } else {
                    const indice = pedidosHoy.findIndex(p => p.id === pedido.id);
                    if (indice === -1) pedidosHoy.push(pedido);
                    else pedidosHoy[indice] = pedido;
                    mostrarPedidosHoy();
                }
            }
        } catch (error) {
            console.error("Error procesando actualización:", error);
        }
    };

    fuente.onerror = () => console.warn("Conexión de pedidos en tiempo real interrumpida.");
}

cargarPedidosHoy();
cargarHistorialPedidos();
cargarEstadisticasComida();
conectarPedidosHoyTiempoReal();

// =====================================================
// DEMORA DE EMPANADAS ANTES DE ENVIAR
// =====================================================

const CAPACIDAD_EMPANADAS = 156;
const TIEMPO_EMPANADAS = 20;


// Cantidad de empanadas de un pedido
function cantidadEmpanadasPedido(pedido) {

    if (!Array.isArray(pedido.productos)) return 0;

    return pedido.productos.reduce((total, producto) => {

        const nombre = String(producto.nombre || "").toLowerCase();
        const tipo = String(producto.tipo || "").toLowerCase();
        const cantidad = Number(producto.cantidad);

        if (
            tipo === "empanada" ||
            nombre.includes("empanada")
        ) {
            return total + (
                Number.isFinite(cantidad) && cantidad > 0
                    ? cantidad
                    : 0
            );
        }

        return total;

    }, 0);
}


// Cantidad de empanadas que estamos armando en el pedido actual
function cantidadEmpanadasActual() {

    return pedidoActual.reduce((total, producto) => {

        const nombre = String(producto.nombre || "").toLowerCase();
        const cantidad = Number(producto.cantidad);

        if (
            nombre.includes("empanada") &&
            Number.isFinite(cantidad) &&
            cantidad > 0
        ) {
            return total + cantidad;
        }

        return total;

    }, 0);
}


// Calcula la demora siguiendo exactamente la lógica del servidor
function calcularDemoraLocal(pedidos, cantidadNueva) {
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

    const esDomingo = diaArgentina === "Sun";
    const hornoBarroActivo =
        esDomingo &&
        horaArgentina >= 11 &&
        horaArgentina < 16;

    const capacidadPorTanda = hornoBarroActivo ? 156 : 108;

    const activos = pedidos.filter(pedido =>
        pedido.estado !== "entregado" &&
        pedido.estado !== "anulado" &&
        pedido.modoRetiro !== "programado"
    );

    const totalEmpanadas = activos.reduce(
        (total, pedido) => total + cantidadEmpanadasPedido(pedido),
        0
    ) + cantidadNueva;

    const lotes = Math.ceil(totalEmpanadas / capacidadPorTanda);

    return Math.max(
        TIEMPO_EMPANADAS,
        lotes * TIEMPO_EMPANADAS
    );
}

async function actualizarDemoraEmpanadas() {

    let indicador = document.getElementById(
        "demoraEmpanadasActual"
    );

    if (!indicador) {

        indicador = document.createElement("div");

        indicador.id = "demoraEmpanadasActual";

        indicador.style.cssText = `
            margin-top:12px;
            padding:12px;
            border-radius:10px;
            background:#fff7ed;
            border:1px solid #fed7aa;
            font-weight:800;
            text-align:center;
            font-size:16px;
        `;

        const lista = document.getElementById("listaPedido");

        if (lista) {
            lista.parentNode.insertBefore(
                indicador,
                lista.nextSibling
            );
        }
    }

    const cantidadNueva = cantidadEmpanadasActual();

    // Si el pedido actual no tiene empanadas,
    // no mostramos la demora.
    if (cantidadNueva <= 0) {
        indicador.style.display = "none";
        return;
    }

    indicador.style.display = "block";
    indicador.textContent = "🥟 Calculando demora...";

    try {

        const respuesta = await fetch("/api/pedidos");

        const datos = await respuesta.json();

        const pedidos = Array.isArray(datos)
            ? datos
            : (datos.pedidos || []);

        const demora = calcularDemoraLocal(
            pedidos,
            cantidadNueva
        );

        indicador.textContent =
            `🥟 DEMORA ESTIMADA: ${demora} MINUTOS`;

    } catch (error) {

        console.error(
            "Error calculando demora de empanadas:",
            error
        );

        indicador.textContent =
            "🥟 No se pudo calcular la demora.";
    }
}
