-- Função RPC para contar vendas distintas de um funcionário (COUNT DISTINCT de venda_id)
-- Evita o limite de registros do Supabase fazendo o COUNT diretamente no SQL

CREATE OR REPLACE FUNCTION count_distinct_employee_sales(
  p_company_group_id UUID,
  p_external_employee_ids TEXT[],
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
  SELECT COUNT(DISTINCT venda_id)::INTEGER
  INTO distinct_count
  FROM external_sales
  WHERE 
    company_group_id = p_company_group_id
    AND external_employee_id = ANY(p_external_employee_ids)
    AND sale_date >= p_start_date
    AND sale_date <= p_end_date
    AND venda_id IS NOT NULL
    AND venda_id != '';
  
  RETURN COALESCE(distinct_count, 0);
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION count_distinct_employee_sales IS 'Conta o número de venda_ids distintos na tabela external_sales para um funcionário específico e período';
