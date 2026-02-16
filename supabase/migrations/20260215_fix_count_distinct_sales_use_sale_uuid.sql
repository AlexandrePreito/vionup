-- ============================================================
-- Corrigir count_distinct_sales: usar sale_uuid como ID da venda
-- ============================================================
-- Problema: venda_id pode ser id do ITEM (único por linha);
-- sale_uuid é o ID da VENDA (compartilhado entre itens).
-- 66693 distinct venda_id vs 2691 distinct sale_uuid = contagem errada.
-- ============================================================

CREATE OR REPLACE FUNCTION count_distinct_sales(
  p_company_group_id UUID,
  p_external_company_ids TEXT[],
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  distinct_count INTEGER;
BEGIN
  -- Usar sale_uuid quando preenchido (ID da venda); senão venda_id
  -- Evita contar itens como vendas quando venda_id = id do item
  SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(sale_uuid), ''), venda_id))::INTEGER
  INTO distinct_count
  FROM external_sales
  WHERE 
    company_group_id = p_company_group_id
    AND external_company_id = ANY(p_external_company_ids)
    AND sale_date >= p_start_date
    AND sale_date <= p_end_date
    AND (
      (sale_uuid IS NOT NULL AND TRIM(sale_uuid) != '')
      OR (venda_id IS NOT NULL AND venda_id != '')
    );
  
  RETURN COALESCE(distinct_count, 0);
END;
$$;

COMMENT ON FUNCTION count_distinct_sales(UUID, TEXT[], DATE, DATE) IS 'Conta vendas distintas usando sale_uuid (ou venda_id se sale_uuid vazio). Sale_uuid = ID da venda; venda_id pode ser ID do item.';
