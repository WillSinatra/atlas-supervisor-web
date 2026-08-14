

<script>
(function () {
    "use strict";
// ═══════════════════════════════════════════════════════════════════
    //  AJUSTES DEL VEHÍCULO — cambialos a mano hasta que quede como querés
    // ═══════════════════════════════════════════════════════════════════

    // Emoji a usar. Probá cambiándolo por cualquiera de estos:
    //   🚚 camión   🚙 SUV   🚗 auto   🛻 pickup   🚐 combi
    //   📍 pin      🔧 llave  👷 técnico  🟢 punto
    const VEH_EMOJI = '🚙';

    // Tamaño del emoji en píxeles (era 34). Más chico = 20-24.
    const VEH_TAMANO = 22;

    // ¿Mostrar la placa/patente debajo? En pantalla chica conviene false.
    const VEH_MOSTRAR_PLACA = true;

    // Tamaño de la placa
    const VEH_PLACA_TAMANO = 9;
    // ═══════════════════════════════════════════════════════════════════
    // --- Configuración -----------------------------------------------------

    const CENTRO_INICIAL        = [-34.6083, -58.9544];
    const ZOOM_INICIAL          = 13;
    const REFRESCO_VEHICULOS_MS = 10000;   // 10 s
    const ENDPOINT_VEHICULOS    = 'vehiculos.php';

    // Encuadra el mapa sobre los vehículos solo la primera vez que llegan,
    // para no mover la vista mientras el operador la está mirando.
    let primerEncuadre = true;

    // --- Mapa --------------------------------------------------------------

    const map = L.map('mapa').setView(CENTRO_INICIAL, ZOOM_INICIAL);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const capaVehiculos = L.layerGroup().addTo(map);
    const marcadoresVeh = {};   // unit → L.marker

    // --- Utilidades --------------------------------------------------------

   function iconoVehiculo(estado, plate) {
        const escP = s => String(s ?? '').replace(/[&<>"']/g,
            c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

        // El wrap se dimensiona en función del tamaño elegido
        const w = VEH_TAMANO + 12;
        const h = VEH_TAMANO + 22;

        const placa = (VEH_MOSTRAR_PLACA && plate)
            ? '<div class="veh-plate">' + escP(plate) + '</div>'
            : '';

        return L.divIcon({
            className: '',
            html:
                '<div class="veh-wrap veh-' + estado + '"' +
                     ' style="width:' + w + 'px;height:' + h + 'px;' +
                     '--veh-size:' + VEH_TAMANO + 'px;' +
                     '--veh-plate-size:' + VEH_PLACA_TAMANO + 'px;">' +
                    '<div class="veh-emoji">' + VEH_EMOJI + '</div>' +
                    placa +
                '</div>',
            iconSize:    [w, h],
            iconAnchor:  [w / 2, VEH_TAMANO],   // apoya sobre el punto
            popupAnchor: [0, -VEH_TAMANO + 4]
        });
    }

    function estadoVehiculo(v) {
        if (!v.ignition) return 'off';    // apagado
        if (v.speed > 3) return 'mov';    // andando
        return 'idle';                     // encendido pero quieto (ralentí)
    }

    function popupVehiculo(v) {
        const escV = s => String(s ?? '').replace(/[&<>"']/g,
            c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

        return `
            <div class="popup-vehiculo">
                <b>${escV(v.plate || v.unit)}</b><br>
                ${escV(v.fecha)}<br>
                Velocidad: ${Math.round(v.speed)} km/h<br>
                <span class="estado ${v.ignition ? 'on' : 'offf'}">
                    ${v.ignition ? 'Encendido' : 'Apagado'}
                </span>
            </div>`;
    }

    // --- Refresco ----------------------------------------------------------

    function actualizarVehiculos() {
        fetch(ENDPOINT_VEHICULOS + '?v=' + Date.now(), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {

                if (data.status !== 200 || !Array.isArray(data.vehiculos)) {
                    console.warn('Vehículos: respuesta no válida', data.message || '');
                    return;
                }

                const vivas = new Set();
                const posiciones = [];

                data.vehiculos.forEach(v => {

                    const lat = parseFloat(v.lat);
                    const lon = parseFloat(v.lon);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

                    vivas.add(v.unit);
                    posiciones.push([lat, lon]);
                    const estado = estadoVehiculo(v);

                    if (!marcadoresVeh[v.unit]) {
                        marcadoresVeh[v.unit] = L.marker([lat, lon], {
                            icon: iconoVehiculo(estado, v.plate || v.unit),
                            zIndexOffset: 1000
                        })
                        .addTo(capaVehiculos)
                        .bindPopup(popupVehiculo(v));
                    } else {
                        const m = marcadoresVeh[v.unit];
                        m.setLatLng([lat, lon]);
                        m.setIcon(iconoVehiculo(estado, v.plate || v.unit));
                        m.setPopupContent(popupVehiculo(v));
                    }
                });

                // Unidades que dejaron de reportar → las saco
                for (const unit in marcadoresVeh) {
                    if (!vivas.has(unit)) {
                        capaVehiculos.removeLayer(marcadoresVeh[unit]);
                        delete marcadoresVeh[unit];
                    }
                }

                // Primer encuadre sobre los vehículos que llegaron
                if (primerEncuadre && posiciones.length > 0) {
                    map.fitBounds(posiciones, { padding: [50, 50], maxZoom: 15 });
                    primerEncuadre = false;
                }
            })
            .catch(e => console.warn('Vehículos:', e.message));
    }

    actualizarVehiculos();
    setInterval(actualizarVehiculos, REFRESCO_VEHICULOS_MS);
})();
</script>

</body>
</html>