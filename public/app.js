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
        : producto.tipo === "empanada" ? 6 : 1;

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
        return;
    }

    pedidoActual.forEach((producto,index) => {
        const div = document.createElement("div");
        div.className = "item-pedido";

        let detalles = [];
        if (producto.preparacion) detalles.push(producto.preparacion);
        if (producto.guarnicion) detalles.push("Guarnición: " + producto.guarnicion);
        detalles.push(...(producto.modificaciones || []));
        detalles.push(...(producto.adicionales || []).map(a => "+ " + a));

        div.innerHTML = `
            <strong>${producto.cantidad} × ${escapeHtml(producto.nombre)}</strong>
            ${detalles.length ? `<div class="modificaciones">${detalles.map(escapeHtml).join("<br>")}</div>` : ""}
            <button class="editar" onclick="editarProducto(${index})">Editar</button>
            <button class="eliminar" onclick="eliminarProducto(${index})">Eliminar</button>
        `;

        lista.appendChild(div);
    });
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

        mensaje.textContent = `✅ Pedido #${resultado.pedido.numero} enviado a cocina.`;

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

document.querySelector('.categoria[data-categoria="empanadas"]').click();
mostrarPedido();
// ======================================================
// CERRAR SESIÓN
// ======================================================

const cerrarSesion = document.getElementById("cerrarSesion");

if (cerrarSesion) {
    cerrarSesion.addEventListener("click", async () => {
        try {
            await fetch("/api/logout", {
                method: "POST"
            });
        } finally {
            window.location.href = "/";
        }
    });
}