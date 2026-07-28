import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedNumber, Donut, Sparkline } from '@/components/native-charts';
import {
  ChoiceChips,
  EmptyState,
  ErrorState,
  Metric,
  NativeButton,
  NativeField,
  NativeModal,
  NativeScreen,
  PageHeader,
  Row,
  Section,
  SegmentedTabs,
} from '@/components/native-ui';
import { levelTheme } from '@/constants/level-theme';
import { useDashboard } from '@/hooks/use-native-data';
import {
  saveDataKey,
  saveFinanceSet,
  uploadOfx,
  type FinanceAccountFull,
  type FinanceExpenseFull,
  type FinanceIncome,
  type Transfer,
} from '@/lib/api';
import { money, shortDate } from '@/lib/format';

type Tab = 'dashboard' | 'accounts' | 'statement' | 'installments' | 'tax';
type Action = 'expense' | 'income' | 'account' | 'transfer' | 'ofx';

const categories = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Outros'];
const accountTypes = [
  { value: 'conta', label: 'Conta corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'pagamento', label: 'Pagamento' },
  { value: 'cartao', label: 'Cartão' },
] as const;

const numberValue = (value: string) =>
  Number(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function FinanceScreen() {
  const params = useLocalSearchParams<{ action?: string; nonce?: string }>();
  const state = useDashboard();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [action, setAction] = useState<Action | null>(null);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState('Outros');
  const [accountId, setAccountId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [bank, setBank] = useState('');
  const [accountType, setAccountType] = useState<string>('conta');
  const [installments, setInstallments] = useState('1');
  const handledAction = useRef('');

  const accounts = useMemo(
    () => (state.data?.accounts_v2 ?? []) as FinanceAccountFull[],
    [state.data?.accounts_v2],
  );
  const expenses = useMemo(
    () => (state.data?.expense_lines_v4 ?? []) as FinanceExpenseFull[],
    [state.data?.expense_lines_v4],
  );
  const income = useMemo(
    () => (state.data?.income_lines ?? []) as FinanceIncome[],
    [state.data?.income_lines],
  );
  const transfers = useMemo(
    () => (state.data?.transfers ?? []) as Transfer[],
    [state.data?.transfers],
  );
  const totalBalance = accounts.reduce((sum, item) => sum + (Number(item.saldo) || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const totalIncome = income.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const expenseByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    expenses.forEach((item) => {
      const key = item.categoria || 'Outros';
      totals.set(key, (totals.get(key) ?? 0) + Number(item.value || 0));
    });
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        label: `${name} · ${money(value)}`,
        value,
        color: [levelTheme.colors.primary, '#6EA8FE', '#F7B267', '#E76F51', '#8E7DBE', '#72B01D'][index],
      }));
  }, [expenses]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, offset) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
      return income
        .filter((item) => {
          const d = new Date(item.date || `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`);
          return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
        })
        .reduce((sum, item) => sum + Number(item.value || 0), 0)
        - expenses
          .filter((item) => {
            const d = new Date(item.date || '');
            return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
          })
          .reduce((sum, item) => sum + Number(item.value || 0), 0);
    });
  }, [expenses, income]);

  const installmentRows = expenses.filter((item) => Number(item.parcelas || 1) > 1);
  const deductible = expenses.filter((item) =>
    ['Saúde', 'Educação'].includes(item.categoria || ''));
  const deductibleTotal = deductible.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const resetForm = () => {
    setLabel('');
    setAmount('');
    setDate(today());
    setCategory('Outros');
    setAccountId(accounts.find((item) => item.principal)?.id ?? accounts[0]?.id ?? '');
    setTargetId('');
    setBank('');
    setAccountType('conta');
    setInstallments('1');
  };

  const openAction = (next: Action) => {
    resetForm();
    setAction(next);
  };

  useEffect(() => {
    const requested = params.action;
    const requestKey = `${requested || ''}:${params.nonce || ''}`;
    if (
      !['expense', 'income', 'account', 'transfer', 'ofx'].includes(requested || '')
      || handledAction.current === requestKey
    ) return;
    handledAction.current = requestKey;
    setLabel('');
    setAmount('');
    setDate(today());
    setCategory('Outros');
    setTargetId('');
    setBank('');
    setAccountType('conta');
    setInstallments('1');
    setTab(['expense', 'income', 'ofx'].includes(requested!) ? 'statement' : 'accounts');
    setAction(requested as Action);
  }, [params.action, params.nonce]);

  useEffect(() => {
    if (!action || accountId || !accounts.length) return;
    setAccountId(accounts.find((item) => item.principal)?.id ?? accounts[0].id);
  }, [accountId, accounts, action]);

  const run = async (operation: () => Promise<void>, success: string) => {
    setSaving(true);
    try {
      await operation();
      setAction(null);
      await state.refresh();
      Alert.alert('Tudo certo', success);
    } catch (reason) {
      const message = reason instanceof Error && reason.message === 'plan_required'
        ? 'Este recurso faz parte do plano Individual.'
        : 'Confira os dados e tente novamente.';
      Alert.alert('Não foi possível salvar', message);
    } finally {
      setSaving(false);
    }
  };

  const submit = () => {
    const value = numberValue(amount);
    if (action !== 'account' && action !== 'ofx' && value <= 0) {
      Alert.alert('Informe um valor válido.');
      return;
    }
    if (action === 'expense') {
      if (!label.trim() || !accountId) return Alert.alert('Informe descrição e conta.');
      const next: FinanceExpenseFull[] = [{
        id: uid('expense'),
        label: label.trim(),
        value,
        date,
        time: null,
        recorrencia: 'none',
        categoria: category,
        method: 'debito',
        bank: accounts.find((item) => item.id === accountId)?.bank ?? null,
        accountId,
        parcelas: Math.max(1, Math.round(numberValue(installments))),
        createdAt: Date.now(),
      }, ...expenses];
      void run(() => saveFinanceSet('expense_lines_v4', next), 'Despesa registrada.');
    } else if (action === 'income') {
      if (!label.trim() || !accountId) return Alert.alert('Informe descrição e conta.');
      const next: FinanceIncome[] = [{
        id: uid('income'),
        label: label.trim(),
        value,
        date,
        endDate: null,
        payday: new Date(`${date}T12:00:00`).getDate(),
        accountId,
        type: 'variavel',
        createdAt: Date.now(),
      }, ...income];
      void run(() => saveFinanceSet('income_lines', next), 'Renda registrada.');
    } else if (action === 'account') {
      if (!bank.trim()) return Alert.alert('Informe a instituição.');
      const typeLabel = accountTypes.find((item) => item.value === accountType)?.label ?? 'Conta';
      const suffix = accountType === 'conta' ? 'CC' : accountType === 'poupanca' ? 'Poupança' : typeLabel;
      const next: FinanceAccountFull[] = [...accounts, {
        id: uid('account'),
        label: label.trim() || `${bank.trim()} - ${suffix}`,
        tipo: accountType,
        saldo: numberValue(amount),
        chequeEspecial: 0,
        limite: 0,
        fatura: 0,
        fechamento: null,
        vencimento: null,
        bank: bank.trim(),
        principal: accounts.length === 0,
        createdAt: Date.now(),
      }];
      void run(() => saveFinanceSet('accounts_v2', next), 'Conta adicionada.');
    } else if (action === 'transfer') {
      if (!accountId || !targetId || accountId === targetId) {
        return Alert.alert('Escolha duas contas diferentes.');
      }
      const next: Transfer[] = [{
        id: uid('transfer'),
        value,
        date,
        from: accountId,
        to: targetId,
      }, ...transfers];
      void run(() => saveDataKey('transfers', next), 'Transferência registrada.');
    }
  };

  const pickOfx = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/x-ofx', 'application/octet-stream', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    setSaving(true);
    try {
      const rows = await uploadOfx(result.assets[0]);
      setAction(null);
      await state.refresh();
      Alert.alert('OFX processado', `${rows.length} lançamentos foram identificados.`);
    } catch {
      Alert.alert('Não foi possível importar', 'Use um arquivo OFX válido e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <NativeScreen onRefresh={state.refresh} refreshing={state.loading}>
      <PageHeader
        action={<ActionButton onPress={() => openAction('expense')} />}
        description="Contas, lançamentos, projeções e imposto de renda."
        eyebrow="FINANÇAS"
        title="Seu dinheiro"
      />
      <SegmentedTabs
        items={[
          { id: 'dashboard', label: 'Dashboard', icon: 'analytics-outline' },
          { id: 'accounts', label: 'Contas', icon: 'wallet-outline' },
          { id: 'statement', label: 'Extrato', icon: 'receipt-outline' },
          { id: 'installments', label: 'Parcelas', icon: 'calendar-outline' },
          { id: 'tax', label: 'IR', icon: 'document-text-outline' },
        ]}
        onChange={setTab}
        value={tab}
      />

      {state.error ? <ErrorState retry={() => void state.refresh()} /> : (
        <>
          {tab === 'dashboard' ? (
            <>
              <View style={styles.hero}>
                <Text style={styles.heroLabel}>Patrimônio disponível</Text>
                <AnimatedNumber format={money} value={totalBalance} />
                <Sparkline values={monthlyTrend} />
              </View>
              <View style={styles.metrics}>
                <Metric label="Rendas" tone="positive" value={money(totalIncome)} />
                <Metric label="Despesas" tone="negative" value={money(totalExpenses)} />
              </View>
              <Section title="Composição dos gastos" caption="Participação por categoria">
                {expenseByCategory.length ? <Donut segments={expenseByCategory} /> : (
                  <EmptyState description="Registre despesas para ver a composição." icon="pie-chart-outline" title="Sem dados" />
                )}
              </Section>
            </>
          ) : null}

          {tab === 'accounts' ? (
            <>
              <View style={styles.actions}>
                <NativeButton icon="add" label="Nova conta" onPress={() => openAction('account')} />
                <NativeButton icon="swap-horizontal" label="Transferir" onPress={() => openAction('transfer')} variant="secondary" />
              </View>
              <Section title="Contas e cartões" caption={`${accounts.length} cadastrados`}>
                {accounts.length ? accounts.map((account) => (
                  <Row
                    icon={account.tipo === 'cartao' ? 'card-outline' : 'business-outline'}
                    key={account.id}
                    subtitle={`${account.bank || 'Instituição'} · ${account.tipo || 'Conta'}`}
                    title={account.label}
                    value={money(account.saldo)}
                  />
                )) : <EmptyState description="Adicione sua primeira conta." icon="wallet-outline" title="Nenhuma conta" />}
              </Section>
            </>
          ) : null}

          {tab === 'statement' ? (
            <>
              <View style={styles.actions}>
                <NativeButton icon="remove" label="Despesa" onPress={() => openAction('expense')} />
                <NativeButton icon="add" label="Renda" onPress={() => openAction('income')} variant="secondary" />
                <NativeButton icon="cloud-upload-outline" label="OFX" onPress={() => openAction('ofx')} variant="secondary" />
              </View>
              <Section title="Extrato" caption={`${expenses.length + income.length} movimentações`}>
                {[...expenses.map((item) => ({ ...item, kind: 'expense' as const })),
                  ...income.map((item) => ({ ...item, kind: 'income' as const }))]
                  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                  .slice(0, 40)
                  .map((item) => (
                    <Row
                      icon={item.kind === 'income' ? 'arrow-up-outline' : 'arrow-down-outline'}
                      key={`${item.kind}-${item.id}`}
                      subtitle={`${item.kind === 'income' ? 'Renda' : item.categoria || 'Outros'} · ${shortDate(item.date)}`}
                      title={item.label}
                      value={`${item.kind === 'income' ? '+' : '-'} ${money(item.value)}`}
                    />
                  ))}
              </Section>
            </>
          ) : null}

          {tab === 'installments' ? (
            <Section title="Compras parceladas" caption={`${installmentRows.length} ativas`}>
              {installmentRows.length ? installmentRows.map((item) => {
                const count = Number(item.parcelas || 1);
                return (
                  <Row
                    icon="calendar-number-outline"
                    key={item.id}
                    subtitle={`${count}× de ${money(Number(item.value) / count)} · ${shortDate(item.date)}`}
                    title={item.label}
                    value={money(item.value)}
                  />
                );
              }) : <EmptyState description="Compras parceladas aparecerão aqui." icon="calendar-clear-outline" title="Sem parcelamentos" />}
            </Section>
          ) : null}

          {tab === 'tax' ? (
            <>
              <View style={styles.metrics}>
                <Metric label="Despesas dedutíveis" value={money(deductibleTotal)} />
                <Metric label="Lançamentos" value={String(deductible.length)} />
              </View>
              <Section title="Base para declaração" caption="Saúde e educação identificadas">
                {deductible.length ? deductible.map((item) => (
                  <Row
                    icon="document-attach-outline"
                    key={item.id}
                    subtitle={`${item.categoria} · ${shortDate(item.date)}`}
                    title={item.label}
                    value={money(item.value)}
                  />
                )) : <EmptyState description="Categorize gastos de saúde e educação para acompanhar aqui." icon="document-text-outline" title="Nenhum item dedutível" />}
              </Section>
            </>
          ) : null}
        </>
      )}

      <NativeModal
        description="A mesma operação da plataforma, otimizada para o celular."
        onClose={() => setAction(null)}
        title={action ? {
          expense: 'Lançar despesa',
          income: 'Registrar renda',
          account: 'Nova conta',
          transfer: 'Transferir',
          ofx: 'Importar OFX',
        }[action] : ''}
        visible={action !== null}>
        {action === 'ofx' ? (
          <>
            <Text style={styles.help}>Selecione o arquivo exportado pelo banco. O servidor valida e evita duplicidades antes de importar.</Text>
            <NativeButton disabled={saving} icon="document-attach-outline" label="Selecionar arquivo OFX" onPress={() => void pickOfx()} />
          </>
        ) : null}
        {action === 'account' ? (
          <>
            <NativeField label="Instituição" onChangeText={setBank} placeholder="Ex.: Caixa, Nubank, Next" value={bank} />
            <ChoiceChips items={[...accountTypes]} onChange={setAccountType} value={accountType} />
            <NativeField hint="Se ficar vazio, será preenchido como Banco - tipo." label="Nome da conta" onChangeText={setLabel} placeholder="Automático" value={label} />
            <NativeField keyboardType="decimal-pad" label="Saldo inicial" onChangeText={setAmount} placeholder="0,00" value={amount} />
            <NativeButton disabled={saving} icon="checkmark" label="Salvar conta" onPress={submit} />
          </>
        ) : null}
        {action === 'expense' || action === 'income' ? (
          <>
            <NativeField label="Descrição" onChangeText={setLabel} placeholder={action === 'expense' ? 'Ex.: Supermercado' : 'Ex.: Salário'} value={label} />
            <NativeField keyboardType="decimal-pad" label="Valor" onChangeText={setAmount} placeholder="0,00" value={amount} />
            <NativeField label="Data" onChangeText={setDate} placeholder="AAAA-MM-DD" value={date} />
            {action === 'expense' ? (
              <>
                <ChoiceChips items={categories.map((item) => ({ value: item, label: item }))} onChange={setCategory} value={category} />
                <NativeField keyboardType="number-pad" label="Parcelas" onChangeText={setInstallments} value={installments} />
              </>
            ) : null}
            <Text style={styles.fieldTitle}>Conta</Text>
            <ChoiceChips items={accounts.map((item) => ({ value: item.id, label: item.label }))} onChange={setAccountId} value={accountId} />
            <NativeButton disabled={saving || !accounts.length} icon="checkmark" label="Confirmar" onPress={submit} />
          </>
        ) : null}
        {action === 'transfer' ? (
          <>
            <NativeField keyboardType="decimal-pad" label="Valor" onChangeText={setAmount} placeholder="0,00" value={amount} />
            <NativeField label="Data" onChangeText={setDate} value={date} />
            <Text style={styles.fieldTitle}>Conta de origem</Text>
            <ChoiceChips items={accounts.map((item) => ({ value: item.id, label: item.label }))} onChange={setAccountId} value={accountId} />
            <Text style={styles.fieldTitle}>Conta de destino</Text>
            <ChoiceChips items={accounts.map((item) => ({ value: item.id, label: item.label }))} onChange={setTargetId} value={targetId} />
            <NativeButton disabled={saving || accounts.length < 2} icon="swap-horizontal" label="Transferir" onPress={submit} />
          </>
        ) : null}
      </NativeModal>
    </NativeScreen>
  );
}

function ActionButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Novo lançamento" accessibilityRole="button" onPress={onPress} style={styles.fab}>
      <Ionicons color={levelTheme.colors.background} name="add" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fab: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.primary,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  fieldTitle: { color: levelTheme.colors.text, fontSize: 13, fontWeight: '600' },
  help: { color: levelTheme.colors.muted, fontSize: 14, lineHeight: 21 },
  hero: {
    backgroundColor: 'rgba(7, 19, 16, 0.64)',
    borderColor: levelTheme.colors.border,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    overflow: 'hidden',
    padding: 20,
  },
  heroLabel: { color: levelTheme.colors.muted, fontSize: 13 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 },
});
