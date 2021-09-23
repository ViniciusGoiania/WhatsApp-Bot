# Setup

`npm install`
- para instalar todas dependencias necessárias no sistema

## Star server

`node index.js`

## Starta uma nova sessão do whatsapp

`http://localhost:3001/start?sessionName=session1`

- caso queira mudar a sessão basta alterar o nome dela por exemplo: sessionName = sessãoBanana

## Get QRCode (quickly!!)

`http://localhost:3001/qrcode?sessionName=session1&image=true`

- png
- Pode ter a leitura do QRCode de forma mais precisa em algum terminal.
- Observação: precisa ser aberto no browser de fundo branco para não comer as bordas do QRCode
O QRCode está setado para dar refresh a cada 15 segundos, caso não consiga logar tente dar F5 na página não esquecer de colocar o nome da sessão que esta logando

## Mandar mensagem (metodo POST)

`http://localhost:3001/sendText`

- corpo do JSON:

{
    sessionName: "session1", <-(nome da sessão) 
    number: "5562",  <-(número que deseja enviar, precisa-se preencher com o DDI e DDD) 
    text:"mensagem que quiser"  <-(mensagem que deseja enviar) 
}

## Mandar arquivo (metodo POST)

`http://localhost:3001/sendFile`

- corpo do JSON:

{
    sessionName: "session1", <-(nome da sessão) 
    number: "5562",  <-(número que deseja enviar, precisa-se preencher com o DDI e DDD) 
    base64Data: "456122d89",  <-(o arquivo que deseja enviar deve ser enviado em base64) 
    fileName:"testando.txt"  <-(o nome que sera dado ao arquivo enviado (mantenha a extenção igual do arquivo original)) 
}

## Fechar sessão do whatsapp

`http://localhost:3001/close?sessionName=session1`

- pode ser fechada também direta no celular (mais prático)

## Observações Geral

- Deve-se iniciar a sessão e depois logar nela com o leitor de QRCode do WhatsApp
- O QRCode tem refresh a cada 15 segundos
- Também é possível ler o QRCode pelo log
- Caso de erro apos iniciar a sessão verificar no log se há uma versão mais nova do venom, pois sempre que o webwhatsapp tiver uma atualização
eles irão atualizar a biblioteca do venom para poder continuar acessando normalmente, quando assim ira aparecer no log que há uma versão mais nova
e mostrara a versão que você está utilizando
- Comando para atualização do venom:
`npm update venom-bot`
- Estarei atualizando e testando novas funcionalidades com o decorrer do tempo ou necessidade
