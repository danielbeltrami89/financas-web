import {money,localDate,summarize} from './finance.js';
import {BACKEND_URL} from './config.js';
import {downloadWorkbook} from './excel.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const validMonth=value=>/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value||'');
const selected=new URLSearchParams(location.search).get('month');
let month=validMonth(selected)?selected:localDate().slice(0,7),records=[],loaded=false,exporting=false;

function editorURL(entryId){
  const back=new URL('./',import.meta.url);back.searchParams.set('month',month);
  const editor=new URL('/',BACKEND_URL);
  editor.searchParams.set('return_to',back.href);
  editor.searchParams.set('month',month);
  editor.searchParams.set(entryId?'edit':'new',entryId||'1');
  return editor.href;
}

function render(){
  $('#export-excel').disabled=!loaded||exporting;
  $('#period').value=month;
  const label=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(`${month}-15T12:00:00`)).replace(' de ',' ');
  $('#month-label').textContent=label.charAt(0).toUpperCase()+label.slice(1);
  $('#new-entry').href=editorURL();
  const rows=records.filter(row=>row.month===month).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(a.sourceOrder??999)-(b.sourceOrder??999)||a.id.localeCompare(b.id));
  const totals=summarize(rows);
  for(const key of ['income','expense','balance'])$('#'+key).textContent=loaded?money(totals[key]):'—';
  $('#count').textContent=loaded?`${rows.length} ${rows.length===1?'lançamento':'lançamentos'}`:'Carregando…';
  $('#entries').innerHTML=rows.length?rows.map(row=>`<a class="entry" href="${esc(editorURL(row.id))}" aria-label="Editar ${esc(row.description)}, ${esc(money(row.amount))}"><span class="entry-icon ${row.type}" aria-hidden="true">${row.type==='income'?'+':'−'}</span><span class="entry-body"><strong>${esc(row.description)}</strong><small>${row.date?esc(row.date.split('-').reverse().join('/')):'Sem data'}</small>${row.note?`<small class="entry-note">${esc(row.note)}</small>`:''}</span><span class="entry-amount ${row.type}">${row.type==='income'?'+':'−'} ${esc(money(row.amount))}</span></a>`).join(''):`<div class="empty">${loaded?'<strong>Nenhum lançamento neste mês.</strong>Use “Novo lançamento” para começar.':'Carregando seus lançamentos…'}</div>`;
}

async function load(){
  try{
    const response=await fetch(new URL('/api/entries',BACKEND_URL),{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw new Error('Não foi possível carregar os lançamentos. Tente novamente.');
    const data=await response.json();
    if(!Array.isArray(data.entries))throw new Error('A resposta do serviço não pôde ser lida. Tente novamente.');
    records=data.entries;loaded=true;$('#error').hidden=true;render();
  }catch(error){$('#error p').textContent=error.message;$('#error').hidden=false;$('#count').textContent=loaded?'Dados anteriores':'Não foi possível carregar';}
}

function selectMonth(value){
  if(!validMonth(value))return;
  month=value;
  const address=new URL(location.href);address.searchParams.set('month',month);history.replaceState(null,'',address);
  render();
}
function changeMonth(offset){const date=new Date(month+'-15T12:00:00');date.setMonth(date.getMonth()+offset);selectMonth(localDate(date).slice(0,7));}
$('#export-excel').addEventListener('click',async()=>{if(exporting)return;exporting=true;const button=$('#export-excel');button.disabled=true;button.textContent='Gerando…';try{const response=await fetch(new URL('/api/entries',BACKEND_URL),{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('Não foi possível consultar os lançamentos.');const data=await response.json();if(!Array.isArray(data.entries))throw Error('Dados indisponíveis.');records=data.entries;loaded=true;render();downloadWorkbook(records);}catch(error){$('#error p').textContent='Não foi possível baixar o Excel. '+error.message;$('#error').hidden=false;}finally{exporting=false;button.textContent='Baixar Excel';button.disabled=!loaded;}});
$('#prev-month').addEventListener('click',()=>changeMonth(-1));
$('#next-month').addEventListener('click',()=>changeMonth(1));
$('#period').addEventListener('change',event=>selectMonth(event.target.value));
$('#retry').addEventListener('click',load);
window.addEventListener('focus',load);
render();load();
