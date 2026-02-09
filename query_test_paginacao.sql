-- Query para testar se há problema com paginação
-- Esta query simula o que a API faz com .range()

-- Primeiros 10.000 registros (página 1)
SELECT 
  COUNT(*) as total_registros_pagina_1,
  COUNT(DISTINCT sale_uuid) as vendas_distintas_pagina_1,
  SUM(total_value) as valor_total_pagina_1
FROM (
  SELECT sale_uuid, total_value
  FROM external_sales
  WHERE 
    company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
    AND external_employee_id = '147-01'
    AND sale_date >= '2026-01-01'
    AND sale_date <= '2026-01-31'
    AND sale_uuid IS NOT NULL
  ORDER BY sale_date, sale_uuid
  LIMIT 10000
) as primeira_pagina;

-- Todos os registros (para comparar)
SELECT 
  COUNT(*) as total_registros_todos,
  COUNT(DISTINCT sale_uuid) as vendas_distintas_todos,
  SUM(total_value) as valor_total_todos
FROM external_sales
WHERE 
  company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
  AND external_employee_id = '147-01'
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-01-31'
  AND sale_uuid IS NOT NULL;
