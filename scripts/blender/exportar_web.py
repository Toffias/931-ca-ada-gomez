"""
Exportar un edificio de Blender para la plantilla web (Next.js + Payload + React Three Fiber).

Uso: abrí el .blend, pestaña Scripting → abrir este archivo → Run Script (Alt+P).
Revisa las convenciones, muestra advertencias en la consola del sistema y exporta
la colección "WEB" como GLB comprimido con Draco.

Convenciones (ver docs/pipeline-blender.md):
  - Todo lo que va a la web vive en la colección WEB (subcolecciones libres).
  - Pisos:     objetos con propiedad personalizada  tipo="piso",  piso=<n>
  - Techo:     tipo="techo"
  - Unidades:  mallas (cajas) invisibles que envuelven cada depto:
               nombre Unidad_<codigo>, propiedades tipo="unidad", unidad="<codigo>", piso=<n>
  - Cámaras:   nombre Cam_<Vista>  (se ofrecen como vistas en la web)
  - Faroles:   objeto "Faroles" con propiedad luces=[x,y,z, x,y,z, ...] (opcional)
  - Materiales: nombres WEB_* simples (Principled BSDF sin nodos procedurales).
"""

import os
import bpy

# ---------------------------------------------------------------- configuración
COLECCION = "WEB"
SALIDA = "//web/edificio.glb"          # relativo al .blend
DRACO_NIVEL = 6


def ayuda_marcar_unidad(obj, codigo, piso):
    """Atajo para usar desde la consola de Python: marca un objeto como unidad."""
    obj.name = f"Unidad_{codigo}"
    obj["tipo"] = "unidad"
    obj["unidad"] = str(codigo)
    obj["piso"] = int(piso)


def ayuda_marcar_piso(obj, piso):
    obj["tipo"] = "piso"
    obj["piso"] = int(piso)


# ---------------------------------------------------------------- validación
def objetos_de(col):
    yield from col.objects
    for c in col.children:
        yield from objetos_de(c)


def validar(col):
    errores, avisos = [], []
    objs = list(objetos_de(col))
    unidades = [o for o in objs if o.get("tipo") == "unidad"]
    pisos = [o for o in objs if o.get("tipo") == "piso"]
    camaras = [o for o in objs if o.type == "CAMERA"]

    if not unidades:
        errores.append("No hay unidades (objetos con tipo='unidad').")
    codigos = {}
    for u in unidades:
        cod = u.get("unidad")
        if not cod:
            errores.append(f"{u.name}: falta la propiedad 'unidad' (código).")
            continue
        if cod in codigos:
            errores.append(f"Código repetido '{cod}': {u.name} y {codigos[cod]}")
        codigos[cod] = u.name
        if "piso" not in u:
            errores.append(f"{u.name}: falta la propiedad 'piso'.")
        if u.type != "MESH":
            errores.append(f"{u.name}: una unidad tiene que ser una malla (una caja alcanza).")
        if not u.name.startswith("Unidad_"):
            avisos.append(f"{u.name}: conviene llamarlo Unidad_{cod}.")
    if not pisos:
        avisos.append("No hay pisos marcados (tipo='piso'): no se podrán 'abrir' los pisos de arriba.")
    if not camaras:
        avisos.append("No hay cámaras en WEB: la web no tendrá vistas predefinidas.")
    for c in camaras:
        if not c.name.startswith("Cam_"):
            avisos.append(f"Cámara {c.name}: renombrala Cam_<Vista> para que aparezca como vista.")

    for o in objs:
        for slot in getattr(o, "material_slots", []):
            m = slot.material
            if not m or not m.use_nodes:
                continue
            tipos = {n.type for n in m.node_tree.nodes}
            procedurales = tipos & {"TEX_NOISE", "TEX_VORONOI", "TEX_WAVE", "TEX_MUSGRAVE", "TEX_BRICK", "VALTORGB", "ATTRIBUTE"}
            if procedurales:
                avisos.append(f"Material {m.name} ({o.name}) usa nodos procedurales {sorted(procedurales)}: no se exportan a glTF.")
    return errores, avisos, len(unidades), len(pisos), len(camaras)


def activar_coleccion(nombre):
    def buscar(lc):
        if lc.collection.name == nombre:
            return lc
        for c in lc.children:
            r = buscar(c)
            if r:
                return r
    lc = buscar(bpy.context.view_layer.layer_collection)
    if lc:
        lc.exclude = False
        bpy.context.view_layer.active_layer_collection = lc
    return lc


# ---------------------------------------------------------------- export
def main():
    col = bpy.data.collections.get(COLECCION)
    if not col:
        raise RuntimeError(f"No existe la colección '{COLECCION}'.")

    errores, avisos, nu, np_, nc = validar(col)
    print("\n=== Exportar para la web ===")
    print(f"Unidades: {nu} · Pisos: {np_} · Cámaras: {nc}")
    for a in avisos:
        print("  AVISO:", a)
    for e in errores:
        print("  ERROR:", e)
    if errores:
        raise RuntimeError(f"{len(errores)} error(es) de convenciones; revisá la consola.")

    activar_coleccion(COLECCION)
    ruta = bpy.path.abspath(SALIDA)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=ruta,
        export_format="GLB",
        use_active_collection=True,
        use_active_collection_with_nested=True,
        export_cameras=True,
        export_lights=False,
        export_extras=True,
        export_apply=True,
        export_yup=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=DRACO_NIVEL,
        export_image_format="AUTO",
    )
    mb = os.path.getsize(ruta) / 1e6
    print(f"Listo: {ruta} ({mb:.2f} MB)")
    print("Subilo en el admin → Edificios → Modelo 3D. Los códigos de unidad deben coincidir con los de Payload.\n")


if __name__ == "__main__":
    main()
