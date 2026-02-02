-- Função RPC para agregar histórico de fluxo de caixa por dia
-- Evita o limite de 1000 registros do Supabase agregando diretamente no SQL
-- Retorna o dia da semana junto com os dados para facilitar o processamento

CREATE OR REPLACE FUNCTION get_historical_daily_totals(
  p_company_group_id UUID,
  p_external_company_ids TEXT[],
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  transaction_date DATE,
  day_of_week INTEGER,
  total NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    transaction_date::DATE as transaction_date,
    EXTRACT(DOW FROM transaction_date)::INTEGER as day_of_week,
    SUM(amount)::NUMERIC as total
  FROM external_cash_flow
  WHERE 
    company_group_id = p_company_group_id
    AND external_company_id = ANY(p_external_company_ids)
    AND transaction_date >= p_start_date
    AND transaction_date < p_end_date
  GROUP BY transaction_date::DATE, EXTRACT(DOW FROM transaction_date)
  ORDER BY transaction_date;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION get_historical_daily_totals IS 'Agrega histórico de fluxo de caixa por dia com dia da semana para cálculo de médias por tipo de dia';
