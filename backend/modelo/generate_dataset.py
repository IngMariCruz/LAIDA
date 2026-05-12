from __future__ import annotations

import csv
import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

OUT_PATH = Path(__file__).with_name("dataset.csv")

INTENCIONES = [
    "hacer pedido",
    "comparación",
    "compra",
    "consulta_precio",
    "consulta_producto",
    "despedida",
    "objeción",
    "saludo",
    "seguimiento",
    "soporte",
]

LEAD_CLASES = ["frio", "tibio", "caliente"]

PRICE_KEYWORDS_RE = re.compile(
    r"\b(precio|costo|cuesta|valor|tarifa|cotizaci(?:o|ó)n|presupuesto)\b",
    re.IGNORECASE,
)


def _hash_int(text: str) -> int:
    return int(hashlib.md5(text.encode("utf-8")).hexdigest()[:8], 16)


def _pick(lead_id: str, key: str, options: list[str]) -> str:
    if not options:
        raise ValueError(f"No options provided for key={key}")
    idx = _hash_int(f"{lead_id}|{key}") % len(options)
    return options[idx]


def _num(lead_id: str, key: str, low: int, high: int) -> int:
    if low > high:
        raise ValueError("low must be <= high")
    span = high - low + 1
    return low + (_hash_int(f"{lead_id}|{key}") % span)


@dataclass(frozen=True)
class Context:
    producto: str
    canal: str
    industria: str
    ciudad: str
    volumen: int
    horizonte: str
    nombre: str
    presupuesto: int


def _context(lead_id: str) -> Context:
    productos = [
        "un bot para WhatsApp",
        "un asistente con IA",
        "un sistema para gestionar leads",
        "una automatización de atención",
        "un chatbot para ventas",
        "un bot multicanal",
    ]
    canales = ["WhatsApp", "Instagram", "web", "Facebook", "email", "Telegram"]
    industrias = [
        "inmobiliaria",
        "clínica",
        "e-commerce",
        "agencia",
        "restaurante",
        "gimnasio",
        "academia",
        "concesionaria",
        "estudio jurídico",
        "turismo",
    ]
    ciudades = [
        "CDMX",
        "Bogotá",
        "Lima",
        "Santiago",
        "Buenos Aires",
        "Monterrey",
        "Quito",
        "Medellín",
        "Guadalajara",
        "Córdoba",
    ]
    horizontes = [
        "esta semana",
        "hoy",
        "antes del viernes",
        "este mes",
        "lo antes posible",
        "para la próxima semana",
    ]

    nombres = [
        "Ana",
        "Luis",
        "María",
        "Carlos",
        "Sofía",
        "Javier",
        "Valentina",
        "Diego",
        "Camila",
        "Andrés",
        "Paula",
        "Mateo",
        "Lucía",
        "Fernando",
        "Daniela",
        "Sergio",
        "Andrea",
        "Ricardo",
        "Natalia",
        "Hugo",
        "Brenda",
        "Gabriel",
        "Carolina",
        "Martín",
        "Julia",
        "Tomás",
        "Renata",
        "Pablo",
        "Mónica",
        "Iván",
        "Florencia",
        "Alejandro",
        "Claudia",
        "Emilio",
        "Patricia",
        "Raúl",
        "Verónica",
        "Sebastián",
        "Laura",
        "Nicolás",
    ]

    return Context(
        producto=_pick(lead_id, "producto", productos),
        canal=_pick(lead_id, "canal", canales),
        industria=_pick(lead_id, "industria", industrias),
        ciudad=_pick(lead_id, "ciudad", ciudades),
        volumen=_num(lead_id, "volumen", 20, 500),
        horizonte=_pick(lead_id, "horizonte", horizontes),
        nombre=_pick(lead_id, "nombre", nombres),
        presupuesto=_num(lead_id, "presupuesto", 50, 1500),
    )


