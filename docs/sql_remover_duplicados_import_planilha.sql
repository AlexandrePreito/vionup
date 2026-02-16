-- ============================================================
-- REMOVER APENAS LINHAS DUPLICADAS
-- ============================================================
-- Duplicata = mesma venda (company_group_id + venda_id/sale_uuid) já existe de outra origem
-- Remove só as linhas de import (sales_imp_) que duplicam Power BI

-- 1. PREVIEW: Import que duplica Power BI (mesmo grupo + mesmo venda_id ou sale_uuid)
SELECT COUNT(*) as linhas_duplicadas_a_remover
FROM external_sales a
WHERE a.external_id LIKE 'sales_imp_%'
  AND EXISTS (
    SELECT 1 FROM external_sales b
    WHERE b.company_group_id = a.company_group_id
      AND b.external_id NOT LIKE 'sales_imp_%'
      AND (
        (a.venda_id IS NOT NULL AND a.venda_id != '' AND b.venda_id = a.venda_id)
        OR (a.sale_uuid IS NOT NULL AND a.sale_uuid != '' AND b.sale_uuid = a.sale_uuid)
      )
      AND a.sale_date = b.sale_date
  );

-- 2. EXECUTAR: Remover só as duplicatas (import que já existe no Power BI)
DELETE FROM external_sales
WHERE id IN (
  SELECT a.id
  FROM external_sales a
  WHERE a.external_id LIKE 'sales_imp_%'
    AND EXISTS (
      SELECT 1 FROM external_sales b
      WHERE b.company_group_id = a.company_group_id
        AND b.external_id NOT LIKE 'sales_imp_%'
        AND b.id != a.id
        AND (
          (a.venda_id IS NOT NULL AND a.venda_id != '' AND b.venda_id = a.venda_id)
          OR (a.sale_uuid IS NOT NULL AND a.sale_uuid != '' AND b.sale_uuid = a.sale_uuid)
        )
        AND a.sale_date = b.sale_date
    )
);

-- 3. Evitar duplicatas futuras: no import de planilha, verificar se a venda já existe
-- (company_group_id + venda_id/sale_uuid) antes de inserir.
