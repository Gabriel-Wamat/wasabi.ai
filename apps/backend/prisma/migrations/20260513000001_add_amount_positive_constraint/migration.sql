-- Garante que o valor de transações seja sempre positivo (em centavos)
-- amount = 0 não faz sentido de negócio; negativo iria corromper cálculos
ALTER TABLE "Transaction" ADD CONSTRAINT "transaction_amount_positive" CHECK (amount > 0);

-- Mesmo constraint para metas financeiras
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "goal_target_amount_positive" CHECK ("targetAmount" > 0);
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "goal_current_amount_non_negative" CHECK ("currentAmount" >= 0);
