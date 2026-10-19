export const money = cents => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(cents/100);
export function parseAmount(value) {
  const input=String(value).trim().replace(/^R\$\s*/, '');
  let normalized;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(input)) normalized=input.replaceAll('.','').replace(',','.');
  else if (/^\d+(?:[,.]\d{1,2})?$/.test(input)) normalized=input.replace(',','.');
  else throw new Error('Informe um valor válido, como 150,00.');
  const [whole,decimal='']=normalized.split('.');
  const cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));
  if (!Number.isSafeInteger(cents)||cents<=0||cents>99999999999) throw new Error('O valor deve estar entre R$ 0,01 e R$ 999.999.999,99.');
  return cents;
}
export function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function summarize(rows){const totals={income:0,expense:0,balance:0};for(const row of rows) totals[row.type]+=row.amount;totals.balance=totals.income-totals.expense;return totals;}
