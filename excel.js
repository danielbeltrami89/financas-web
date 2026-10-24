const encoder=new TextEncoder();
const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const textCell=(ref,value,style=0)=>`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
const numberCell=(ref,value,style=3)=>`<c r="${ref}" s="${style}"><v>${value}</v></c>`;
const row=(index,cells)=>`<row r="${index}">${cells.join('')}</row>`;
const monthLabel=value=>value.slice(5)+'/'+value.slice(0,4);
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const byte of bytes)n=crcTable[(n^byte)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
function join(parts){const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;}
function zip(files){
  const local=[],central=[];let offset=0;
  for(const [path,content]of Object.entries(files)){
    const name=encoder.encode(path),data=encoder.encode(content),crc=crc32(data);
    const head=new Uint8Array(30),h=new DataView(head.buffer);
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);
    const entry=new Uint8Array(46),c=new DataView(entry.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
    local.push(head,name,data);central.push(entry,name);offset+=head.length+name.length+data.length;
  }
  const directory=join(central),end=new Uint8Array(22),e=new DataView(end.buffer),count=Object.keys(files).length;
  e.setUint32(0,0x06054b50,true);e.setUint16(8,count,true);e.setUint16(10,count,true);e.setUint32(12,directory.length,true);e.setUint32(16,offset,true);
  return join([...local,directory,end]);
}
const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function worksheet(rows,widths,lastColumn,lastRow){return declaration+`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A1:${lastColumn}${Math.max(lastRow,1)}"/></worksheet>`;}
export function createWorkbook(records){
  const entries=[...records].sort((a,b)=>a.month.localeCompare(b.month)||(a.date||'9999').localeCompare(b.date||'9999')||(a.sourceOrder??999)-(b.sourceOrder??999)||a.id.localeCompare(b.id));
  const labels=['Mês','Data','Tipo','Descrição','Entrada (R$)','Saída (R$)','Observação'];
  const ledger=[row(1,labels.map((label,i)=>textCell(String.fromCharCode(65+i)+'1',label,1)))],months=new Map();
  for(const [i,entry]of entries.entries()){
    const r=i+2,amount=(entry.amount/100).toFixed(2);
    ledger.push(row(r,[textCell('A'+r,monthLabel(entry.month)),entry.date?numberCell('B'+r,Math.round((Date.parse(entry.date+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000),2):textCell('B'+r,''),textCell('C'+r,entry.type==='income'?'Entrada':'Saída'),textCell('D'+r,entry.description),entry.type==='income'?numberCell('E'+r,amount):textCell('E'+r,''),entry.type==='expense'?numberCell('F'+r,amount):textCell('F'+r,''),textCell('G'+r,entry.note)]));
    const total=months.get(entry.month)||{income:0,expense:0};total[entry.type]+=entry.amount;months.set(entry.month,total);
  }
  const summary=[row(1,['Mês','Entradas (R$)','Saídas (R$)','Resultado (R$)'].map((label,i)=>textCell(String.fromCharCode(65+i)+'1',label,1)))];
  let income=0,expense=0;
  for(const [month,total]of months){const r=summary.length+1;income+=total.income;expense+=total.expense;summary.push(row(r,[textCell('A'+r,monthLabel(month)),numberCell('B'+r,(total.income/100).toFixed(2)),numberCell('C'+r,(total.expense/100).toFixed(2)),numberCell('D'+r,((total.income-total.expense)/100).toFixed(2))]));}
  const r=summary.length+1;summary.push(row(r,[textCell('A'+r,'Total',4),numberCell('B'+r,(income/100).toFixed(2),5),numberCell('C'+r,(expense/100).toFixed(2),5),numberCell('D'+r,((income-expense)/100).toFixed(2),5)]));
  return zip({
    '[Content_Types].xml':declaration+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':declaration+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Lançamentos" sheetId="1" r:id="rId1"/><sheet name="Resumo" sheetId="2" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml':declaration+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00;[Red]-&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF174B3C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml':worksheet(ledger,[13,14,12,42,18,18,45],'G',ledger.length),
    'xl/worksheets/sheet2.xml':worksheet(summary,[16,20,20,22],'D',summary.length-1)
  });
}
export function downloadWorkbook(records){
  const blob=new Blob([createWorkbook(records)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='3d-financas.xlsx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
