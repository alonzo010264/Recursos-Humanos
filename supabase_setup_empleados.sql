-- SQL Script para crear la tabla de Empleados en Supabase
-- Ejecuta este script directamente en el editor SQL (SQL Editor) de tu consola de Supabase.

-- 1. Crear la tabla de empleados
CREATE TABLE IF NOT EXISTS public.empleados (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre text UNIQUE NOT NULL,
    puesto text NOT NULL,
    telefono text,
    vacaciones_totales numeric DEFAULT 14 NOT NULL,
    vacaciones_disponibles numeric DEFAULT 14 NOT NULL,
    en_vacaciones boolean DEFAULT false NOT NULL,
    fecha_inicio_vacaciones date,
    fecha_fin_vacaciones date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Habilitar la seguridad a nivel de filas (RLS)
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas para acceso público total (lectura y escritura)
CREATE POLICY "Permitir lectura de empleados" ON public.empleados
    FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de empleados" ON public.empleados
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir modificacion de empleados" ON public.empleados
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de empleados" ON public.empleados
    FOR DELETE USING (true);
