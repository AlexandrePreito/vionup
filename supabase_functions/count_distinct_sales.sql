-- Função RPC para contar vendas distintas (COUNT DISTINCT sale_uuid) por empresa
-- Execute este script no Supabase SQL Editor
CREATE OR REPLACE FUNCTION count_distinct_sales(
  p_group_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_external_ids TEXT[]
)
RETURNS TABLE(external_company_id TEXT, sale_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.external_company_id::TEXT,
    COUNT(DISTINCT es.sale_uuid) as sale_count
  FROM external_sales es
  WHERE es.company_group_id = p_group_id
    AND es.sale_date >= p_start_date
    AND es.sale_date <= p_end_date
    AND es.external_company_id = ANY(p_external_ids)
    AND es.sale_uuid IS NOT NULL
  GROUP BY es.external_company_id;
END;
$$ LANGUAGE plpgsql;
