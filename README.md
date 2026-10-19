# 3D Finanças

Interface simples para entradas, saídas e resultado mensal, adaptada para celular. Publicação estática no GitHub Pages, sem dados financeiros ou credenciais neste repositório.

## Dados e edição

A interface consulta a API existente em https://caixa-simples-empresa.wiryflea6.chatgpt.site. Os lançamentos continuam no banco já utilizado pelo aplicativo. Não remova essa hospedagem antes de migrar os dados e a API.

Adicionar e editar abre a área autenticada do serviço. Após salvar ou excluir, o navegador retorna ao GitHub Pages. A verificação da conta responsável é feita no servidor, e os visitantes podem consultar os dados públicos. Não há chaves, senhas ou tokens no navegador ou neste repositório.

A sincronização com Google Sheets permanece pendente da publicação do Apps Script. Publicar no Pages não ativa essa sincronização automaticamente.

## Publicação

1. Extraia o pacote e envie os arquivos para a raiz de https://github.com/danielbeltrami89/financas-web, usando Upload files. Envie o conteúdo extraído; o GitHub não extrai o ZIP.
2. Confirme o envio em Commit changes na branch main.
3. Em Settings > Pages, selecione Deploy from a branch, branch main, pasta /(root), e Save.

O arquivo .nojekyll mantém os arquivos estáticos. O endereço esperado é https://danielbeltrami89.github.io/financas-web/; ele só passa a funcionar depois de o GitHub concluir a publicação.

O endereço final do Pages deve ser registrado na variável PAGES_URL do serviço para permitir a leitura pelo navegador e o retorno seguro após editar. config.js contém apenas o endereço público da API.

Os caminhos dos assets são relativos e funcionam na raiz ou em um projeto do Pages. O parâmetro month=AAAA-MM seleciona o período e é preservado no retorno após salvar.

## Indexação

index.html e 404.html incluem robots noindex, nofollow, noarchive. O GitHub Pages não permite configurar cabeçalhos HTTP personalizados; a diretiva HTML é utilizada nessa hospedagem. A desindexação depende do comportamento dos buscadores e não restringe o acesso de visitantes com o link.