def _ensure_unique(message: str, lead_id: str, ctx: Context, seen: set[str]) -> str:
    if message not in seen:
        return message

    # Append a natural extra sentence with context until unique.
    addons = [
        "Soy {nombre} de {ciudad}.",
        "Es para una {industria} y tenemos aprox {volumen} leads al mes.",
        "Lo quiero para {canal} y mi rubro es {industria}.",
        "Idealmente me gustaria tenerlo listo {horizonte}.",
        "Estoy en {ciudad} y lo necesito para {canal}.",
        "Manejo un presupuesto de {presupuesto} al mes aprox.",
    ]

    base = message.rstrip()
    base = base[:-1] if base.endswith(".") else base

    for attempt in range(12):
        addon = _pick(lead_id, f"addon|{attempt}", addons).format(**ctx.__dict__)
        candidate = f"{base}. {addon}"
        if candidate not in seen:
            return candidate

    # Extremely unlikely, but keep it readable.
    candidate = f"{base}. Soy {ctx.nombre} de {ctx.ciudad} y es para {ctx.industria}."
    if candidate not in seen:
        return candidate
    return f"{candidate} Necesito implementarlo {ctx.horizonte}."


def _build_message(lead_id: str, intencion: str, lead_clase: str) -> str:
    ctx = _context(lead_id)

    def pick(key: str, options: list[str]) -> str:
        return _pick(lead_id, key, options)

    base = {
        "firma": pick(
            "firma",
            [
                "",
                " Gracias.",
                " Gracias!",
                " Quedo atento.",
                " Saludos.",
            ],
        ),
        "signature": pick(
            "signature",
            [
                "",
                " Soy {nombre}.",
                " Soy {nombre} de {ciudad}.",
            ],
        ).format(**ctx.__dict__),
    }

    # Messages WITHOUT price questions
    if intencion == "saludo":
        opts = {
            "frio": [
                "Hola, vi que ofrecen {producto}. Me contas cómo funciona?",
                "Buenas, me interesa {producto}. Me das más info?",
                "Hola, estoy averiguando. Me podés contar qué hacen?",
            ],
            "tibio": [
                "Hola, estoy interesado en {producto} para {canal}. Qué incluye?",
                "Buenas, necesito algo para {industria}. Me contás qué opción recomiendan?",
                "Hola, quiero entender si sirve para {industria}. Qué funcionalidades tiene?",
            ],
            "caliente": [
                "Hola, quiero implementar {producto} en {canal} {horizonte}. Cómo seguimos?",
                "Buenas, necesito {producto} para {industria} en {ciudad}. Qué pasos siguen?",
                "Hola, quiero avanzar rápido. Me guían con los próximos pasos?",
            ],
        }
        msg = pick(f"saludo|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    if intencion == "consulta_producto":
        opts = {
            "frio": [
                "Qué incluye {producto} y qué puede hacer en {canal}?",
                "Funciona para {industria} o es más general?",
                "Se puede integrar con mi web y {canal}?",
            ],
            "tibio": [
                "Me interesa {producto} para {industria}. Qué incluye y cómo se configura?",
                "Qué tan personalizable es para {canal} y para mi rubro ({industria})?",
                "Necesito que atienda consultas y capture datos. Lo hace?",
            ],
            "caliente": [
                "Necesito {producto} listo {horizonte}. Qué información necesitan de mi lado?",
                "Quiero que empiece a captar leads en {canal} {horizonte}. Qué incluye la implementación?",
                "Lo necesito para {volumen} leads/mes aprox. Aguanta ese volumen?",
            ],
        }
        msg = pick(f"consulta_producto|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    if intencion == "comparación":
        opts = {
            "frio": [
                "Cuál es la diferencia entre sus opciones?",
                "Tienen distintos planes o versiones? En qué se diferencian?",
                "Qué cambia entre una implementación simple y una más completa?",
            ],
            "tibio": [
                "Estoy comparando soluciones para {industria}. Qué ventajas tiene lo suyo?",
                "Entre {canal} y web, cuál conviene para empezar?",
                "Qué diferencias hay entre bot básico vs. avanzado para {canal}?",
            ],
            "caliente": [
                "Necesito decidir hoy: cuál opción recomiendan para {volumen} leads/mes?",
                "Estoy entre dos alternativas. Qué me conviene para {industria} en {ciudad}?",
                "Quiero elegir ya. Qué opción rinde mejor para captar leads en {canal}?",
            ],
        }
        msg = pick(f"comparación|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    if intencion == "objeción":
        opts = {
            "frio": [
                "Me interesa, pero no estoy seguro si es lo que necesito. Me orientan?",
                "Tengo dudas sobre si se adapta a mi caso. Se puede probar?",
                "No quiero algo complicado. Es fácil de usar?",
            ],
            "tibio": [
                "Me preocupa el tiempo de implementación. En general cuánto tarda?",
                "Tengo dudas con la integración a mis sistemas. Qué tan difícil es?",
                "Y el soporte: si tengo un problema, responden rápido?",
            ],
            "caliente": [
                "Estoy para avanzar, pero necesito confirmar tiempos y que quede andando {horizonte}.",
                "Quiero cerrarlo ya, pero antes necesito validar compatibilidad con {canal}.",
                "Antes de arrancar, necesito confirmar que cumple con mi proceso de {industria}.",
            ],
        }
        msg = pick(f"objeción|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    if intencion == "seguimiento":
        opts = {
            "frio": [
                "Hola, retomo mi consulta. Me pueden orientar?",
                "Buenas, quedé con una duda. Me ayudan?",
                "Hola, sigo interesado. Tienen un resumen de cómo funciona?",
            ],
            "tibio": [
                "Hola, retomo. Pudieron revisar mi caso de {industria}?",
                "Buenas, sigo interesado en {producto} para {canal}. Cómo avanzamos?",
                "Hola, quedó pendiente la info. Me la pueden enviar?",
            ],
            "caliente": [
                "Hola, retomo para avanzar hoy. Qué falta para arrancar?",
                "Buenas, necesito cerrar {horizonte}. Me dicen próximos pasos?",
                "Hola, sigo listo para implementar en {canal}. Coordinamos?",
            ],
        }
        msg = pick(f"seguimiento|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    if intencion == "soporte":
        opts = {
            "frio": [
                "Hola, tengo un problema y no sé cómo resolverlo.",
                "Buenas, me está fallando algo. Me ayudan?",
                "Hola, no me funciona como esperaba. Me pueden guiar?",
            ],
            "tibio": [
                "Hola, estoy con un error en {canal}. Me dan una mano?",
                "Buenas, se trabó un paso de configuración. Me ayudan?",
                "Hola, necesito soporte para resolver un problema técnico.",
            ],
            "caliente": [
                "Urgente: necesito ayuda hoy, se cayó la atención en {canal}.",
                "Necesito soporte ya, estoy perdiendo leads en {canal}.",
                "Estoy con un error crítico. Me ayudan ahora?",
            ],
        }
        msg = pick(f"soporte|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    if intencion == "despedida":
        opts = {
            "frio": [
                "Gracias, lo reviso y cualquier cosa vuelvo.",
                "Ok, gracias por la info.",
                "Dale, gracias. Lo miro y les escribo.",
            ],
            "tibio": [
                "Perfecto, gracias. Quedo atento.",
                "Genial, gracias. Lo reviso y seguimos.",
                "Gracias! En cuanto lo vea, les confirmo.",
            ],
            "caliente": [
                "Gracias. Si está todo ok, avanzamos hoy.",
                "Listo, gracias. Quedo atento para cerrar.",
                "Gracias, quedo listo para avanzar cuando me confirmen.",
            ],
        }
        msg = pick(f"despedida|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg

    # Messages WITH price questions (must include price keyword)
    if intencion == "consulta_precio":
        opts = {
            "frio": [
                "Cuál es el precio?",
                "Cuánto cuesta {producto}?",
                "Me pasás el costo aproximado?",
            ],
            "tibio": [
                "Me pasás el precio y qué incluye cada plan?",
                "Estoy comparando: cuál es el costo mensual y anual?",
                "Qué precio tiene para {volumen} leads/mes aprox?",
            ],
            "caliente": [
                "Quiero avanzar hoy: cuál es el precio final y cómo lo contratamos?",
                "Listo para cerrar: confirmame el costo total, por favor.",
                "Necesito el precio final hoy para decidir.",
            ],
        }
        msg = pick(f"consulta_precio|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    if intencion == "compra":
        # compra puede o no preguntar precio; acá incluimos contexto variable, pero sin keywords de precio.
        opts = {
            "frio": [
                "Creo que quiero comprar. Cómo sería el proceso?",
                "Me interesa contratar. Qué necesito para empezar?",
                "Quiero avanzar con la compra. Cómo seguimos?",
            ],
            "tibio": [
                "Dale, quiero contratar {producto} para {canal}. Cuáles son los pasos?",
                "Estoy listo para avanzar. Me indican el proceso de alta?",
                "Ok, quiero contratar. Coordinamos la puesta en marcha?",
            ],
            "caliente": [
                "Listo, quiero contratar {horizonte}. Qué falta para cerrarlo?",
                "Quiero cerrar hoy. Me confirman los pasos finales?",
                "Estoy listo para implementar en {canal} ya. Arrancamos?",
            ],
        }
        msg = pick(f"compra|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    if intencion == "hacer pedido":
        # similar a un "pedido" explícito (no necesariamente precio)
        opts = {
            "frio": [
                "Quiero hacer un pedido de información sobre {producto}.",
                "Puedo hacer un pedido para que me contacten?",
                "Quisiera hacer un pedido: que me llamen para explicarme.",
            ],
            "tibio": [
                "Quiero hacer un pedido para {industria}: que el bot capture nombre, teléfono y motivo.",
                "Hago un pedido: necesito que atienda en {canal} y derive a un asesor.",
                "Quiero hacer un pedido para mi negocio en {ciudad}: atención y captación de leads.",
            ],
            "caliente": [
                "Hago un pedido para arrancar {horizonte}: necesito automatizar {canal} ya.",
                "Quiero hacer un pedido urgente: implementación en {canal} para {industria}.",
                "Hago el pedido hoy: necesito dejar esto funcionando {horizonte}.",
            ],
        }
        msg = pick(f"hacer pedido|{lead_clase}", opts[lead_clase]).format(**ctx.__dict__)
        return msg + base["signature"] + base["firma"]

    raise ValueError(f"Intención desconocida: {intencion}")


def _pre_precio_from_message(message: str) -> int:
    return 1 if PRICE_KEYWORDS_RE.search(message) else 0


def _chuck_id(lead_id: str, intencion: str, lead_clase: str) -> str:
    n = 1 + (_hash_int(f"{lead_id}|{intencion}|{lead_clase}") % 10)
    return f"CHUCK_{n:02d}"


def main() -> None:
    rows: list[dict[str, object]] = []
    seen: set[str] = set()

    # 10 intenciones * 300 = 3000
    per_intent = 300

    lead_num = 1
    for intencion in INTENCIONES:
        for i in range(per_intent):
            lead_id = f"L{lead_num:05d}"
            lead_num += 1

            lead_clase = LEAD_CLASES[(i + _hash_int(lead_id)) % len(LEAD_CLASES)]

            ctx = _context(lead_id)
            message = _build_message(lead_id, intencion, lead_clase)
            message = _ensure_unique(message, lead_id, ctx, seen)
            seen.add(message)
            pre_precio = _pre_precio_from_message(message)

            rows.append(
                {
                    "lead_id": lead_id,
                    "chuck_id": _chuck_id(lead_id, intencion, lead_clase),
                    "mensaje_chuck": message,
                    "intencion": intencion,
                    "pre_precio": pre_precio,
                    "lead_clase": lead_clase,
                }
            )

    df = pd.DataFrame(rows, columns=["lead_id", "chuck_id", "mensaje_chuck", "intencion", "pre_precio", "lead_clase"])

    # Guardar con comillas en todo, para consistencia
    # Use UTF-8 with BOM so Excel on Windows reads accents correctly.
    with OUT_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        df.to_csv(f, index=False, quoting=csv.QUOTE_ALL)


if __name__ == "__main__":
    main()
