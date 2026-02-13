# Base de Datos SQLite - LAIDA

## Descripción

Este directorio contiene la configuración y utilidades de SQLite para LAIDA. Los datos de las marcas registradas se almacenan en `laida.db`.

## Estructura

### Tabla: `marcas`

Almacena la información de las empresas registradas.

**Columnas:**
- `id` (INTEGER): Identificador único (autoincremental)
- `nombre_marca` (TEXT): Nombre de la marca/empresa
- `correo_empresa` (TEXT): Correo de la empresa (único)
- `nombre_representante` (TEXT): Nombre del representante
- `numero` (TEXT): Número de teléfono
- `correo_personal` (TEXT): Correo personal del representante
- `fecha_registro` (DATETIME): Fecha de registro (automática)
- `actualizado_en` (DATETIME): Fecha de última actualización (automática)

## Archivos

### `init.ts`
Configura la conexión a la base de datos y crea las tablas necesarias.

### `utils.ts`
Exporta funciones útiles para CRUD operations:
- `getAllMarcas()`: Obtener todas las marcas
- `getMarcaById(id)`: Obtener marca por ID
- `getMarcaByCorreoEmpresa(email)`: Obtener marca por correo
- `createMarca(data)`: Crear nueva marca
- `updateMarca(id, data)`: Actualizar marca
- `deleteMarca(id)`: Eliminar marca
- `countMarcas()`: Contar total de marcas

## Uso

```typescript
import { getAllMarcas, createMarca } from "@/db/utils"

// Obtener todas las marcas
const marcas = getAllMarcas()

// Crear una nueva marca
const nuevaMarca = createMarca({
  nombre_marca: "Mi Empresa",
  correo_empresa: "empresa@example.com",
  nombre_representante: "Juan Pérez",
  numero: "+54 1234567890",
  correo_personal: "juan@example.com"
})
```

## API Routes

### POST `/api/registro`
Crea un nuevo registro de marca.

**Request:**
```json
{
  "nombreMarca": "Mi Empresa",
  "correoEmpresa": "empresa@example.com",
  "nombreRepresentante": "Juan Pérez",
  "numero": "+54 1234567890",
  "correoPersonal": "juan@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registro completado exitosamente",
  "id": 1
}
```

## Notas

- Los datos se almacenan en el archivo `laida.db` en la raíz del proyecto
- El archivo `.gitignore` está configurado para ignorar archivos `.db`
- La base de datos se inicializa automáticamente cuando se requiere `db/init.ts`
