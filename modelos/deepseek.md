<div align="center">

<img src="https://cdn.deepseek.com/chat/icon.png" width="64" />

# DeepSeek

### Guia de interceptação e injeção de prompt

</div>

---

## 🧪 Como funciona?

Quando você envia uma mensagem no DeepSeek, o frontend constrói um objeto JSON e o envia via **`XMLHttpRequest`** (XHR) para a API `/api/v0/chat/completion`. O payload se parece com isso aqui:

```json
{
  "chat_session_id": "id da conversa",
  "prompt": "oi",
  "model_type": "default",
  "thinking_enabled": false,
  "search_enabled": false
}
```
*Lembrando que os valores podem variar, mas o foco aqui é o `prompt`*

O método consiste em **interceptar o método `send()` do `XMLHttpRequest`** antes que a requisição saia do navegador, modificar o campo `prompt` injetando uma instrução personalizada, e deixar a requisição seguir normalmente com todos os headers já calculados pela página original.

---

## 💻 Como é o código?

Abaixo está o coração do método, explicado direitinho etapa:

```javascript
// Primeiro, definimos a instrução que queremos injetar
const INSTRUCTION = '[INSTRUÇÃO AQUI]\n';


// Vamos salvar a referência original do método 'open' e 'send'
// do XMLHttpRequest, pois precisamos disso para não quebrar nada
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

// Aqui ele vai sobescrever o 'open' para capturar a URL
// e o método (GET/POST) de cada requisição
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    // Aqui guarda as infos na própria instância da requisição
    this._targetUrl = url;
    this._targetMethod = method;
    // Então chamamos o método original sem modificações
    return originalXHROpen.apply(this, [method, url, ...rest]);
};

// Agora sobrescrevemos o 'send', é aqui que o corpo
// (body) da requisição é enviado, esse é o ponto crítico
XMLHttpRequest.prototype.send = function(body) {
    
    // Simples checkagem pra garantir que
    // a URL é da API do DeepSeek
    if (this._targetUrl?.includes('/api/v0/chat/completion') 
        && this._targetMethod === 'POST') {
        
        try {
            // Parseamos o body como JSON
            const data = JSON.parse(body);
            
            // Se tiver o campo 'prompt', vamos manipular
            if (data && typeof data.prompt === 'string') {
                // Injetamos a instrução ANTES da mensagem do usuário
                data.prompt = INSTRUCTION + data.prompt;
                
                // Serializamos de volta para string
                body = JSON.stringify(data);
            }
        } catch (e) {
            // Se der erro, seguimos com o body original
            // (para não quebrar a navegação)
        }
    }
    
    // Enviamos a requisição (com ou sem modificação)
    return originalXHRSend.apply(this, [body]);
};
```

### 🧠 Pontos importantes

- **Os headers criptográficos não precisam ser recalculados** — porque o DeepSeek calcula o `x-ds-pow-response` baseado no payload **no momento em que `send()` é chamado**, e nós modificamos o body **antes** desse cálculo final
- **A modificação é síncrona** — não há assincronia envolvida, então a request não é quebrada
- **Não mexemos em `fetch`** porque o DeepSeek usa XHR nativamente

---

### Quer testar por conta própria? Instala o userscript e coloque seu próprio prompt!

<div align="center">

[![Install Userscript](https://img.shields.io/badge/Instalar%20Userscript-555555?style=for-the-badge&logo=tampermonkey&logoColor=white)](/userscripts/deepseek-injector.user.js)

</div>

> 💡 **Não sabe como instalar userscripts?** Temos um [guia completo para PC e Mobile aqui](tutorial.md).
