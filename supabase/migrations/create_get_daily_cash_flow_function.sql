-- Função RPC para agregar fluxo de caixa por dia
-- Evita o limite de 1000 registros do Supabase agregando diretamente no SQL

CREATE OR REPLACE FUNCTION get_daily_cash_flow(
  p_company_group_id UUID,
  p_external_company_ids TEXT[],
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  day INTEGER,
  total NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(DAY FROM transaction_date)::INTEGER as day,
    SUM(amount)::NUMERIC as total
  FROM external_cash_flow
  WHERE 
    company_group_id = p_company_group_id
    AND external_company_id = ANY(p_external_company_ids)
    AND transaction_date >= p_start_date
    AND transaction_date < p_end_date
  GROUP BY EXTRACT(DAY FROM transaction_date)
  ORDER BY day;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION get_daily_cash_flow IS 'Agrega fluxo de caixa por dia do mês para um grupo de empresas e códigos externos específicos';
